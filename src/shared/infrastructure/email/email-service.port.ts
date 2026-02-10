/**
 * Interface para el puerto de servicio de email.
 * Define las operaciones que cualquier implementación de email debe soportar.
 */

export interface SendEmailParams {
  /** Destinatario del email */
  to: string | string[];
  /** Asunto del email */
  subject: string;
  /** Contenido HTML del email */
  html: string;
  /** Contenido de texto plano (alternativo) */
  text?: string;
  /** Remitente personalizado (opcional, usa el default si no se especifica) */
  from?: string;
  /** Nombre del remitente */
  fromName?: string;
  /** Responder a */
  replyTo?: string;
}

export interface VerificationEmailParams {
  /** Email del destinatario */
  to: string;
  /** Nombre de usuario para personalizar el mensaje */
  username: string;
  /** Código de verificación de 6 dígitos */
  verificationCode: string;
}

export interface WelcomeEmailParams {
  /** Email del destinatario */
  to: string;
  /** Nombre del usuario */
  username: string;
}

export interface PasswordResetEmailParams {
  /** Email del destinatario */
  to: string;
  /** Nombre del usuario */
  username: string;
  /** Token o código para resetear contraseña */
  resetCode: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Puerto de salida para el servicio de email.
 * Siguiendo arquitectura hexagonal, esta interface está en el dominio
 * y la implementación concreta (SMTP, Resend, SendGrid, etc.) está en infraestructura.
 */
export interface EmailServicePort {
  /**
   * Envía un email genérico
   */
  sendEmail(params: SendEmailParams): Promise<EmailResult>;

  /**
   * Envía email de verificación de cuenta
   */
  sendVerificationEmail(params: VerificationEmailParams): Promise<EmailResult>;

  /**
   * Envía email de bienvenida
   */
  sendWelcomeEmail(params: WelcomeEmailParams): Promise<EmailResult>;

  /**
   * Envía email de restablecimiento de contraseña
   */
  sendPasswordResetEmail(
    params: PasswordResetEmailParams,
  ): Promise<EmailResult>;
}

export const EMAIL_SERVICE_PORT = 'EMAIL_SERVICE_PORT';
