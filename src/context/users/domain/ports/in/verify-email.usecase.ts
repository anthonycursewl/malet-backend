/**
 * Parámetros para verificar un email
 */
export interface VerifyEmailParams {
  /** Email del usuario a verificar */
  email: string;
  /** Código de verificación de 6 dígitos */
  token: string;
}

/**
 * Resultado de la verificación
 */
export interface VerifyEmailResult {
  /** Si la verificación fue exitosa */
  verified: boolean;
  /** Mensaje descriptivo */
  message: string;
}

/**
 * Caso de uso para verificar el email de un usuario.
 * Valida el código de verificación y marca el email como verificado.
 */
export interface VerifyEmailUseCase {
  execute(params: VerifyEmailParams): Promise<VerifyEmailResult>;
}

export const VERIFY_EMAIL_USECASE = 'VERIFY_EMAIL_USECASE';
