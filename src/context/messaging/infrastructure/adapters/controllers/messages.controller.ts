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
  SEND_MESSAGE_USECASE,
  SendMessageUseCase,
} from '../../../domain/ports/in/send-message.usecase';
import {
  GET_MESSAGES_USECASE,
  GetMessagesUseCase,
} from '../../../domain/ports/in/get-messages.usecase';
import {
  MARK_AS_READ_USECASE,
  MarkAsReadUseCase,
} from '../../../domain/ports/in/mark-as-read.usecase';

// DTOs
import { SendMessageDto } from '../dtos/send-message.dto';

@Controller('conversations/:conversationId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    @Inject(SEND_MESSAGE_USECASE)
    private readonly sendMessageUseCase: SendMessageUseCase,
    @Inject(GET_MESSAGES_USECASE)
    private readonly getMessagesUseCase: GetMessagesUseCase,
    @Inject(MARK_AS_READ_USECASE)
    private readonly markAsReadUseCase: MarkAsReadUseCase,
  ) {}

  /**
   * Obtener mensajes de una conversación
   * GET /conversations/:conversationId/messages
   */
  @Get()
  async getMessages(
    @CurrentUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    const result = await this.getMessagesUseCase.execute(user.userId, {
      conversationId,
      limit: limit || 50,
      before: before ? new Date(before) : undefined,
      after: after ? new Date(after) : undefined,
    });

    return {
      messages: result.messages.map((m) => ({
        ...m.message.toPrimitives(),
        sender: m.sender,
      })),
      hasMore: result.hasMore,
      oldestMessageDate: result.oldestMessageDate,
      newestMessageDate: result.newestMessageDate,
    };
  }

  /**
   * Enviar un mensaje
   * POST /conversations/:conversationId/messages
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @CurrentUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    const result = await this.sendMessageUseCase.execute(user.userId, {
      conversationId,
      encryptedContent: dto.encryptedContent,
      encryptedKeys: dto.encryptedKeys,
      iv: dto.iv,
      tag: dto.tag,
      type: dto.type,
      replyToId: dto.replyToId,
    });

    return {
      message: result.message.toPrimitives(),
    };
  }

  /**
   * Marcar mensajes como leídos
   * POST /conversations/:conversationId/messages/read
   */
  @Post('read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
    @Body('messageId') messageId?: string,
  ) {
    const result = await this.markAsReadUseCase.execute(user.userId, {
      conversationId,
      messageId,
    });

    return {
      conversationId: result.conversationId,
      markedCount: result.markedCount,
      lastReadAt: result.lastReadAt,
    };
  }
}
