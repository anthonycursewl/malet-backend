import { Message, EncryptedContent } from '../../entities/message.entity';
import { MessageType } from '../../enums/message-type.enum';

export const SEND_MESSAGE_USECASE = 'SEND_MESSAGE_USECASE';

/**
 * Parámetros para enviar un mensaje
 */
export interface SendMessageParams {
    conversationId: string;
    encryptedContent: string;
    encryptedKeys: Record<string, string>;
    iv: string;
    tag: string;
    type?: MessageType;
    replyToId?: string;
}

/**
 * Resultado de enviar un mensaje
 */
export interface SendMessageResult {
    message: Message;
}

/**
 * Puerto de entrada para enviar mensajes
 */
export interface SendMessageUseCase {
    /**
     * Envía un mensaje encriptado a una conversación
     */
    execute(userId: string, params: SendMessageParams): Promise<SendMessageResult>;
}
