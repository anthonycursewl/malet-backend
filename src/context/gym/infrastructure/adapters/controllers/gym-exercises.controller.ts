import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  ModuleEnabledGuard,
  RequireModule,
} from 'src/context/modules/infrastructure/adapters/guards/module-enabled.guard';
import { DEFAULT_LIST_TAKE, GYM_MODULE_KEY } from '../../../domain/constants';
import {
  GYM_EXERCISES_USECASE,
  GymExercisesUseCase,
} from '../../../domain/ports/in/gym-exercises.usecase';
import { CreateExerciseDto } from '../../../application/dtos/create-exercise.dto';
import { UpdateExerciseDto } from '../../../application/dtos/update-exercise.dto';
import { ExerciseListQueryDto } from '../dtos/exercise-list-query.dto';

@Controller('gym/exercises')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@RequireModule(GYM_MODULE_KEY)
export class GymExercisesController {
  constructor(
    @Inject(GYM_EXERCISES_USECASE)
    private readonly gymExercisesUseCase: GymExercisesUseCase,
  ) {}

  /** Base catalog plus the user's own exercises. */
  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Query() query: ExerciseListQueryDto,
  ) {
    const take = query.take ?? DEFAULT_LIST_TAKE;

    const results = await this.gymExercisesUseCase.list({
      user_id: user.userId,
      take,
      cursor: query.cursor,
      search: query.search,
      muscle_group: query.muscle_group,
      type: query.type,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((exercise) => exercise.toPrimitives()),
      nextCursor,
    };
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateExerciseDto,
  ) {
    const exercise = await this.gymExercisesUseCase.create(user.userId, dto);
    return exercise.toPrimitives();
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const exercise = await this.gymExercisesUseCase.getById(user.userId, id);
    return exercise.toPrimitives();
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
  ) {
    const exercise = await this.gymExercisesUseCase.update(
      user.userId,
      id,
      dto,
    );
    return exercise.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const exercise = await this.gymExercisesUseCase.softDelete(user.userId, id);
    return exercise.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const exercise = await this.gymExercisesUseCase.restore(user.userId, id);
    return exercise.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.gymExercisesUseCase.hardDelete(user.userId, id);
    return { success: true };
  }
}
