import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoutineDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
