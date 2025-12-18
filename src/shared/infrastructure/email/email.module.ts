import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EMAIL_SERVICE_PORT } from './email-service.port';
import { SmtpEmailAdapter } from './smtp-email.adapter';

/**
 * Módulo global de email.
 * 
 * Proporciona el servicio de email a toda la aplicación.
 * Usa SMTP por defecto, pero puede cambiarse fácilmente
 * a otro proveedor (SendGrid, Resend, etc.) cambiando el adapter.
 * 
 * Configuración requerida en .env:
 * - SMTP_HOST: Host del servidor SMTP (ej: smtp.gmail.com)
 * - SMTP_PORT: Puerto (587 para TLS, 465 para SSL)
 * - SMTP_SECURE: 'true' para SSL, 'false' para TLS
 * - SMTP_USER: Usuario de autenticación
 * - SMTP_PASS: Contraseña de autenticación
 * - SMTP_FROM_EMAIL: Email del remitente
 * - SMTP_FROM_NAME: Nombre del remitente
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: EMAIL_SERVICE_PORT,
            useClass: SmtpEmailAdapter
        }
    ],
    exports: [EMAIL_SERVICE_PORT]
})
export class EmailModule { }
