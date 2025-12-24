import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AIProviderRepository } from '../../../domain/ports/out/ai-provider.repository';
import { AIChatRequest, AIChatResponse, ChatMessage, FinishReason } from '../../../domain/entities/ai-chat.entity';
import { AIRateLimitException, AIServiceException, AIContentFilterException } from '../../../domain/exceptions/ai.exceptions';
import { randomUUID } from 'crypto';

/**
 * Available Gemini models (as of Dec 2024)
 * @see https://ai.google.dev/gemini-api/docs/models/gemini
 */
const AVAILABLE_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
];

/**
 * Google Gemini Provider Adapter
 * 
 * Implements the AIProviderRepository interface for Google Gemini API.
 * Uses the Gemini API v1beta with the generateContent endpoint.
 * 
 * @see https://ai.google.dev/api/rest/v1beta/models/generateContent
 */
@Injectable()
export class GeminiProviderAdapter extends AIProviderRepository {
    private readonly logger = new Logger('GeminiProvider');
    private readonly apiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    private readonly apiKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        super();
        this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';

        if (!this.apiKey) {
            this.logger.warn('⚠️ GEMINI_API_KEY not configured. AI Chat will not work.');
        }
    }

    /**
     * Sends a chat completion request to Google Gemini.
     */
    async chat(request: AIChatRequest): Promise<AIChatResponse> {
        if (!this.apiKey) {
            throw new InternalServerErrorException('AI service not configured');
        }

        const model = request.getModel();
        const url = `${this.apiBaseUrl}/${model}:generateContent?key=${this.apiKey}`;

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    url,
                    {
                        contents: this.formatMessages(request.getMessages()),
                        generationConfig: {
                            maxOutputTokens: request.getMaxTokens(),
                            temperature: request.getTemperature(),
                        },
                        safetySettings: [
                            {
                                category: 'HARM_CATEGORY_HARASSMENT',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                            },
                            {
                                category: 'HARM_CATEGORY_HATE_SPEECH',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                            },
                            {
                                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                            },
                            {
                                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                            }
                        ]
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 60000,
                    }
                )
            );

            const data = response.data;

            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const rawFinishReason = data.candidates?.[0]?.finishReason || 'STOP';
            const finishReason = this.mapFinishReason(rawFinishReason);

            const truncated = finishReason === 'length';

            const usage = data.usageMetadata || {};

            this.logger.log(
                `📊 Gemini response: finishReason=${rawFinishReason}, ` +
                `promptTokens=${usage.promptTokenCount || 0}, ` +
                `completionTokens=${usage.candidatesTokenCount || 0}, ` +
                `truncated=${truncated}`
            );

            if (truncated) {
                this.logger.warn(
                    `⚠️ Response truncated! Used ${usage.candidatesTokenCount} tokens. ` +
                    `Consider increasing maxTokens (current: ${request.getMaxTokens()})`
                );
            }

            return new AIChatResponse({
                id: randomUUID(),
                content,
                model: model,
                usage: {
                    promptTokens: usage.promptTokenCount || 0,
                    completionTokens: usage.candidatesTokenCount || 0,
                    totalTokens: usage.totalTokenCount || 0,
                },
                finishReason,
                truncated,
                createdAt: new Date(),
            });

        } catch (error) {
            const errorMessage = error.response?.data?.error?.message || error.message;
            this.logger.error(`Gemini API error: ${errorMessage}`);

            if (error.response?.status === 400) {
                throw new AIServiceException(
                    'AI_BAD_REQUEST',
                    `AI request error: ${errorMessage}`
                );
            }
            if (error.response?.status === 403) {
                throw new AIServiceException(
                    'AI_AUTH_FAILED',
                    'AI service authentication failed. Check GEMINI_API_KEY.'
                );
            }
            if (error.response?.status === 429) {
                const retrySeconds = this.extractRetrySeconds(errorMessage);

                this.logger.warn(
                    `⏱️ Rate limit hit! Retry after ${retrySeconds} seconds`
                );

                throw new AIRateLimitException(
                    retrySeconds,
                    'Has alcanzado el límite de solicitudes. Por favor espera un momento.'
                );
            }
            if (error.response?.status === 503) {
                throw new AIServiceException(
                    'AI_OVERLOADED',
                    'AI service temporarily overloaded. Please try again.'
                );
            }

            throw new AIServiceException(
                'AI_UNAVAILABLE',
                'AI service temporarily unavailable'
            );
        }
    }

    /**
     * Extracts retry seconds from Gemini error message.
     * Example: "Please retry in 57.634941041s."
     */
    private extractRetrySeconds(errorMessage: string): number {
        const match = errorMessage.match(/retry in\s+([\d.]+)s/i);

        if (match && match[1]) {
            const seconds = parseFloat(match[1]);
            return Math.ceil(seconds);
        }

        return 60;
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
     * Formats messages for Gemini API format.
     * Gemini uses a different format than OpenAI:
     * - "user" and "model" roles instead of "user", "assistant", "system"
     * - System messages are prepended to the first user message
     */
    private formatMessages(messages: ChatMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> {
        const formattedMessages: Array<{ role: string; parts: Array<{ text: string }> }> = [];
        let systemPrompt = '';

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt += msg.content + '\n\n';
                continue;
            }

            const role = msg.role === 'assistant' ? 'model' : 'user';
            let content = msg.content;

            if (role === 'user' && systemPrompt && formattedMessages.length === 0) {
                content = `${systemPrompt}${content}`;
                systemPrompt = '';
            }

            formattedMessages.push({
                role,
                parts: [{ text: content }]
            });
        }

        if (formattedMessages.length === 0 && systemPrompt) {
            formattedMessages.push({
                role: 'user',
                parts: [{ text: systemPrompt.trim() }]
            });
        }

        return formattedMessages;
    }

    /**
     * Maps Gemini finish reasons to standard FinishReason type.
     */
    private mapFinishReason(geminiReason: string): FinishReason {
        const mapping: Record<string, FinishReason> = {
            'STOP': 'stop',
            'MAX_TOKENS': 'length',
            'SAFETY': 'content_filter',
            'RECITATION': 'content_filter',
            'OTHER': 'unknown',
            'FINISH_REASON_UNSPECIFIED': 'unknown',
        };
        return mapping[geminiReason] || 'unknown';
    }
}
