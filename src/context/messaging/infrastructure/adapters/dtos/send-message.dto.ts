import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';
import { MessageType } from '../../../domain/enums/message-type.enum';

/**
 * DTO para enviar un mensaje encriptado
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'encryptedContent es requerido' })
  encryptedContent: string;

  @IsObject()
  @IsNotEmpty({ message: 'encryptedKeys es requerido' })
  encryptedKeys: Record<string, string>;

  @IsString()
  @IsNotEmpty({ message: 'iv es requerido' })
  iv: string;

  @IsString()
  @IsNotEmpty({ message: 'tag es requerido' })
  tag: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @IsString()
  @IsOptional()
  replyToId?: string;
}
