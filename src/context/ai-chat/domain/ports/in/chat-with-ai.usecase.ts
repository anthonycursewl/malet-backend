import { AIChatResponse, ChatMessage } from '../../entities/ai-chat.entity';

export const CHAT_WITH_AI_USECASE = 'CHAT_WITH_AI_USECASE';

/**
 * Parameters for sending a chat message to AI
 */
export interface ChatWithAIParams {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Input port for AI Chat use case.
 * This interface defines the contract for chatting with AI models.
 */
export interface ChatWithAIUseCase {
  /**
   * Sends a message to the AI and receives a response.
   * @param userId - The authenticated user's ID
   * @param params - The chat parameters including messages and options
   * @returns A promise that resolves to the AI response
   */
  execute(userId: string, params: ChatWithAIParams): Promise<AIChatResponse>;

  /**
   * Gets available AI models for the user.
   * @param userId - The authenticated user's ID
   * @returns A list of available model identifiers
   */
  getAvailableModels(userId: string): Promise<string[]>;
}
