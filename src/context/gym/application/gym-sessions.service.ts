import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GymSessionsUseCase } from '../domain/ports/in/gym-sessions.usecase';
import {
  CreateSessionDto,
  SessionExerciseDto,
} from './dtos/create-session.dto';
import { UpdateSessionDto } from './dtos/update-session.dto';
import {
  SessionExerciseInput,
  WorkoutSession,
} from '../domain/entities/workout-session.entity';
import { RoutineDay } from '../domain/entities/routine-day.entity';
import { GymSessionFilters } from '../domain/types';
import { GymSessionStatus } from '../domain/constants';
import { parseWorkoutDate, resolveWorkoutRange } from '../domain/workout-date';
import {
  SESSION_REPOSITORY_PORT,
  SessionRepository,
} from '../domain/ports/out/session.repository';
import {
  ROUTINE_REPOSITORY_PORT,
  RoutineRepository,
} from '../domain/ports/out/routine.repository';
import {
  EXERCISE_REPOSITORY_PORT,
  ExerciseRepository,
} from '../domain/ports/out/exercise.repository';
import { Exercise } from '../domain/entities/exercise.entity';

const todayUtc = (): Date => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

@Injectable()
export class GymSessionsService implements GymSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: SessionRepository,
    @Inject(ROUTINE_REPOSITORY_PORT)
    private readonly routineRepository: RoutineRepository,
    @Inject(EXERCISE_REPOSITORY_PORT)
    private readonly exerciseRepository: ExerciseRepository,
  ) {}

  async create(
    user_id: string,
    dto: CreateSessionDto,
  ): Promise<WorkoutSession> {
    const routine_day = await this.getRoutineDay(user_id, dto.routine_day_id);
    const routine_id = dto.routine_id ?? routine_day?.getRoutineId() ?? null;

    if (routine_id) {
      await this.getRoutine(user_id, routine_id);
    }

    const prefilled = dto.exercises === undefined && routine_day != null;
    const exercises =
      dto.exercises !== undefined
        ? await this.buildExercises(user_id, dto.exercises)
        : await this.buildFromRoutineDay(user_id, routine_day);

    const status: GymSessionStatus =
      dto.status ?? (prefilled ? 'in_progress' : 'completed');

    const session = WorkoutSession.create({
      user_id,
      routine_id,
      routine_day_id: routine_day?.getId() ?? null,
      date: dto.date ? parseWorkoutDate(dto.date) : todayUtc(),
      status,
      started_at: dto.started_at ? new Date(dto.started_at) : null,
      finished_at: dto.finished_at ? new Date(dto.finished_at) : null,
      duration_minutes: dto.duration_minutes ?? null,
      rpe: dto.rpe ?? null,
      notes: dto.notes ?? null,
      exercises,
    });

    return this.sessionRepository.save(session);
  }

  async list(options: GymSessionFilters): Promise<WorkoutSession[]> {
    const range = resolveWorkoutRange(options) ?? undefined;

    return this.sessionRepository.findMany({
      user_id: options.user_id,
      take: options.take,
      cursor: options.cursor,
      routine_id: options.routine_id,
      routine_day_id: options.routine_day_id,
      status: options.status,
      range,
    });
  }

  async getById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<WorkoutSession> {
    const session = await this.sessionRepository.findById(
      user_id,
      id,
      include_deleted,
    );
    if (!session) {
      throw new NotFoundException('Workout session not found');
    }
    return session;
  }

  async update(
    user_id: string,
    id: string,
    dto: UpdateSessionDto,
  ): Promise<WorkoutSession> {
    const session = await this.getById(user_id, id);

    const patch: Parameters<WorkoutSession['update']>[0] = {};

    if (dto.routine_id !== undefined) {
      if (dto.routine_id === null) {
        patch.routine_id = null;
      } else {
        await this.getRoutine(user_id, dto.routine_id);
        patch.routine_id = dto.routine_id;
      }
    }

    if (dto.routine_day_id !== undefined) {
      if (dto.routine_day_id === null) {
        patch.routine_day_id = null;
      } else {
        const day = await this.getRoutineDayOrFail(user_id, dto.routine_day_id);
        patch.routine_day_id = day.getId();
        if (dto.routine_id === undefined) {
          patch.routine_id = day.getRoutineId();
        }
      }
    }

    if (dto.date !== undefined) patch.date = parseWorkoutDate(dto.date);
    if (dto.status !== undefined && dto.status !== null) {
      patch.status = dto.status;
    }
    if (dto.started_at !== undefined) {
      patch.started_at = dto.started_at ? new Date(dto.started_at) : null;
    }
    if (dto.finished_at !== undefined) {
      patch.finished_at = dto.finished_at ? new Date(dto.finished_at) : null;
    }
    if (dto.duration_minutes !== undefined) {
      patch.duration_minutes = dto.duration_minutes;
    }
    if (dto.rpe !== undefined) patch.rpe = dto.rpe;
    if (dto.notes !== undefined) patch.notes = dto.notes;

    const target =
      dto.exercises !== undefined
        ? session.replaceExercises(
            await this.buildExercises(user_id, dto.exercises),
          )
        : session;

    return this.sessionRepository.update(target.update(patch));
  }

  async softDelete(user_id: string, id: string): Promise<WorkoutSession> {
    const session = await this.getById(user_id, id);
    return this.sessionRepository.delete(session.getId());
  }

  async restore(user_id: string, id: string): Promise<WorkoutSession> {
    const session = await this.getById(user_id, id, true);
    return this.sessionRepository.restore(session.getId());
  }

  async hardDelete(user_id: string, id: string): Promise<void> {
    const session = await this.getById(user_id, id, true);
    return this.sessionRepository.hardDelete(session.getId());
  }

  /** Resolves the exercise snapshots (catalog id or free-text name). */
  private async buildExercises(
    user_id: string,
    exercises: SessionExerciseDto[],
  ): Promise<SessionExerciseInput[]> {
    if (exercises.length === 0) {
      return [];
    }

    const catalog = await this.resolveCatalog(user_id, exercises);

    return exercises.map((exercise, index) => {
      const sets = (exercise.sets ?? []).map((set, setIndex) => ({
        ...set,
        set_number: set.set_number ?? setIndex + 1,
      }));

      for (const set of sets) {
        if (set.reps == null && set.duration_seconds == null) {
          throw new BadRequestException(
            'Each set requires reps (strength) or duration_seconds (cardio)',
          );
        }
      }

      if (exercise.exercise_id) {
        const found = catalog.get(exercise.exercise_id);
        if (!found) {
          throw new NotFoundException('Exercise not found in the catalog');
        }

        return {
          exercise_id: found.getId(),
          exercise_name: found.getName(),
          muscle_group: found.getMuscleGroup(),
          position: index + 1,
          notes: exercise.notes ?? null,
          sets,
        };
      }

      if (!exercise.exercise_name) {
        throw new BadRequestException(
          'Each exercise requires either exercise_id or exercise_name',
        );
      }

      return {
        exercise_id: null,
        exercise_name: exercise.exercise_name,
        muscle_group: exercise.muscle_group ?? null,
        position: index + 1,
        notes: exercise.notes ?? null,
        sets,
      };
    });
  }

  /** Prefills a session from a routine day (targets as uncompleted sets). */
  private async buildFromRoutineDay(
    user_id: string,
    routine_day: RoutineDay | null,
  ): Promise<SessionExerciseInput[]> {
    if (!routine_day || routine_day.isRest()) {
      return [];
    }

    const routineExercises = routine_day.getExercises();
    if (routineExercises.length === 0) {
      return [];
    }

    const catalog = await this.resolveCatalogByIds(
      user_id,
      routineExercises.map((exercise) => exercise.getExerciseId()),
    );

    return routineExercises.map((exercise, index) => {
      const found = catalog.get(exercise.getExerciseId());
      const reps = exercise.getRepsMax() ?? exercise.getRepsMin() ?? null;

      return {
        exercise_id: exercise.getExerciseId(),
        exercise_name: found?.getName() ?? 'Ejercicio',
        muscle_group: found?.getMuscleGroup() ?? null,
        position: index + 1,
        notes: exercise.getNotes(),
        sets: Array.from({ length: exercise.getSets() }, (_, setIndex) => ({
          set_number: setIndex + 1,
          reps,
          weight: exercise.getTargetWeight(),
          completed: false,
        })),
      };
    });
  }

  private async resolveCatalog(
    user_id: string,
    exercises: SessionExerciseDto[],
  ): Promise<Map<string, Exercise>> {
    const ids = exercises
      .map((exercise) => exercise.exercise_id)
      .filter((id): id is string => !!id);

    return this.resolveCatalogByIds(user_id, ids);
  }

  private async resolveCatalogByIds(
    user_id: string,
    ids: string[],
  ): Promise<Map<string, Exercise>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return new Map();
    }

    const found = await this.exerciseRepository.findByIds(user_id, unique);
    return new Map(found.map((exercise) => [exercise.getId(), exercise]));
  }

  private async getRoutine(user_id: string, routine_id: string): Promise<void> {
    const routine = await this.routineRepository.findById(user_id, routine_id);
    if (!routine) {
      throw new NotFoundException('Routine not found');
    }
  }

  private async getRoutineDay(
    user_id: string,
    routine_day_id?: string | null,
  ): Promise<RoutineDay | null> {
    if (!routine_day_id) {
      return null;
    }
    return this.getRoutineDayOrFail(user_id, routine_day_id);
  }

  private async getRoutineDayOrFail(
    user_id: string,
    routine_day_id: string,
  ): Promise<RoutineDay> {
    const day = await this.routineRepository.findDayById(
      user_id,
      routine_day_id,
    );
    if (!day) {
      throw new NotFoundException('Routine day not found');
    }
    return day;
  }
}
