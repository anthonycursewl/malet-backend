import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { PushRequestDto } from '../dtos/push-sync.dto';
import { PullQueryDto } from '../dtos/pull-sync.dto';
import {
  PushResponse,
  PullResponse,
  SyncEntityType,
} from '../../../domain/entities/sync.entity';
import {
  PULL_SYNC_USECASE,
  PullSyncUseCase,
  PUSH_SYNC_USECASE,
  PushSyncUseCase,
} from '../../../domain/ports/in/sync.usecase';
import { Inject } from '@nestjs/common';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(
    @Inject(PUSH_SYNC_USECASE)
    private readonly pushUseCase: PushSyncUseCase,
    @Inject(PULL_SYNC_USECASE)
    private readonly pullUseCase: PullSyncUseCase,
  ) {}

  @Post('push')
  async push(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: PushRequestDto,
  ): Promise<PushResponse> {
    // userId SIEMPRE desde el JWT. Se ignora body.user_id.
    return this.pushUseCase.execute(user.userId, body.ops as any);
  }

  @Get(':entity/pull')
  async pull(
    @CurrentUser() user: { userId: string; email: string },
    @Param('entity') entity: SyncEntityType,
    @Query() query: PullQueryDto,
  ): Promise<PullResponse> {
    return this.pullUseCase.execute(
      user.userId,
      entity,
      query.cursor,
      query.limit ?? 100,
    );
  }
}
