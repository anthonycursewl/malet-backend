import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Firma del folio del recibo para la verificación pública.
 *
 * El QR del ticket lleva el folio + este token, de modo que cualquiera puede
 * comprobar que el documento fue emitido por Malet sin poder inventarse folios
 * (el token no se puede forjar sin el secreto del servidor). No requiere
 * guardar nada extra: se deriva del folio y del secreto.
 */
export function buildReceiptVerifyToken(
  number: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(`receipt:${number}`)
    .digest('base64url');
}

/** Comparación en tiempo constante para evitar filtraciones por timing. */
export function isValidReceiptVerifyToken(
  number: string,
  token: string,
  secret: string,
): boolean {
  const expected = buildReceiptVerifyToken(number, secret);
  const received = Buffer.from(token ?? '');
  const expectedBuffer = Buffer.from(expected);

  if (received.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(received, expectedBuffer);
}
