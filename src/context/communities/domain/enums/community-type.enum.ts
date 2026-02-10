/**
 * Tipos de comunidad disponibles
 */
export enum CommunityType {
  /** Cualquier usuario puede unirse directamente */
  PUBLIC = 'public',

  /** Requiere aprobación de un admin para unirse */
  PRIVATE = 'private',

  /** Requiere suscripción o pago para unirse */
  PREMIUM = 'premium',
}
