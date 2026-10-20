import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  EMAIL_SERVICE_PORT,
  EmailAttachment,
  EmailServicePort,
} from 'src/shared/infrastructure/email/email-service.port';
import { EmailTemplates } from 'src/shared/infrastructure/email/email-templates';
import {
  EVENT_GROUP,
  NOTIFICATION_GROUPS,
  NotificationGroup,
  StoreNotificationEvent,
} from '../domain/constants';
import { Store } from '../domain/entities/store.entity';
import {
  SALES_REPORTS_USECASE,
  SalesReportsUseCase,
} from '../domain/ports/in/sales-reports.usecase';
import {
  StoreNotificationPayload,
  StoreNotificationsConfig,
  StoreNotificationsUseCase,
} from '../domain/ports/in/store-notifications.usecase';
import {
  NOTIFICATION_LOG_REPOSITORY_PORT,
  NotificationLogPayload,
  NotificationLogRepository,
  NotificationLogStatus,
} from '../domain/ports/out/notification-log.repository';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';
import { UpdateStoreNotificationsDto } from './dtos/update-store-notifications.dto';

/** Tope anti-flood: correos correctos por tienda y hora. */
const MAX_EMAILS_PER_HOUR = 100;
/** Ventana en la que se reintenta un envío fallido. */
const RETRY_WINDOW_HOURS = 6;
/** Intentos máximos por aviso (el primero + 2 reintentos). */
const MAX_ATTEMPTS = 3;
/** Evento del resumen diario (no pertenece a ningún grupo). */
const DIGEST_EVENT = 'daily_digest';
/** Identificador del logo incrustado en el correo. */
const LOGO_CID = 'store-logo';

/**
 * Avisos por email de una tienda.
 *
 * El **dueño** decide qué grupos de eventos se avisan y a qué miembros llegan
 * (flag `notify` del miembro). El envío es *fire-and-forget*: `notify()` nunca
 * lanza, así que un fallo del SMTP jamás tumba la venta ni la acción de negocio
 * (queda registrado en `store_notification_logs`, que además permite reintentar).
 */
@Injectable()
export class StoreNotificationsService implements StoreNotificationsUseCase {
  private readonly logger = new Logger(StoreNotificationsService.name);

  constructor(
    @Inject(STORE_REPOSITORY_PORT)
    private readonly storeRepository: StoreRepository,
    @Inject(NOTIFICATION_LOG_REPOSITORY_PORT)
    private readonly logRepository: NotificationLogRepository,
    @Inject(EMAIL_SERVICE_PORT)
    private readonly emailService: EmailServicePort,
    @Inject(SALES_REPORTS_USECASE)
    private readonly salesReports: SalesReportsUseCase,
  ) {}

  async getConfig(
    store_id: string,
    user_id: string,
  ): Promise<StoreNotificationsConfig> {
    const store = await this.assertOwner(store_id, user_id);
    const members =
      await this.storeRepository.findNotificationRecipients(store_id);

    return {
      events: store.getNotificationEvents(),
      digest: store.sendsDailyDigest(),
      // Solo los seleccionados: la lista completa se pagina aparte en el cliente.
      members: members.filter((member) => member.notify),
    };
  }

  async updateConfig(
    store_id: string,
    user_id: string,
    dto: UpdateStoreNotificationsDto,
  ): Promise<StoreNotificationsConfig> {
    const store = await this.assertOwner(store_id, user_id);

    // Los cambios de la tienda se encadenan sobre la misma entidad para no
    // pisarse entre sí (cada `with...` parte del estado anterior).
    let updated = store;

    if (dto.events) {
      // Solo los grupos conocidos y con valor booleano (el DTO llega como objeto plano).
      const events: Partial<Record<NotificationGroup, boolean>> = {};
      for (const group of NOTIFICATION_GROUPS) {
        if (dto.events[group] !== undefined) {
          events[group] = dto.events[group] === true;
        }
      }

      if (Object.keys(events).length > 0) {
        updated = updated.withNotificationEvents(events);
      }
    }

    if (dto.digest !== undefined) {
      updated = updated.withNotificationDigest(dto.digest);
    }

    if (updated !== store) {
      await this.storeRepository.update(updated);
    }

    if (dto.member_ids) {
      const members =
        await this.storeRepository.findNotificationRecipients(store_id);
      const known = new Set(members.map((member) => member.user_id));
      const unknown = dto.member_ids.filter((id) => !known.has(id));

      if (unknown.length > 0) {
        throw new BadRequestException(
          'There are members that do not belong to this store',
        );
      }

      await this.storeRepository.setMemberNotify(store_id, [
        ...new Set(dto.member_ids),
      ]);
    }

    return this.getConfig(store_id, user_id);
  }

  async notify(
    store_id: string,
    event: StoreNotificationEvent,
    payload: StoreNotificationPayload,
  ): Promise<void> {
    try {
      const store = await this.storeRepository.findById(store_id);
      if (!store || !store.notifiesGroup(EVENT_GROUP[event])) {
        return;
      }

      const recipients = await this.selectedEmails(store_id);
      if (recipients.length === 0) {
        await this.log(store_id, event, payload, [], 'skipped');
        return;
      }

      await this.deliver(store, event, payload, recipients);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo avisar "${event}" de la tienda ${store_id}: ${message}`,
      );
      // El propio log puede fallar: tampoco debe romper la acción de negocio.
      await this.log(store_id, event, payload, [], 'failed', message).catch(
        () => undefined,
      );
    }
  }

  /** Resumen diario de ventas de todas las tiendas que lo tengan activado. */
  async sendDailyDigest(): Promise<void> {
    const stores = await this.storeRepository.findStoresWithDigest();

    for (const store of stores) {
      try {
        const recipients = await this.selectedEmails(store.getId());
        if (recipients.length === 0) continue;

        const summary = await this.salesReports.summary({
          store_id: store.getId(),
          preset: 'today',
        });

        // Un día sin ventas no merece un correo.
        if (summary.sales_count === 0) continue;

        const currency = store.getCurrency();

        await this.deliver(
          store,
          DIGEST_EVENT,
          {
            subject: `${store.getName()} · Resumen del día`,
            title: 'Resumen de ventas del día',
            intro: `Estas son las ventas de hoy en "${store.getName()}".`,
            rows: [
              { label: 'Ventas', value: String(summary.sales_count) },
              { label: 'Unidades', value: String(summary.units_sold) },
              {
                label: 'Ingresos',
                value: `${summary.revenue.toFixed(2)} ${currency}`,
              },
              {
                label: 'Ganancia',
                value: `${summary.profit.toFixed(2)} ${currency}`,
              },
              {
                label: 'Ticket medio',
                value: `${summary.average_ticket.toFixed(2)} ${currency}`,
              },
            ],
            footerNote: 'Resumen diario activado por el dueño de la tienda.',
          },
          recipients,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `El resumen diario falló para la tienda ${store.getId()}: ${message}`,
        );
      }
    }
  }

  /** Reintenta los avisos que fallaron (máximo 3 intentos por aviso). */
  async retryFailed(): Promise<void> {
    const since = new Date(Date.now() - RETRY_WINDOW_HOURS * 60 * 60 * 1000);
    const entries = await this.logRepository.findRetryable(since, MAX_ATTEMPTS);

    for (const entry of entries) {
      try {
        const store = await this.storeRepository.findById(entry.store_id);

        if (!store || !entry.payload || entry.recipients.length === 0) {
          await this.logRepository.updateResult(
            entry.id,
            'skipped',
            'Missing data to retry',
            entry.attempts,
          );
          continue;
        }

        const logo = await this.logoFor(store);

        const template = EmailTemplates.storeEvent({
          subject: entry.payload.subject,
          storeName: store.getName(),
          storeLogoUrl: logo.src,
          title: entry.payload.title,
          intro: entry.payload.intro,
          rows: await this.withActor(entry.payload),
          footerNote: entry.payload.footerNote,
        });

        const error = await this.sendTo(
          entry.recipients,
          template,
          store.getEmail(),
          logo.attachments,
        );

        await this.logRepository.updateResult(
          entry.id,
          error === null ? 'sent' : 'failed',
          error,
          entry.attempts + 1,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Reintento fallido del aviso ${entry.id}: ${message}`,
        );
      }
    }
  }

  /** Envía el aviso a los destinatarios (un correo por persona) y lo registra. */
  private async deliver(
    store: Store,
    event: string,
    payload: StoreNotificationPayload,
    recipients: string[],
  ): Promise<void> {
    // Anti-flood: tope de correos por tienda y hora.
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const alreadySent = await this.logRepository.countSentSince(
      store.getId(),
      since,
    );

    if (alreadySent + recipients.length > MAX_EMAILS_PER_HOUR) {
      await this.log(
        store.getId(),
        event,
        payload,
        recipients,
        'skipped',
        'Hourly email limit reached',
      );
      return;
    }

    const logo = await this.logoFor(store);

    const template = EmailTemplates.storeEvent({
      subject: payload.subject,
      storeName: store.getName(),
      storeLogoUrl: logo.src,
      title: payload.title,
      intro: payload.intro,
      rows: await this.withActor(payload),
      footerNote: payload.footerNote,
    });

    const error = await this.sendTo(
      recipients,
      template,
      store.getEmail(),
      logo.attachments,
    );

    await this.log(
      store.getId(),
      event,
      payload,
      recipients,
      error === null ? 'sent' : 'failed',
      error,
    );
  }

  /**
   * Envía el correo a cada destinatario por separado (los miembros no ven los
   * emails de los demás). Devuelve el primer error o `null` si todo fue bien.
   */
  private async sendTo(
    recipients: string[],
    template: { subject: string; html: string; text: string },
    replyTo: string | null,
    attachments: EmailAttachment[] = [],
  ): Promise<string | null> {
    let firstError: string | null = null;

    for (const to of recipients) {
      const result = await this.emailService.sendEmail({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: replyTo ?? undefined,
        attachments,
      });

      if (!result.success && firstError === null) {
        firstError = result.error ?? 'Unknown SMTP error';
      }
    }

    return firstError;
  }

  /** Emails de los miembros seleccionados por el dueño. */
  private async selectedEmails(store_id: string): Promise<string[]> {
    const members =
      await this.storeRepository.findNotificationRecipients(store_id);

    return members
      .filter((member) => member.notify && member.email.length > 0)
      .map((member) => member.email);
  }

  /** Foto de la tienda para el encabezado del correo (o `null`). */
  private storeLogo(store: Store): string | null {
    const photos = store.getPhotos('avatar');
    return photos.medium ?? photos.small ?? photos.large ?? null;
  }

  /**
   * Descarga la foto de la tienda para incrustarla en el correo (`cid`): así el
   * logo se ve aunque el cliente de correo bloquee las imágenes remotas. Si la
   * descarga falla, se deja la URL pública como respaldo.
   */
  private async logoFor(store: Store): Promise<{
    src: string | null;
    attachments: EmailAttachment[];
  }> {
    const url = this.storeLogo(store);
    if (!url) return { src: null, attachments: [] };

    try {
      const response = await fetch(url);
      if (!response.ok) return { src: url, attachments: [] };

      return {
        src: `cid:${LOGO_CID}`,
        attachments: [
          {
            filename: 'logo.jpg',
            content: Buffer.from(await response.arrayBuffer()),
            cid: LOGO_CID,
          },
        ],
      };
    } catch {
      return { src: url, attachments: [] };
    }
  }

  /**
   * Filas del correo, añadiendo quién provocó el evento cuando se conoce.
   * Si la consulta del usuario falla, el aviso sale igual (sin esa fila).
   */
  private async withActor(
    payload: NotificationLogPayload,
  ): Promise<{ label: string; value: string }[] | undefined> {
    const rows = payload.rows ?? [];

    if (!payload.actor_id) {
      return rows.length > 0 ? rows : undefined;
    }

    try {
      const actor = await this.storeRepository.findUserSummary(
        payload.actor_id,
      );
      if (actor?.name) {
        return [...rows, { label: 'Registrado por', value: actor.name }];
      }
    } catch {
      // Sin nombre del autor: el aviso se envía igual.
    }

    return rows.length > 0 ? rows : undefined;
  }

  /** Solo el dueño ve o cambia los avisos (el payload incluye emails). */
  private async assertOwner(store_id: string, user_id: string): Promise<Store> {
    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    if (store.getUserId() !== user_id) {
      throw new ForbiddenException(
        'Only the store owner can manage the email notifications',
      );
    }
    return store;
  }

  private async log(
    store_id: string,
    event: string,
    payload: StoreNotificationPayload,
    recipients: string[],
    status: NotificationLogStatus,
    error: string | null = null,
  ): Promise<void> {
    await this.logRepository.save({
      id: randomUUID(),
      store_id,
      event,
      subject: payload.subject.slice(0, 255),
      recipients,
      payload: {
        subject: payload.subject,
        title: payload.title,
        intro: payload.intro,
        rows: payload.rows,
        footerNote: payload.footerNote,
        actor_id: payload.actor_id ?? null,
      },
      attempts: 1,
      status,
      error: error === null ? null : error.slice(0, 500),
      created_at: new Date(),
    });
  }
}
