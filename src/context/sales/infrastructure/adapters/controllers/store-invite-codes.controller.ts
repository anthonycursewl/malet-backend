import {
  Controller,
  Delete,
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

@Controller('stores/:store_id/invites')
@UseGuards(JwtAuthGuard)
export class StoreInviteCodesController {
  constructor(
    @Inject(STORE_INVITES_USECASE)
    private readonly storeInvitesUseCase: StoreInvitesUseCase,
  ) {}

  /**
   * Generates the short-lived QR code (owner only). Calling it again rotates
   * the token and revokes the previous QR, so clients can poll it to keep the
   * displayed code fresh.
   */
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post()
  async generate(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
  ) {
    return this.storeInvitesUseCase.generate(store_id, user.userId);
  }

  /** Stops the current QR without generating a new one (owner only). */
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Delete()
  async revoke(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
  ) {
    return this.storeInvitesUseCase.revoke(store_id, user.userId);
  }
}
