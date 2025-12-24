import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { ChatWithAIUseCase, ChatWithAIParams } from '../domain/ports/in/chat-with-ai.usecase';
import { AI_PROVIDER_REPOSITORY, AIProviderRepository } from '../domain/ports/out/ai-provider.repository';
import { AIChatRequest, AIChatResponse } from '../domain/entities/ai-chat.entity';

/**
 * Model mapping for backward compatibility
 * Maps old/deprecated model names to current ones
 */
const MODEL_ALIASES: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-2.5-flash',
    'gemini-1.5-flash-8b': 'gemini-2.5-flash',
    'gemini-1.5-pro': 'gemini-2.5-pro',
    'gemini-2.0-flash-exp': 'gemini-2.0-flash',
};

/**
 * Chat with AI Service Implementation
 * 
 * Implements the ChatWithAIUseCase interface (input port).
 * Handles business logic for AI chat interactions.
 */
@Injectable()
export class ChatWithAIService implements ChatWithAIUseCase {
    private readonly logger = new Logger('AIChatService');

    constructor(
        @Inject(AI_PROVIDER_REPOSITORY)
        private readonly aiProviderRepository: AIProviderRepository,
    ) { }

    /**
     * Maps legacy model names to current ones.
     * If the model is not in the alias map, returns as-is.
     */
    private resolveModel(model: string | undefined): string | undefined {
        if (!model) return undefined;

        if (MODEL_ALIASES[model]) {
            this.logger.log(`📝 Model alias: ${model} -> ${MODEL_ALIASES[model]}`);
            return MODEL_ALIASES[model];
        }

        return model;
    }

    /**
     * Executes a chat request to the AI provider.
     * Validates input and delegates to the AI provider adapter.
     */
    async execute(userId: string, params: ChatWithAIParams): Promise<AIChatResponse> {
        if (!params.messages || params.messages.length === 0) {
            throw new BadRequestException('At least one message is required');
        }

        for (const msg of params.messages) {
            if (!msg.role || !msg.content) {
                throw new BadRequestException('Each message must have a role and content');
            }
            if (!['user', 'assistant', 'system'].includes(msg.role)) {
                throw new BadRequestException(`Invalid message role: ${msg.role}`);
            }
        }

        const resolvedModel = this.resolveModel(params.model);

        if (resolvedModel) {
            const isAvailable = await this.aiProviderRepository.isModelAvailable(resolvedModel);
            if (!isAvailable) {
                this.logger.warn(`⚠️ Unknown model "${resolvedModel}", using default`)
            }
        }

        const request = new AIChatRequest({
            userId,
            messages: params.messages,
            model: resolvedModel,
            maxTokens: params.maxTokens,
            temperature: params.temperature,
            stream: params.stream,
        });

        this.logger.log(
            `🤖 AI Chat request from user: ${userId}, model: ${request.getModel()}, maxTokens: ${request.getMaxTokens()}`
        );

        try {
            const response = await this.aiProviderRepository.chat(request);

            const status = response.isTruncated() ? '⚠️ TRUNCATED' : '✅ COMPLETE';
            this.logger.log(
                `${status} AI response: ${response.getUsage().totalTokens} tokens, ` +
                `finishReason: ${response.getFinishReason()}`
            );

            return response;
        } catch (error) {
            this.logger.error(`❌ AI Chat error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gets available AI models for the user.
     */
    async getAvailableModels(userId: string): Promise<string[]> {
        this.logger.log(`📋 Getting available models for user: ${userId}`);
        return this.aiProviderRepository.getAvailableModels();
    }
}

