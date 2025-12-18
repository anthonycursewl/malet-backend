import { ConversationType } from '../enums/conversation-type.enum';

/**
 * Primitivas de la entidad Conversation
 */
export interface ConversationPrimitives {
    id: string;
    type: ConversationType;
    communityId: string | null;
    name: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt: Date | null;
}

/**
 * Entidad de dominio Conversation
 * Representa una conversación (privada o de comunidad)
 * 
 * Esta entidad es agnóstica de la infraestructura y puede ser
 * migrada a otro servidor sin cambios.
 */
export class Conversation {
    private readonly id: string;
    private readonly type: ConversationType;
    private readonly communityId: string | null;
    private readonly name: string | null;
    private readonly avatarUrl: string | null;
    private readonly createdAt: Date;
    private readonly updatedAt: Date;
    private readonly lastMessageAt: Date | null;

    private constructor(params: ConversationPrimitives) {
        this.id = params.id;
        this.type = params.type;
        this.communityId = params.communityId;
        this.name = params.name;
        this.avatarUrl = params.avatarUrl;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
        this.lastMessageAt = params.lastMessageAt;
    }

    /**
     * Crea una conversación privada entre dos usuarios
     */
    static createPrivate(): Conversation {
        const now = new Date();
        return new Conversation({
            id: crypto.randomUUID(),
            type: ConversationType.PRIVATE,
            communityId: null,
            name: null,
            avatarUrl: null,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: null
        });
    }

    /**
     * Crea una conversación para una comunidad
     */
    static createForCommunity(communityId: string, name: string, avatarUrl?: string): Conversation {
        const now = new Date();
        return new Conversation({
            id: crypto.randomUUID(),
            type: ConversationType.COMMUNITY,
            communityId,
            name,
            avatarUrl: avatarUrl || null,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: null
        });
    }

    // Getters
    getId(): string { return this.id; }
    getType(): ConversationType { return this.type; }
    getCommunityId(): string | null { return this.communityId; }
    getName(): string | null { return this.name; }
    getAvatarUrl(): string | null { return this.avatarUrl; }
    getCreatedAt(): Date { return this.createdAt; }
    getUpdatedAt(): Date { return this.updatedAt; }
    getLastMessageAt(): Date | null { return this.lastMessageAt; }

    /**
     * Verifica si es una conversación privada
     */
    isPrivate(): boolean {
        return this.type === ConversationType.PRIVATE;
    }

    /**
     * Verifica si es una conversación de comunidad
     */
    isCommunity(): boolean {
        return this.type === ConversationType.COMMUNITY;
    }

    /**
     * Crea una copia con lastMessageAt actualizado
     */
    withLastMessageAt(date: Date): Conversation {
        return new Conversation({
            ...this.toPrimitives(),
            lastMessageAt: date,
            updatedAt: new Date()
        });
    }

    toPrimitives(): ConversationPrimitives {
        return {
            id: this.id,
            type: this.type,
            communityId: this.communityId,
            name: this.name,
            avatarUrl: this.avatarUrl,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastMessageAt: this.lastMessageAt
        };
    }

    static fromPrimitives(primitives: ConversationPrimitives): Conversation {
        return new Conversation(primitives);
    }
}
