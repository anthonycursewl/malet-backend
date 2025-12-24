import { AIChatRequest, AIChatResponse } from '../../entities/ai-chat.entity';

export const AI_PROVIDER_REPOSITORY = 'AI_PROVIDER_REPOSITORY';

/**
 * Output port for AI Provider integration.
 * This abstract class defines the contract for any AI provider adapter.
 * 
 * Implementations can be:
 * - OpenAI (GPT-4, GPT-4o)
 * - Anthropic (Claude)
 * - Google (Gemini)
 * - Any other compatible provider
 */
export abstract class AIProviderRepository {
    /**
     * Sends a chat completion request to the AI provider.
     * @param request - The chat request with messages and configuration
     * @returns A promise that resolves to the AI response
     */
    abstract chat(request: AIChatRequest): Promise<AIChatResponse>;

    /**
     * Gets available models from the provider.
     * @returns A list of available model identifiers
     */
    abstract getAvailableModels(): Promise<string[]>;

    /**
     * Validates if a model is available.
     * @param modelId - The model identifier to validate
     * @returns True if the model is available
     */
    abstract isModelAvailable(modelId: string): Promise<boolean>;
}
