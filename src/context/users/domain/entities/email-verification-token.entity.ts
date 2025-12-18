/**
 * Primitivos del token de verificación de email.
 * Representa la estructura de datos del token.
 */
export interface EmailVerificationTokenPrimitives {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

/**
 * Entidad de dominio para tokens de verificación de email.
 * 
 * Los tokens son códigos de 6 dígitos que expiran en 15 minutos
 * y se usan para verificar la propiedad del email del usuario.
 */
export class EmailVerificationToken {
    private readonly id: string;
    private readonly userId: string;
    private readonly token: string;
    private readonly expiresAt: Date;
    private readonly createdAt: Date;

    /** Tiempo de expiración en minutos */
    private static readonly TOKEN_EXPIRY_MINUTES = 15;

    constructor(params: EmailVerificationTokenPrimitives) {
        this.id = params.id;
        this.userId = params.userId;
        this.token = params.token;
        this.expiresAt = params.expiresAt;
        this.createdAt = params.createdAt;
    }

    /**
     * Crea un nuevo token de verificación para un usuario.
     * Genera automáticamente un código de 6 dígitos y calcula la expiración.
     */
    static create(userId: string): EmailVerificationToken {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000);

        return new EmailVerificationToken({
            id: crypto.randomUUID(),
            userId,
            token: this.generateToken(),
            expiresAt,
            createdAt: now
        });
    }

    /**
     * Genera un código numérico de 6 dígitos
     */
    private static generateToken(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Verifica si el token ha expirado
     */
    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    /**
     * Verifica si el token es válido (coincide y no ha expirado)
     */
    isValid(inputToken: string): boolean {
        return this.token === inputToken && !this.isExpired();
    }

    /**
     * Obtiene los minutos restantes antes de que expire
     */
    getMinutesUntilExpiry(): number {
        const now = new Date();
        const diff = this.expiresAt.getTime() - now.getTime();
        return Math.max(0, Math.floor(diff / (60 * 1000)));
    }

    /**
     * Convierte la entidad a primitivos para persistencia
     */
    toPrimitives(): EmailVerificationTokenPrimitives {
        return {
            id: this.id,
            userId: this.userId,
            token: this.token,
            expiresAt: this.expiresAt,
            createdAt: this.createdAt
        };
    }

    /**
     * Crea una entidad desde primitivos (para hidratar desde base de datos)
     */
    static fromPrimitives(primitives: EmailVerificationTokenPrimitives): EmailVerificationToken {
        return new EmailVerificationToken(primitives);
    }

    // Getters
    getId(): string { return this.id; }
    getUserId(): string { return this.userId; }
    getToken(): string { return this.token; }
    getExpiresAt(): Date { return this.expiresAt; }
    getCreatedAt(): Date { return this.createdAt; }
}
