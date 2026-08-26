import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength } from 'class-validator';

export class TaskitiLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class TaskitiRegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class TaskitiRefreshDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
