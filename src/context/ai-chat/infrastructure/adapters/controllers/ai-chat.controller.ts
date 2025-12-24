import {
    Controller,
    Post,
    Get,
    Body,
    HttpCode,
    HttpStatus,
    Inject,
    UseGuards,
    Logger
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CHAT_WITH_AI_USECASE, ChatWithAIUseCase } from '../../../domain/ports/in/chat-with-ai.usecase';
import { AIChatRequestDto } from '../dtos/ai-chat.dto';
import { AIRateLimit } from 'src/shared/common/decorators/ai-rate-limit.decorator';

/**
 * AI Chat Controller
 * 
 * Handles AI chat interactions from the mobile interface.
 * Protected by JWT authentication and specific AI rate limits.
 * 
 * Security Features:
 * - JWT Authentication required
 * - AI-specific rate limiting (20 requests/minute by default)
 * - Input validation via DTOs
 * 
 * @example
 * POST /ai/chat
 * Headers: { Authorization: "Bearer <jwt_token>" }
 * Body: { "messages": [{ "role": "user", "content": "Hello" }] }
 */
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIChatController {
    private readonly logger = new Logger('AIChatController');

    constructor(
        @Inject(CHAT_WITH_AI_USECASE)
        private readonly chatWithAIUseCase: ChatWithAIUseCase,
    ) { }

    /**
     * Send a message to the AI and receive a response.
     * 
     * @param user - Current authenticated user from JWT
     * @param dto - Chat request with messages and optional configuration
     * @returns AI response with generated content and usage stats
     * 
     * @example Response:
     * {
     *   "id": "chatcmpl-xxx",
     *   "content": "Hello! I'm doing well...",
     *   "model": "gemini-1.5-flash",
     *   "usage": {
     *     "promptTokens": 15,
     *     "completionTokens": 25,
     *     "totalTokens": 40
     *   },
     *   "finishReason": "stop",
     *   "createdAt": "2024-01-15T10:30:00Z"
     * }
     */
    @Post('chat')
    @HttpCode(HttpStatus.OK)
    @AIRateLimit()
    async chat(
        @CurrentUser() user: { userId: string; email: string },
        @Body() dto: AIChatRequestDto
    ) {
        this.logger.log(`📨 AI Chat request from user: ${user.userId}`);

        const response = await this.chatWithAIUseCase.execute(user.userId, {
            messages: dto.messages,
            model: dto.model,
            maxTokens: dto.maxTokens,
            temperature: dto.temperature,
            stream: dto.stream,
        });

        return response.toPrimitives();
    }

    /**
     * Get available AI models for the current user.
     * 
     * @param user - Current authenticated user from JWT
     * @returns List of available model identifiers
     * 
     * @example Response:
     * {
     *   "models": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"]
     * }
     */
    @Get('models')
    @HttpCode(HttpStatus.OK)
    async getModels(
        @CurrentUser() user: { userId: string }
    ) {
        const models = await this.chatWithAIUseCase.getAvailableModels(user.userId);

        return {
            models,
            default: 'gemini-2.5-flash',
        };
    }

    /**
     * Health check for AI service.
     * Useful for mobile apps to check service availability.
     * 
     * @returns Service status
     */
    @Get('health')
    @HttpCode(HttpStatus.OK)
    async health() {
        return {
            status: 'ok',
            service: 'ai-chat',
            timestamp: new Date().toISOString(),
        };
    }
}
