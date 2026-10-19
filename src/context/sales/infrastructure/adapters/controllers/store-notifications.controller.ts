import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  STORES_USECASE,
  StoresUseCase,
} from '../../../domain/ports/in/stores.usecase';
import {
  STORE_NOTIFICATIONS_USECASE,
  StoreNotificationsUseCase,
} from '../../../domain/ports/in/store-notifications.usecase';
import { UpdateStoreNotificationsDto } from '../../../application/dtos/update-store-notifications.dto';

/**
 * Avisos por email de la tienda: qué se avisa y a qué miembros.
 * Cualquier miembro pasa el filtro de membresía, pero el servicio exige que
 * sea **el dueño** (el payload incluye los emails de los miembros).
 */
@Controller('stores/:store_id/notifications')
@UseGuards(JwtAuthGuard)
export class StoreNotificationsController {
  constructor(
    @Inject(STORES_USECASE)
    private readonly storesUseCase: StoresUseCase,
    @Inject(STORE_NOTIFICATIONS_USECASE)
    private readonly notificationsUseCase: StoreNotificationsUseCase,
  ) {}

  @Get()
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
  ) {
    await this.storesUseCase.getMemberStore(store_id, user.userId);
    return this.notificationsUseCase.getConfig(store_id, user.userId);
  }

  @Put()
  async update(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Body() dto: UpdateStoreNotificationsDto,
  ) {
    await this.storesUseCase.getMemberStore(store_id, user.userId);
    return this.notificationsUseCase.updateConfig(
      store_id,
      user.userId,
      dto,
    );
  }
}
