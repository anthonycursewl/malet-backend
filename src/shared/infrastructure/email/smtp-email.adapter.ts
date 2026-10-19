import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  EmailServicePort,
  SendEmailParams,
  VerificationEmailParams,
  WelcomeEmailParams,
  PasswordResetEmailParams,
  EmailResult,
} from './email-service.port';
import { EmailTemplates } from './email-templates';

/**
 * Adaptador SMTP para el servicio de email.
 * Usa nodemailer para enviar emails a través de un servidor SMTP.
 *
 * Configuración requerida en .env:
 * - HOST_EMAIL: Host del servidor SMTP (ej: smtp.zoho.com)
 * - PORT_EMAIL: Puerto del servidor SMTP (587 para TLS, 465 para SSL)
 * - SMTP_SECURE: 'true' para SSL (puerto 465), 'false' para TLS (puerto 587)
 * - SMTP_USER: Usuario de autenticación
 * - SMTP_PASSWORD: Contraseña de autenticación
 * - SMTP_FROM: Remitente en formato "Nombre <email@ejemplo.com>"
 */
@Injectable()
export class SmtpEmailAdapter implements EmailServicePort {
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    // Obtener SMTP_FROM o construirlo desde SMTP_USER
    const smtpFrom = this.configService.get<string>('SMTP_FROM');
    const smtpUser = this.configService.get<string>('SMTP_USER');

    // Si SMTP_FROM está definido, usarlo directamente
    // Si no, usar SMTP_USER como fallback
    this.fromAddress = smtpFrom || `Malet <${smtpUser}>`;

    this.initializeTransporter();
  }

  /**
   * Inicializa el transporter de nodemailer con la configuración SMTP
   */
  private initializeTransporter(): void {
    const host = this.configService.get<string>('HOST_EMAIL');
    const port = this.configService.get<number>('PORT_EMAIL', 587);
    const secure =
      this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP configuration incomplete. Email sending will fail.',
      );
      this.logger.warn(
        'Required: HOST_EMAIL, PORT_EMAIL, SMTP_USER, SMTP_PASSWORD',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      // Configuración adicional para mejor compatibilidad
      tls: {
        rejectUnauthorized: false, // Permite certificados self-signed en desarrollo
      },
    });

    this.logger.log(`📧 SMTP configured: ${host}:${port} (secure: ${secure})`);
    this.logger.log(`📧 From address: ${this.fromAddress}`);

    // Verificar conexión al iniciar (solo log, no bloquea)
    this.verifyConnection();
  }

  /**
   * Verifica la conexión con el servidor SMTP
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('❌ SMTP connection failed:', error.message);
    }
  }

  /**
   * Envía un email genérico
   */
  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    try {
      // Usar el from proporcionado o el configurado por defecto
      const from = params.from
        ? params.fromName
          ? `"${params.fromName}" <${params.from}>`
          : params.from
        : this.fromAddress;

      const result = await this.transporter.sendMail({
        from,
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
        attachments: params.attachments?.map((file) => ({
          filename: file.filename,
          content: file.content,
          cid: file.cid,
        })),
      });

      this.logger.log(`📧 Email sent successfully to: ${params.to}`);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email to ${params.to}:`,
        error.message,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envía email de verificación de cuenta
   */
  async sendVerificationEmail(
    params: VerificationEmailParams,
  ): Promise<EmailResult> {
    const template = EmailTemplates.verification(
      params.username,
      params.verificationCode,
    );

    return this.sendEmail({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Envía email de bienvenida
   */
  async sendWelcomeEmail(params: WelcomeEmailParams): Promise<EmailResult> {
    const template = EmailTemplates.welcome(params.username);

    return this.sendEmail({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Envía email de restablecimiento de contraseña
   */
  async sendPasswordResetEmail(
    params: PasswordResetEmailParams,
  ): Promise<EmailResult> {
    const template = EmailTemplates.passwordReset(
      params.username,
      params.resetCode,
    );

    return this.sendEmail({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }
}
