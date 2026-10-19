/**
 * Templates de email para la aplicación Malet.
 * Todos los templates están en español y siguen el branding de la app.
 */

export interface EmailTemplateData {
  subject: string;
  html: string;
  text: string;
}

/**
 * Clase que contiene todos los templates de email.
 * Centraliza el diseño y facilita la modificación de estilos.
 */
export class EmailTemplates {
  // Colores del branding
  private static readonly BRAND_COLOR = '#10B981'; // Verde esmeralda
  private static readonly BRAND_COLOR_LIGHT = '#F0FDF4';
  private static readonly TEXT_COLOR = '#1F2937';
  private static readonly TEXT_SECONDARY = '#6B7280';
  private static readonly APP_NAME = 'Malet';

  /**
   * Wrapper base para todos los emails.
   *
   * `brand: false` quita la marca de Malet (cabecera y pie): lo usan los avisos
   * de una tienda, que se presentan solo con su foto y su nombre.
   */
  private static baseTemplate(
    content: string,
    options: { brand?: boolean } = {},
  ): string {
    const brand = options.brand !== false;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.APP_NAME}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: ${this.TEXT_COLOR};
            background-color: #F9FAFB;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo-text {
            font-size: 28px;
            font-weight: bold;
            color: ${this.BRAND_COLOR};
        }
        h1 {
            font-size: 24px;
            margin-bottom: 16px;
            color: ${this.TEXT_COLOR};
        }
        p {
            margin-bottom: 16px;
            color: ${this.TEXT_SECONDARY};
        }
        .code-box {
            background: ${this.BRAND_COLOR_LIGHT};
            border: 2px dashed ${this.BRAND_COLOR};
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: ${this.BRAND_COLOR};
            font-family: 'Courier New', monospace;
        }
        .button {
            display: inline-block;
            background: ${this.BRAND_COLOR};
            color: white;
            padding: 14px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 16px 0;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #E5E7EB;
            color: ${this.TEXT_SECONDARY};
            font-size: 14px;
        }
        .warning {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 12px 16px;
            margin: 16px 0;
            border-radius: 0 8px 8px 0;
            font-size: 14px;
        }
        .expires {
            color: ${this.TEXT_SECONDARY};
            font-size: 14px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            ${
              brand
                ? `<div class="logo">
                <span class="logo-text">💳 ${this.APP_NAME}</span>
            </div>`
                : ''
            }
            ${content}
            ${
              brand
                ? `<div class="footer">
                <p>— El equipo de ${this.APP_NAME}</p>
                <p style="font-size: 12px; margin-top: 16px;">
                    Este email fue enviado por ${this.APP_NAME}. 
                    Si no esperabas este correo, puedes ignorarlo.
                </p>
            </div>`
                : `<div class="footer">
                <p style="font-size: 12px;">
                    Este aviso lo envía tu tienda desde la app. Si no esperabas este
                    correo, puedes ignorarlo.
                </p>
            </div>`
            }
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Aviso de un evento de una tienda (venta, recibo, cambios de la tienda o de
   * sus miembros). `rows` es el detalle en pares etiqueta/valor.
   */
  static storeEvent(params: {
    subject: string;
    storeName: string;
    /** Foto de la tienda: se muestra como encabezado del correo. */
    storeLogoUrl?: string | null;
    title: string;
    intro: string;
    rows?: { label: string; value: string }[];
    footerNote?: string;
  }): EmailTemplateData {
    const escape = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const rows = params.rows ?? [];

    const rowsHtml = rows
      .map(
        (row) => `<tr>
                    <td style="padding: 6px 0; color: ${this.TEXT_SECONDARY}; font-size: 14px;">${escape(row.label)}</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 600; font-size: 14px;">${escape(row.value)}</td>
                </tr>`,
      )
      .join('');

    const html = this.baseTemplate(
      `
            <div style="text-align: center; margin-bottom: 24px;">
                ${
                  params.storeLogoUrl
                    ? `<img src="${escape(params.storeLogoUrl)}" alt="${escape(params.storeName)}" width="76" height="76" style="display: block; margin: 0 auto; width: 76px; height: 76px; border: 0; border-radius: 20px;" />`
                    : ''
                }
                <div style="margin-top: 10px; font-weight: 700; font-size: 16px; color: ${this.TEXT_COLOR};">${escape(params.storeName)}</div>
            </div>
            <h1>${escape(params.title)}</h1>
            <p>${escape(params.intro)}</p>
            ${
              rowsHtml
                ? `<table style="width: 100%; margin-top: 20px; border-collapse: collapse;">${rowsHtml}</table>`
                : ''
            }
            ${params.footerNote ? `<div class="warning">${escape(params.footerNote)}</div>` : ''}
        `,
      { brand: false },
    );

    const text = [
      params.title,
      '',
      params.intro,
      ...rows.map((row) => `${row.label}: ${row.value}`),
      '',
      params.footerNote ?? '',
      `— El equipo de ${this.APP_NAME}`,
    ]
      .join('\n')
      .trim();

    return {
      subject: params.subject,
      html,
      text,
    };
  }

  /**
   * Template para verificación de email
   */
  static verification(username: string, code: string): EmailTemplateData {    const html = this.baseTemplate(`
            <h1>¡Hola ${username}! 👋</h1>
            <p>Gracias por registrarte en ${this.APP_NAME}. Para completar tu registro, usa el siguiente código de verificación:</p>
            
            <div class="code-box">
                <span class="code">${code}</span>
            </div>
            
            <p class="expires">Este código expira en <strong>15 minutos</strong>.</p>
            
            <div class="warning">
                ⚠️ Si no creaste una cuenta en ${this.APP_NAME}, puedes ignorar este mensaje.
            </div>
        `);

    const text = `
¡Hola ${username}!

Gracias por registrarte en ${this.APP_NAME}. Tu código de verificación es:

${code}

Este código expira en 15 minutos.

Si no creaste una cuenta en ${this.APP_NAME}, puedes ignorar este mensaje.

— El equipo de ${this.APP_NAME}
        `.trim();

    return {
      subject: `${code} - Verifica tu cuenta de ${this.APP_NAME}`,
      html,
      text,
    };
  }

  /**
   * Template para bienvenida después de verificar
   */
  static welcome(username: string): EmailTemplateData {
    const html = this.baseTemplate(`
            <h1>¡Bienvenido a ${this.APP_NAME}, ${username}! 🎉</h1>
            <p>Tu cuenta ha sido verificada exitosamente. Ahora puedes disfrutar de todas las funcionalidades de ${this.APP_NAME}.</p>
            
            <p>Con ${this.APP_NAME} puedes:</p>
            <ul style="margin: 16px 0; padding-left: 24px; color: ${this.TEXT_SECONDARY};">
                <li>Gestionar tus finanzas personales</li>
                <li>Crear múltiples cuentas y wallets</li>
                <li>Hacer seguimiento de tus transacciones</li>
                <li>Y mucho más...</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="#" class="button">Comenzar ahora</a>
            </p>
        `);

    const text = `
¡Bienvenido a ${this.APP_NAME}, ${username}! 🎉

Tu cuenta ha sido verificada exitosamente. Ahora puedes disfrutar de todas las funcionalidades de ${this.APP_NAME}.

— El equipo de ${this.APP_NAME}
        `.trim();

    return {
      subject: `¡Bienvenido a ${this.APP_NAME}! 🎉`,
      html,
      text,
    };
  }

  /**
   * Template para restablecimiento de contraseña
   */
  static passwordReset(username: string, code: string): EmailTemplateData {
    const html = this.baseTemplate(`
            <h1>Restablecer contraseña</h1>
            <p>Hola ${username}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
            
            <div class="code-box">
                <span class="code">${code}</span>
            </div>
            
            <p class="expires">Este código expira en <strong>15 minutos</strong>.</p>
            
            <div class="warning">
                ⚠️ Si no solicitaste restablecer tu contraseña, alguien podría estar intentando acceder a tu cuenta. 
                Te recomendamos cambiar tu contraseña inmediatamente.
            </div>
        `);

    const text = `
Hola ${username},

Recibimos una solicitud para restablecer la contraseña de tu cuenta. Tu código es:

${code}

Este código expira en 15 minutos.

Si no solicitaste restablecer tu contraseña, te recomendamos cambiar tu contraseña inmediatamente.

— El equipo de ${this.APP_NAME}
        `.trim();

    return {
      subject: `${code} - Restablecer contraseña de ${this.APP_NAME}`,
      html,
      text,
    };
  }
}
