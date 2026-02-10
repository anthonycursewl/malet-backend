/**
 * Estados de membresía de un usuario en una comunidad
 */
export enum MembershipStatus {
  /** Miembro activo con acceso completo */
  ACTIVE = 'active',

  /** Esperando aprobación para unirse */
  PENDING = 'pending',

  /** Expulsado permanentemente */
  BANNED = 'banned',

  /** Suspendido temporalmente */
  SUSPENDED = 'suspended',
}
