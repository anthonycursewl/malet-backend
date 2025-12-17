/**
 * Roles de los miembros dentro de una comunidad
 */
export enum MemberRole {
    /** Creador de la comunidad, control total */
    OWNER = 'owner',

    /** Puede gestionar miembros y configuración */
    ADMIN = 'admin',

    /** Puede moderar contenido */
    MODERATOR = 'moderator',

    /** Miembro regular */
    MEMBER = 'member'
}
