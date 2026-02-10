import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Application layer (use cases)
import { ChatWithAIService } from './application/chat-with-ai.service';

// Domain ports
import { CHAT_WITH_AI_USECASE } from './domain/ports/in/chat-with-ai.usecase';
import { AI_PROVIDER_REPOSITORY } from './domain/ports/out/ai-provider.repository';

// Infrastructure adapters
import { GeminiProviderAdapter } from './infrastructure/adapters/persistence/gemini-provider.adapter';
import { OpenAIProviderAdapter } from './infrastructure/adapters/persistence/openai-provider.adapter';
import { AIChatController } from './infrastructure/adapters/controllers/ai-chat.controller';

/**
 * AI Chat Context Module
 *
 * This module handles AI chat functionality for the mobile application.
 *
 * Features:
 * - Chat with AI models (Google Gemini by default)
 * - Support for multiple models (gemini-2.0-flash-exp, gemini-1.5-pro, etc.)
 * - JWT Authentication required
 * - AI-specific rate limiting
 *
 * Architecture:
 * - Input port: ChatWithAIUseCase (interface)
 * - Output port: AIProviderRepository (abstract class)
 * - Application service: ChatWithAIService
 * - Infrastructure adapter: GeminiProviderAdapter (default, swappable)
 *
 * Available Adapters:
 * - GeminiProviderAdapter (default) - Google Gemini API
 * - OpenAIProviderAdapter - OpenAI GPT models
 *
 * To use OpenAI instead of Gemini:
 * @example
 * ```typescript
 * {
 *   provide: AI_PROVIDER_REPOSITORY,
 *   useClass: OpenAIProviderAdapter,
 * }
 * ```
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [AIChatController],
  providers: [
    {
      provide: AI_PROVIDER_REPOSITORY,
      useClass: GeminiProviderAdapter,
    },
    {
      provide: CHAT_WITH_AI_USECASE,
      useClass: ChatWithAIService,
    },

    ChatWithAIService,
    GeminiProviderAdapter,
    OpenAIProviderAdapter,
  ],
  exports: [CHAT_WITH_AI_USECASE, AI_PROVIDER_REPOSITORY, ChatWithAIService],
})
export class AIChatModule {}
