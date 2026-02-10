/**
 * Parámetros para reenviar código de verificación
 */
export interface ResendVerificationParams {
  /** Email del usuario */
  email: string;
}

/**
 * Resultado del reenvío
 */
export interface ResendVerificationResult {
  /** Si el envío fue exitoso */
  sent: boolean;
  /** Mensaje descriptivo */
  message: string;
}

/**
 * Caso de uso para reenviar el código de verificación.
 * Genera un nuevo código y lo envía al email del usuario.
 */
export interface ResendVerificationUseCase {
  execute(params: ResendVerificationParams): Promise<ResendVerificationResult>;
}

export const RESEND_VERIFICATION_USECASE = 'RESEND_VERIFICATION_USECASE';
