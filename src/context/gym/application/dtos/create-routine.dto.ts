import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoutineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
