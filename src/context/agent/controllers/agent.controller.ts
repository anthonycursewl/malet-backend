import { Body, Controller, Post, Inject, UseGuards } from '@nestjs/common';
import { MessageDto } from '../dtos/message.dto';
import { AgentService } from '../services/agent.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('message')
  async message(
    @CurrentUser() user: { userId: string },
    @Body() body: MessageDto,
  ) {
    return this.agentService.handleMessage(user, body.text, body.sessionId);
  }
}
