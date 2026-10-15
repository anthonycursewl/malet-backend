import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GymRoutinesUseCase } from '../domain/ports/in/gym-routines.usecase';
import { CreateRoutineDto } from './dtos/create-routine.dto';
import { UpdateRoutineDto } from './dtos/update-routine.dto';
import { SetRoutineDayDto } from './dtos/set-routine-day.dto';
import { Routine } from '../domain/entities/routine.entity';
import { RoutineDay } from '../domain/entities/routine-day.entity';
import {
  ListRoutinesOptions,
  RoutineWeek,
  RoutineWeekDay,
} from '../domain/types';
import { DAYS_OF_WEEK } from '../domain/constants';
import {
  ROUTINE_REPOSITORY_PORT,
  RoutineRepository,
} from '../domain/ports/out/routine.repository';
import {
  EXERCISE_REPOSITORY_PORT,
  ExerciseRepository,
} from '../domain/ports/out/exercise.repository';

@Injectable()
export class GymRoutinesService implements GymRoutinesUseCase {
  constructor(
    @Inject(ROUTINE_REPOSITORY_PORT)
    private readonly routineRepository: RoutineRepository,
    @Inject(EXERCISE_REPOSITORY_PORT)
    private readonly exerciseRepository: ExerciseRepository,
  ) {}

  async create(user_id: string, dto: CreateRoutineDto): Promise<Routine> {
    const routine = Routine.create({
      user_id,
      name: dto.name,
      description: dto.description ?? null,
    });

    const saved = await this.routineRepository.save(routine);

    // The first routine of a user becomes the active one automatically.
    const active = await this.routineRepository.findActive(user_id);
    if (!active) {
      await this.routineRepository.setActive(user_id, saved.getId());
      return this.getById(user_id, saved.getId());
    }

    return saved;
  }

  async list(options: ListRoutinesOptions): Promise<Routine[]> {
    return this.routineRepository.findMany(options);
  }

  async getActive(user_id: string): Promise<Routine | null> {
    return this.routineRepository.findActive(user_id);
  }

  async getById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Routine> {
    const routine = await this.routineRepository.findById(
      user_id,
      id,
      include_deleted,
    );
    if (!routine) {
      throw new NotFoundException('Routine not found');
    }
    return routine;
  }

  async getWeek(user_id: string, routine_id: string): Promise<RoutineWeek> {
    const routine = await this.getById(user_id, routine_id);
    const byDay = new Map(
      routine.getDays().map((day) => [day.getDayOfWeek(), day]),
    );

    const days: RoutineWeekDay[] = DAYS_OF_WEEK.map((day_of_week) => {
      const day = byDay.get(day_of_week);
      return {
        id: day?.getId() ?? null,
        day_of_week,
        title: day?.getTitle() ?? null,
        is_rest: day?.isRest() ?? false,
        notes: day?.getNotes() ?? null,
        exercises:
          day?.getExercises().map((exercise) => exercise.toPrimitives()) ?? [],
      };
    });

    return { routine: routine.toPrimitives(), days };
  }

  async update(
    user_id: string,
    id: string,
    dto: UpdateRoutineDto,
  ): Promise<Routine> {
    const routine = await this.getById(user_id, id);

    const patch: Parameters<Routine['update']>[0] = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description;

    return this.routineRepository.update(routine.update(patch));
  }

  async setDay(
    user_id: string,
    routine_id: string,
    day_of_week: number,
    dto: SetRoutineDayDto,
  ): Promise<Routine> {
    this.assertDayOfWeek(day_of_week);
    const routine = await this.getById(user_id, routine_id);

    const is_rest = dto.is_rest ?? false;
    const exercises = dto.exercises ?? [];

    if (is_rest && exercises.length > 0) {
      throw new BadRequestException('A rest day cannot carry exercises');
    }
    exercises.forEach((exercise) => {
      if (
        exercise.reps_min != null &&
        exercise.reps_max != null &&
        exercise.reps_min > exercise.reps_max
      ) {
        throw new BadRequestException(
          'reps_min cannot be greater than reps_max',
        );
      }
    });
    if (!is_rest && exercises.length > 0) {
      await this.assertExercisesExist(
        user_id,
        exercises.map((exercise) => exercise.exercise_id),
      );
    }

    const day = RoutineDay.create({
      routine_id: routine.getId(),
      day_of_week,
      title: dto.title ?? null,
      is_rest,
      notes: dto.notes ?? null,
      exercises: exercises.map((exercise, index) => ({
        ...exercise,
        position: index + 1,
      })),
    });

    await this.routineRepository.saveDay(day);
    return this.getById(user_id, routine_id);
  }

  async deleteDay(
    user_id: string,
    routine_id: string,
    day_of_week: number,
  ): Promise<Routine> {
    this.assertDayOfWeek(day_of_week);
    const routine = await this.getById(user_id, routine_id);

    if (!routine.getDay(day_of_week)) {
      throw new NotFoundException('This day is not configured in the routine');
    }

    await this.routineRepository.deleteDay(routine.getId(), day_of_week);
    return this.getById(user_id, routine_id);
  }

  async activate(user_id: string, id: string): Promise<Routine> {
    const routine = await this.getById(user_id, id);
    await this.routineRepository.setActive(user_id, routine.getId());
    return this.getById(user_id, id);
  }

  async deactivate(user_id: string, id: string): Promise<Routine> {
    const routine = await this.getById(user_id, id);
    if (!routine.isActive()) {
      throw new ConflictException('This routine is not active');
    }

    await this.routineRepository.deactivate(routine.getId());
    return this.getById(user_id, id);
  }

  async softDelete(user_id: string, id: string): Promise<Routine> {
    const routine = await this.getById(user_id, id);
    if (routine.isActive()) {
      throw new ConflictException('Deactivate the routine before deleting it');
    }

    return this.routineRepository.delete(routine.getId());
  }

  async restore(user_id: string, id: string): Promise<Routine> {
    const routine = await this.getById(user_id, id, true);
    if (!routine.isDeleted()) {
      throw new ConflictException('This routine is not deleted');
    }

    return this.routineRepository.restore(routine.getId());
  }

  async hardDelete(user_id: string, id: string): Promise<void> {
    const routine = await this.getById(user_id, id, true);
    if (routine.isActive()) {
      throw new ConflictException('Deactivate the routine before deleting it');
    }
    if (await this.routineRepository.hasSessions(routine.getId())) {
      throw new ConflictException(
        'This routine has logged sessions: delete them first',
      );
    }

    return this.routineRepository.hardDelete(routine.getId());
  }

  private assertDayOfWeek(day_of_week: number): void {
    if (!Number.isInteger(day_of_week) || day_of_week < 1 || day_of_week > 7) {
      throw new BadRequestException(
        'day_of_week must be an integer between 1 (Monday) and 7 (Sunday)',
      );
    }
  }

  private async assertExercisesExist(
    user_id: string,
    exercise_ids: string[],
  ): Promise<void> {
    const unique = [...new Set(exercise_ids)];
    const found = await this.exerciseRepository.findByIds(user_id, unique);

    if (found.length !== unique.length) {
      throw new NotFoundException(
        'One or more exercises were not found in the catalog',
      );
    }
  }
}
