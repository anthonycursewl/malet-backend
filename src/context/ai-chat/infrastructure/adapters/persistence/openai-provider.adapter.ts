import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AIProviderRepository } from '../../../domain/ports/out/ai-provider.repository';
import { AIChatRequest, AIChatResponse, ChatMessage, FinishReason } from '../../../domain/entities/ai-chat.entity';
import { randomUUID } from 'crypto';

/**
 * Available models configuration
 */
const AVAILABLE_MODELS = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
];

/**
 * OpenAI Provider Adapter
 * 
 * Implements the AIProviderRepository interface for OpenAI API.
 * Can be swapped with any other AI provider adapter (Anthropic, Google, etc.)
 */
@Injectable()
export class OpenAIProviderAdapter extends AIProviderRepository {
    private readonly logger = new Logger('OpenAIProvider');
    private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
    private readonly apiKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        super();
        this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';

        if (!this.apiKey) {
            this.logger.warn('⚠️ OPENAI_API_KEY not configured. AI Chat will not work.');
        }
    }

    /**
     * Sends a chat completion request to OpenAI.
     */
    async chat(request: AIChatRequest): Promise<AIChatResponse> {
        if (!this.apiKey) {
            throw new InternalServerErrorException('AI service not configured');
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    this.apiUrl,
                    {
                        model: request.getModel(),
                        messages: this.formatMessages(request.getMessages()),
                        max_tokens: request.getMaxTokens(),
                        temperature: request.getTemperature(),
                        stream: false,
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 60000,
                    }
                )
            );

            const data = response.data;
            const rawFinishReason = data.choices[0]?.finish_reason || 'unknown';
            const finishReason = this.mapFinishReason(rawFinishReason);
            const truncated = finishReason === 'length';

            return new AIChatResponse({
                id: data.id || randomUUID(),
                content: data.choices[0]?.message?.content || '',
                model: data.model || request.getModel(),
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                },
                finishReason,
                truncated,
                createdAt: new Date(data.created * 1000) || new Date(),
            });

        } catch (error) {
            this.logger.error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);

            if (error.response?.status === 401) {
                throw new InternalServerErrorException('AI service authentication failed');
            }
            if (error.response?.status === 429) {
                throw new InternalServerErrorException('AI service rate limit exceeded. Please try again later.');
            }
            if (error.response?.status === 400) {
                throw new InternalServerErrorException(
                    `AI request error: ${error.response?.data?.error?.message || 'Invalid request'}`
                );
            }

            throw new InternalServerErrorException('AI service temporarily unavailable');
        }
    }

    /**
     * Gets available models.
     */
    async getAvailableModels(): Promise<string[]> {
        return AVAILABLE_MODELS;
    }

    /**
     * Validates if a model is available.
     */
    async isModelAvailable(modelId: string): Promise<boolean> {
        return AVAILABLE_MODELS.includes(modelId);
    }

    /**
     * Formats messages for OpenAI API format.
     */
    private formatMessages(messages: ChatMessage[]): Array<{ role: string; content: string }> {
        return messages.map(msg => ({
            role: msg.role,
            content: msg.content,
        }));
    }

    /**
     * Maps OpenAI finish reasons to standard FinishReason type.
     */
    private mapFinishReason(openaiReason: string): FinishReason {
        const mapping: Record<string, FinishReason> = {
            'stop': 'stop',
            'length': 'length',
            'content_filter': 'content_filter',
            'function_call': 'stop',
            'tool_calls': 'stop',
        };
        return mapping[openaiReason] || 'unknown';
    }
}
