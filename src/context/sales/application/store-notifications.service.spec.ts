import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StoreNotificationsService } from './store-notifications.service';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';
import {
  NOTIFICATION_LOG_REPOSITORY_PORT,
  NotificationLogRepository,
} from '../domain/ports/out/notification-log.repository';
import { EMAIL_SERVICE_PORT } from 'src/shared/infrastructure/email/email-service.port';
import { SALES_REPORTS_USECASE } from '../domain/ports/in/sales-reports.usecase';
import { Store } from '../domain/entities/store.entity';

describe('StoreNotificationsService', () => {
  let service: StoreNotificationsService;
  let storeRepository: jest.Mocked<StoreRepository>;
  let logRepository: jest.Mocked<NotificationLogRepository>;
  let emailService: { sendEmail: jest.Mock };

  const store = Store.create({
    name: 'Panadería',
    user_id: 'owner-1',
    currency: 'Bs',
  });

  const recipient = (user_id: string, notify: boolean) => ({
    user_id,
    name: user_id,
    avatar_url: null,
    email: `${user_id}@example.test`,
    notify,
  });

  beforeEach(async () => {
    storeRepository = {
      findById: jest.fn().mockResolvedValue(store),
      findNotificationRecipients: jest
        .fn()
        .mockResolvedValue([recipient('owner-1', true)]),
      setMemberNotify: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockImplementation(async (s: Store) => s),
      findUserSummary: jest
        .fn()
        .mockResolvedValue({ id: 'owner-1', name: 'Diego' }),
      findStoresWithDigest: jest.fn().mockResolvedValue([]),
    } as any;

    logRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      countSentSince: jest.fn().mockResolvedValue(0),
      findRetryable: jest.fn().mockResolvedValue([]),
      updateResult: jest.fn().mockResolvedValue(undefined),
    } as any;
    emailService = {
      sendEmail: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'test' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreNotificationsService,
        { provide: STORE_REPOSITORY_PORT, useValue: storeRepository },
        {
          provide: NOTIFICATION_LOG_REPOSITORY_PORT,
          useValue: logRepository,
        },
        { provide: EMAIL_SERVICE_PORT, useValue: emailService },
        {
          provide: SALES_REPORTS_USECASE,
          useValue: {
            summary: jest.fn().mockResolvedValue({
              sales_count: 3,
              units_sold: 5,
              revenue: 150,
              cost: 60,
              profit: 90,
              average_ticket: 50,
              range: { from: null, to: null },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StoreNotificationsService>(StoreNotificationsService);
  });

  describe('configuración', () => {
    it('rechaza a un miembro que no es el dueño', async () => {
      await expect(
        service.getConfig(store.getId(), 'member-2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('devuelve los grupos y los miembros al dueño', async () => {
      const config = await service.getConfig(store.getId(), 'owner-1');

      expect(config.events).toEqual({
        sales: false,
        receipts: false,
        store: false,
        members: false,
      });
      expect(config.digest).toBe(false);
      expect(config.members).toHaveLength(1);
    });

    it('rechaza ids de miembros que no son de la tienda', async () => {
      await expect(
        service.updateConfig(store.getId(), 'owner-1', {
          member_ids: ['ghost'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(storeRepository.setMemberNotify).not.toHaveBeenCalled();
    });

    it('guarda los grupos y los miembros seleccionados', async () => {
      await service.updateConfig(store.getId(), 'owner-1', {
        events: { sales: true },
        member_ids: ['owner-1'],
      });

      expect(storeRepository.update).toHaveBeenCalled();
      expect(storeRepository.setMemberNotify).toHaveBeenCalledWith(
        store.getId(),
        ['owner-1'],
      );
    });
  });

  describe('notify', () => {
    it('no hace nada si el grupo está apagado', async () => {
      await service.notify(store.getId(), 'sale_created', {
        subject: 's',
        title: 't',
        intro: 'i',
      });

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(logRepository.save).not.toHaveBeenCalled();
    });

    it('registra "skipped" cuando no hay destinatarios', async () => {
      storeRepository.findById.mockResolvedValue(
        store.withNotificationEvents({ sales: true }),
      );
      storeRepository.findNotificationRecipients.mockResolvedValue([
        recipient('owner-1', false),
      ]);

      await service.notify(store.getId(), 'sale_created', {
        subject: 's',
        title: 't',
        intro: 'i',
      });

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(logRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'skipped' }),
      );
    });

    it('envía un correo por destinatario e incluye quién lo provocó', async () => {
      storeRepository.findById.mockResolvedValue(
        store.withNotificationEvents({ sales: true }),
      );
      storeRepository.findNotificationRecipients.mockResolvedValue([
        recipient('owner-1', true),
        recipient('member-2', true),
      ]);

      await service.notify(store.getId(), 'sale_created', {
        subject: 'Nueva venta',
        title: 'Nueva venta',
        intro: 'intro',
        rows: [{ label: 'Total', value: '10 Bs' }],
        actor_id: 'member-2',
      });

      expect(emailService.sendEmail).toHaveBeenCalledTimes(2);

      const html = emailService.sendEmail.mock.calls[0][0].html as string;
      expect(html).toContain('Registrado por');
      expect(logRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'sent' }),
      );
    });

    it('nunca lanza si el SMTP falla (queda registrado)', async () => {
      storeRepository.findById.mockResolvedValue(
        store.withNotificationEvents({ sales: true }),
      );
      emailService.sendEmail.mockResolvedValue({
        success: false,
        error: 'SMTP down',
      });

      await expect(
        service.notify(store.getId(), 'sale_created', {
          subject: 's',
          title: 't',
          intro: 'i',
        }),
      ).resolves.toBeUndefined();

      expect(logRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', error: 'SMTP down' }),
      );
    });

    it('no envía si se alcanzó el tope por hora (anti-flood)', async () => {
      storeRepository.findById.mockResolvedValue(
        store.withNotificationEvents({ sales: true }),
      );
      logRepository.countSentSince.mockResolvedValue(100);

      await service.notify(store.getId(), 'sale_created', {
        subject: 's',
        title: 't',
        intro: 'i',
      });

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(logRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'skipped' }),
      );
    });

    it('incrusta el logo de la tienda como adjunto (cid) cuando hay foto', async () => {
      storeRepository.findById.mockResolvedValue(
        store
          .withPhotos('avatar', { medium: 'https://cdn.test/logo.jpg' })
          .withNotificationEvents({ sales: true }),
      );

      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      } as any);

      await service.notify(store.getId(), 'sale_created', {
        subject: 's',
        title: 't',
        intro: 'i',
      });

      expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/logo.jpg');

      const mail = emailService.sendEmail.mock.calls[0][0];
      expect(mail.html).toContain('cid:store-logo');
      expect(mail.attachments).toHaveLength(1);
      expect(mail.attachments[0].cid).toBe('store-logo');

      fetchMock.mockRestore();
    });
  });

  describe('resumen diario', () => {
    it('no envía nada si ninguna tienda lo tiene activado', async () => {
      storeRepository.findStoresWithDigest.mockResolvedValue([]);

      await service.sendDailyDigest();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('envía el resumen del día a los miembros seleccionados', async () => {
      storeRepository.findStoresWithDigest.mockResolvedValue([
        store.withNotificationDigest(true),
      ]);

      await service.sendDailyDigest();

      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);

      const mail = emailService.sendEmail.mock.calls[0][0];
      expect(mail.subject).toContain('Resumen del día');
      expect(mail.html).toContain('Ticket medio');
      expect(logRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'daily_digest', status: 'sent' }),
      );
    });
  });

  describe('reintentos', () => {
    it('reenvía un aviso fallido y actualiza el resultado', async () => {
      storeRepository.findById.mockResolvedValue(
        store.withNotificationEvents({ sales: true }),
      );
      logRepository.findRetryable.mockResolvedValue([
        {
          id: 'log-1',
          store_id: store.getId(),
          event: 'sale_created',
          subject: 'Nueva venta',
          recipients: ['owner-1@example.test'],
          payload: {
            subject: 'Nueva venta',
            title: 'Nueva venta',
            intro: 'intro',
          },
          attempts: 1,
          status: 'failed',
          error: 'SMTP down',
          created_at: new Date(),
        },
      ]);

      await service.retryFailed();

      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(logRepository.updateResult).toHaveBeenCalledWith(
        'log-1',
        'sent',
        null,
        2,
      );
    });

    it('marca como skipped un fallido sin datos para reconstruirlo', async () => {
      logRepository.findRetryable.mockResolvedValue([
        {
          id: 'log-2',
          store_id: store.getId(),
          event: 'sale_created',
          subject: 'x',
          recipients: [],
          payload: null,
          attempts: 1,
          status: 'failed',
          error: null,
          created_at: new Date(),
        },
      ]);

      await service.retryFailed();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(logRepository.updateResult).toHaveBeenCalledWith(
        'log-2',
        'skipped',
        'Missing data to retry',
        1,
      );
    });
  });
});
