/**
 * AI Chat Domain Entities
 * 
 * Contains the core domain entities for AI chat functionality.
 */

/**
 * Represents a single message in a conversation
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}

/**
 * Primitives for AI Chat request
 */
export interface AIChatRequestPrimitives {
    userId: string;
    messages: ChatMessage[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
}

/**
 * Finish reason types (normalized from provider-specific values)
 */
export type FinishReason =
    | 'stop'
    | 'length'
    | 'content_filter'
    | 'error'
    | 'unknown';

/**
 * Primitives for AI Chat response
 */
export interface AIChatResponsePrimitives {
    id: string;
    content: string;
    model: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: FinishReason;
    truncated: boolean;
    createdAt: Date;
}

/**
 * Default max tokens - higher value to avoid truncation
 * Gemini 2.5 Flash supports up to 65,536 output tokens
 */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * AI Chat Request Entity
 */
export class AIChatRequest {
    private readonly userId: string;
    private readonly messages: ChatMessage[];
    private readonly model: string;
    private readonly maxTokens: number;
    private readonly temperature: number;
    private readonly stream: boolean;

    constructor(primitives: AIChatRequestPrimitives) {
        this.userId = primitives.userId;
        this.messages = primitives.messages;
        this.model = primitives.model || 'gemini-2.5-flash';
        this.maxTokens = primitives.maxTokens || DEFAULT_MAX_TOKENS;
        this.temperature = primitives.temperature || 0.7;
        this.stream = primitives.stream || false;
    }

    getUserId(): string {
        return this.userId;
    }

    getMessages(): ChatMessage[] {
        return this.messages;
    }

    getModel(): string {
        return this.model;
    }

    getMaxTokens(): number {
        return this.maxTokens;
    }

    getTemperature(): number {
        return this.temperature;
    }

    isStreaming(): boolean {
        return this.stream;
    }

    toPrimitives(): AIChatRequestPrimitives {
        return {
            userId: this.userId,
            messages: this.messages,
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            stream: this.stream,
        };
    }
}

/**
 * AI Chat Response Entity
 */
export class AIChatResponse {
    private readonly id: string;
    private readonly content: string;
    private readonly model: string;
    private readonly usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    private readonly finishReason: FinishReason;
    private readonly truncated: boolean;
    private readonly createdAt: Date;

    constructor(primitives: AIChatResponsePrimitives) {
        this.id = primitives.id;
        this.content = primitives.content;
        this.model = primitives.model;
        this.usage = primitives.usage;
        this.finishReason = primitives.finishReason;
        this.truncated = primitives.truncated;
        this.createdAt = primitives.createdAt;
    }

    getId(): string {
        return this.id;
    }

    getContent(): string {
        return this.content;
    }

    getModel(): string {
        return this.model;
    }

    getUsage() {
        return this.usage;
    }

    getFinishReason(): FinishReason {
        return this.finishReason;
    }

    /**
     * Returns true if the response was truncated due to max tokens limit.
     * The frontend should handle this case and inform the user.
     */
    isTruncated(): boolean {
        return this.truncated;
    }

    /**
     * Returns true if the response completed normally without issues.
     */
    isComplete(): boolean {
        return this.finishReason === 'stop' && !this.truncated;
    }

    /**
     * Returns true if the response was blocked by content filters.
     */
    wasFiltered(): boolean {
        return this.finishReason === 'content_filter';
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    toPrimitives(): AIChatResponsePrimitives {
        return {
            id: this.id,
            content: this.content,
            model: this.model,
            usage: this.usage,
            finishReason: this.finishReason,
            truncated: this.truncated,
            createdAt: this.createdAt,
        };
    }
}

