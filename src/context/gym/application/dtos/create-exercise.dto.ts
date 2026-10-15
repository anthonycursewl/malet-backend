import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  GYM_EQUIPMENT,
  GYM_EXERCISE_TYPES,
  GYM_MUSCLE_GROUPS,
  GymEquipment,
  GymExerciseType,
  GymMuscleGroup,
} from '../../domain/constants';

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn([...GYM_MUSCLE_GROUPS], {
    message: `muscle_group must be one of: ${GYM_MUSCLE_GROUPS.join(', ')}`,
  })
  muscle_group: GymMuscleGroup;

  @IsOptional()
  @IsIn([...GYM_EQUIPMENT], {
    message: `equipment must be one of: ${GYM_EQUIPMENT.join(', ')}`,
  })
  equipment?: GymEquipment;

  @IsOptional()
  @IsIn([...GYM_EXERCISE_TYPES], {
    message: `type must be one of: ${GYM_EXERCISE_TYPES.join(', ')}`,
  })
  type?: GymExerciseType;
}
