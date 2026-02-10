import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO para crear una conversación privada
 */
export class CreatePrivateConversationDto {
  @IsString()
  @IsNotEmpty({ message: 'participantUserId es requerido' })
  participantUserId: string;
}

/**
 * DTO para crear una conversación de comunidad
 */
export class CreateCommunityConversationDto {
  @IsString()
  @IsNotEmpty({ message: 'communityId es requerido' })
  communityId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
