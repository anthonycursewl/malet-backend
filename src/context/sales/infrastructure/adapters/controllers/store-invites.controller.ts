import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  STORE_INVITES_USECASE,
  StoreInvitesUseCase,
} from '../../../domain/ports/in/store-invites.usecase';

@Controller('store-invites')
@UseGuards(JwtAuthGuard)
export class StoreInvitesController {
  constructor(
    @Inject(STORE_INVITES_USECASE)
    private readonly storeInvitesUseCase: StoreInvitesUseCase,
  ) {}

  /** Consent screen data: who invites you and to which store. */
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':token')
  async preview(@Param('token') token: string) {
    return this.storeInvitesUseCase.preview(token);
  }

  /** Accepts the invitation and joins the store (the token is single use). */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':token/accept')
  async accept(
    @CurrentUser() user: { userId: string },
    @Param('token') token: string,
  ) {
    const member = await this.storeInvitesUseCase.accept(token, user.userId);
    return member.toPrimitives();
  }
}
