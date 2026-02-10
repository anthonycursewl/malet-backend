export const MARK_AS_READ_USECASE = 'MARK_AS_READ_USECASE';

/**
 * Parámetros para marcar mensajes como leídos
 */
export interface MarkAsReadParams {
  conversationId: string;
  messageId?: string; // Si no se especifica, marca todos como leídos
}

/**
 * Resultado de marcar como leído
 */
export interface MarkAsReadResult {
  conversationId: string;
  markedCount: number;
  lastReadAt: Date;
}

/**
 * Puerto de entrada para marcar mensajes como leídos
 */
export interface MarkAsReadUseCase {
  /**
   * Marca mensajes como leídos hasta cierto punto
   */
  execute(userId: string, params: MarkAsReadParams): Promise<MarkAsReadResult>;
}
