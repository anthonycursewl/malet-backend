import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  STORE_NOTIFICATIONS_USECASE,
  StoreNotificationsUseCase,
} from '../domain/ports/in/store-notifications.usecase';

/**
 * Tareas programadas de los avisos por email.
 *
 * - **Resumen diario** a las 21:00 (hora del servidor) para las tiendas que lo
 *   tengan activado.
 * - **Reintentos** cada 10 minutos de los envíos que fallaron (máx. 3 intentos).
 */
@Injectable()
export class StoreNotificationsScheduler {
  private readonly logger = new Logger(StoreNotificationsScheduler.name);

  constructor(
    @Inject(STORE_NOTIFICATIONS_USECASE)
    private readonly notifications: StoreNotificationsUseCase,
  ) {}

  @Cron('0 0 21 * * *')
  async sendDailyDigest(): Promise<void> {
    try {
      await this.notifications.sendDailyDigest();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`El resumen diario falló: ${message}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryFailedNotifications(): Promise<void> {
    try {
      await this.notifications.retryFailed();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`El reintento de avisos falló: ${message}`);
    }
  }
}
