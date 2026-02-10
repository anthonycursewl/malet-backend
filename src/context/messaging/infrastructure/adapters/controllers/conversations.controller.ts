import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

// Use Cases
import {
  CREATE_CONVERSATION_USECASE,
  CreateConversationUseCase,
} from '../../../domain/ports/in/create-conversation.usecase';
import {
  GET_CONVERSATIONS_USECASE,
  GetConversationsUseCase,
} from '../../../domain/ports/in/get-conversations.usecase';

// DTOs
import {
  CreatePrivateConversationDto,
  CreateCommunityConversationDto,
} from '../dtos/create-conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    @Inject(CREATE_CONVERSATION_USECASE)
    private readonly createConversationUseCase: CreateConversationUseCase,
    @Inject(GET_CONVERSATIONS_USECASE)
    private readonly getConversationsUseCase: GetConversationsUseCase,
  ) {}

  /**
   * Obtener lista de conversaciones
   * GET /conversations
   */
  @Get()
  async getConversations(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: 'private' | 'community' | 'all',
  ) {
    const result = await this.getConversationsUseCase.execute(user.userId, {
      page,
      limit,
      type,
    });

    return {
      conversations: result.conversations.map((c) => ({
        ...c.conversation.toPrimitives(),
        participants: c.participants,
        lastMessage: c.lastMessage,
        unreadCount: c.unreadCount,
      })),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
    };
  }

  /**
   * Obtener una conversación específica
   * GET /conversations/:id
   */
  @Get(':id')
  async getConversation(
    @CurrentUser() user: { userId: string },
    @Param('id') conversationId: string,
  ) {
    const result = await this.getConversationsUseCase.getById(
      user.userId,
      conversationId,
    );

    if (!result) {
      return { conversation: null };
    }

    return {
      conversation: {
        ...result.conversation.toPrimitives(),
        participants: result.participants,
        lastMessage: result.lastMessage,
        unreadCount: result.unreadCount,
      },
    };
  }

  /**
   * Crear conversación privada
   * POST /conversations/private
   */
  @Post('private')
  @HttpCode(HttpStatus.OK)
  async createPrivate(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreatePrivateConversationDto,
  ) {
    const result = await this.createConversationUseCase.createPrivate(
      user.userId,
      {
        participantUserId: dto.participantUserId,
      },
    );

    return {
      conversation: result.conversation.toPrimitives(),
      participants: result.participants.map((p) => p.toPrimitives()),
      isNew: result.isNew,
    };
  }

  /**
   * Crear conversación de comunidad
   * POST /conversations/community
   */
  @Post('community')
  @HttpCode(HttpStatus.CREATED)
  async createForCommunity(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCommunityConversationDto,
  ) {
    const result = await this.createConversationUseCase.createForCommunity(
      user.userId,
      {
        communityId: dto.communityId,
        name: dto.name || '',
        avatarUrl: dto.avatarUrl,
      },
    );

    return {
      conversation: result.conversation.toPrimitives(),
      participants: result.participants.map((p) => p.toPrimitives()),
      isNew: result.isNew,
    };
  }
}
