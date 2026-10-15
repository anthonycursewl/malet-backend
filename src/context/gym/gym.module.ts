import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { ModulesModule } from '../modules/modules.module';
import { GymExercisesController } from './infrastructure/adapters/controllers/gym-exercises.controller';
import { GymRoutinesController } from './infrastructure/adapters/controllers/gym-routines.controller';
import { GymSessionsController } from './infrastructure/adapters/controllers/gym-sessions.controller';
import { GymBodyMetricsController } from './infrastructure/adapters/controllers/gym-body-metrics.controller';
import { GymReportsController } from './infrastructure/adapters/controllers/gym-reports.controller';
import { EXERCISE_REPOSITORY_PORT } from './domain/ports/out/exercise.repository';
import { ROUTINE_REPOSITORY_PORT } from './domain/ports/out/routine.repository';
import { SESSION_REPOSITORY_PORT } from './domain/ports/out/session.repository';
import { BODY_METRIC_REPOSITORY_PORT } from './domain/ports/out/body-metric.repository';
import { GYM_EXERCISES_USECASE } from './domain/ports/in/gym-exercises.usecase';
import { GYM_ROUTINES_USECASE } from './domain/ports/in/gym-routines.usecase';
import { GYM_SESSIONS_USECASE } from './domain/ports/in/gym-sessions.usecase';
import { GYM_BODY_METRICS_USECASE } from './domain/ports/in/gym-body-metrics.usecase';
import { GYM_REPORTS_USECASE } from './domain/ports/in/gym-reports.usecase';
import { ExerciseRepositoryAdapter } from './infrastructure/persistence/exercise.repository.adapter';
import { RoutineRepositoryAdapter } from './infrastructure/persistence/routine.repository.adapter';
import { SessionRepositoryAdapter } from './infrastructure/persistence/session.repository.adapter';
import { BodyMetricRepositoryAdapter } from './infrastructure/persistence/body-metric.repository.adapter';
import { GymExercisesService } from './application/gym-exercises.service';
import { GymRoutinesService } from './application/gym-routines.service';
import { GymSessionsService } from './application/gym-sessions.service';
import { GymBodyMetricsService } from './application/gym-body-metrics.service';
import { GymReportsService } from './application/gym-reports.service';

@Module({
  imports: [PrismaModule, ModulesModule],
  controllers: [
    GymExercisesController,
    GymRoutinesController,
    GymSessionsController,
    GymBodyMetricsController,
    GymReportsController,
  ],
  providers: [
    {
      provide: EXERCISE_REPOSITORY_PORT,
      useClass: ExerciseRepositoryAdapter,
    },
    {
      provide: ROUTINE_REPOSITORY_PORT,
      useClass: RoutineRepositoryAdapter,
    },
    {
      provide: SESSION_REPOSITORY_PORT,
      useClass: SessionRepositoryAdapter,
    },
    {
      provide: BODY_METRIC_REPOSITORY_PORT,
      useClass: BodyMetricRepositoryAdapter,
    },
    {
      provide: GYM_EXERCISES_USECASE,
      useClass: GymExercisesService,
    },
    {
      provide: GYM_ROUTINES_USECASE,
      useClass: GymRoutinesService,
    },
    {
      provide: GYM_SESSIONS_USECASE,
      useClass: GymSessionsService,
    },
    {
      provide: GYM_BODY_METRICS_USECASE,
      useClass: GymBodyMetricsService,
    },
    {
      provide: GYM_REPORTS_USECASE,
      useClass: GymReportsService,
    },
  ],
  exports: [GYM_ROUTINES_USECASE, GYM_SESSIONS_USECASE],
})
export class GymModule {}
