import { IsNotEmpty, IsString } from 'class-validator';

export class LoginGoogleDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
