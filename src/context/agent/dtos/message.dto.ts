import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MessageDto {
  @IsNotEmpty()
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
