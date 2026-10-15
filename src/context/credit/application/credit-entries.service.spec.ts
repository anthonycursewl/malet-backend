import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreditEntriesService } from './credit-entries.service';
import {
  CREDIT_ENTRY_REPOSITORY_PORT,
  CreditEntryRepository,
} from '../domain/ports/out/credit-entry.repository';
import { CreditEntry } from '../domain/entities/credit-entry.entity';
import {
  ACCOUNT_REPOSITORY_PORT,
  AccountRepository,
} from '../../wallet/domain/ports/out/account.repository';
import {
  SAVE_TRANSACTION_USECASE,
  SaveTransactionUseCase,
} from '../../wallet/domain/ports/in/save-transaction.usecase';
import {
  DELETE_TRANSACTION_USECASE,
  DeleteTransactionUseCase,
} from '../../wallet/domain/ports/in/delete-transaction.usecase';

describe('CreditEntriesService', () => {
  let service: CreditEntriesService;
  let creditRepository: jest.Mocked<CreditEntryRepository>;
  let accountRepository: jest.Mocked<AccountRepository>;
  let saveTransaction: jest.Mocked<SaveTransactionUseCase>;
  let deleteTransaction: jest.Mocked<DeleteTransactionUseCase>;

  const ownedAccount = {
    getId: () => 'acc-1',
    getUserId: () => 'user-1',
  } as any;

  const walletTransaction = {
    getId: () => 'M-abc123',
    getIndexId: () => BigInt('1234567890'),
  } as any;

  const dueDate = '2026-10-15';

  const pendingReceivable = (
    overrides: Partial<Parameters<typeof CreditEntry.create>[0]> = {},
  ) =>
    CreditEntry.create({
      user_id: 'user-1',
      type: 'receivable',
      concept: 'Cobro de alquiler',
      amount: 150,
      due_date: new Date(Date.UTC(2026, 9, 15)),
      ...overrides,
    });

  beforeEach(async () => {
    creditRepository = {
      save: jest.fn().mockImplementation(async (entry: CreditEntry) => entry),
      findById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findMonth: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(async (entry: CreditEntry) => entry),
      delete: jest.fn().mockImplementation(async (entry: CreditEntry) => entry),
      restore: jest
        .fn()
        .mockImplementation(async (entry: CreditEntry) => entry),
      hardDelete: jest.fn().mockResolvedValue(undefined),
    } as any;

    accountRepository = {
      findById: jest.fn().mockResolvedValue(ownedAccount),
    } as any;

    saveTransaction = {
      execute: jest.fn().mockResolvedValue(walletTransaction),
    } as any;

    deleteTransaction = {
      execute: jest.fn().mockResolvedValue(walletTransaction),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditEntriesService,
        {
          provide: CREDIT_ENTRY_REPOSITORY_PORT,
          useValue: creditRepository,
        },
        { provide: ACCOUNT_REPOSITORY_PORT, useValue: accountRepository },
        { provide: SAVE_TRANSACTION_USECASE, useValue: saveTransaction },
        { provide: DELETE_TRANSACTION_USECASE, useValue: deleteTransaction },
      ],
    }).compile();

    service = module.get<CreditEntriesService>(CreditEntriesService);
  });

  describe('create', () => {
    it('creates a pending entry with the account assigned and due date at UTC midnight', async () => {
      const entry = await service.create('user-1', {
        type: 'payable',
        concept: 'Pago a proveedor',
        party: 'Distribuidora X',
        amount: 80,
        due_date: dueDate,
        account_id: 'acc-1',
      });

      expect(accountRepository.findById).toHaveBeenCalledWith('acc-1');
      expect(creditRepository.save).toHaveBeenCalledTimes(1);
      expect(entry.getStatus()).toBe('pending');
      expect(entry.getAccountId()).toBe('acc-1');
      expect(entry.getDueDate().toISOString()).toBe('2026-10-15T00:00:00.000Z');
      expect(entry.isSettled()).toBe(false);
    });

    it('creates an anonymous entry when no account is assigned (no wallet lookups)', async () => {
      const entry = await service.create('user-1', {
        type: 'receivable',
        concept: 'Me deben',
        amount: 10,
        due_date: dueDate,
      });

      expect(accountRepository.findById).not.toHaveBeenCalled();
      expect(entry.getAccountId()).toBeNull();
      expect(entry.getSettledTransactionIndex()).toBeNull();
    });

    it('throws NotFoundException when the assigned account does not exist', async () => {
      accountRepository.findById.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          type: 'payable',
          concept: 'X',
          amount: 5,
          due_date: dueDate,
          account_id: 'ghost',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(creditRepository.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the account belongs to another user', async () => {
      accountRepository.findById.mockResolvedValue({
        getId: () => 'acc-1',
        getUserId: () => 'someone-else',
      } as any);

      await expect(
        service.create('user-1', {
          type: 'payable',
          concept: 'X',
          amount: 5,
          due_date: dueDate,
          account_id: 'acc-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(creditRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('settle', () => {
    it('creates an income ("saving") wallet transaction when collecting a receivable', async () => {
      const entry = pendingReceivable({ account_id: 'acc-1' });
      creditRepository.findById.mockResolvedValue(entry);

      const settled = await service.settle('user-1', entry.getId());

      expect(saveTransaction.execute).toHaveBeenCalledWith('user-1', {
        name: 'Cobro: Cobro de alquiler',
        amount: 150,
        account_id: 'acc-1',
        type: 'saving',
      });
      expect(settled.getStatus()).toBe('settled');
      expect(settled.getSettledTransactionIndex()).toBe('1234567890');
      expect(settled.getSettledTransactionId()).toBe('M-abc123');
      expect(settled.getSettledAt()).not.toBeNull();
    });

    it('creates an expense wallet transaction when paying a payable', async () => {
      const entry = pendingReceivable({
        type: 'payable',
        concept: 'Alquiler',
        account_id: 'acc-1',
      });
      creditRepository.findById.mockResolvedValue(entry);

      await service.settle('user-1', entry.getId());

      expect(saveTransaction.execute).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ type: 'expense', name: 'Pago: Alquiler' }),
      );
    });

    it('settles without touching the wallet when no account is assigned', async () => {
      const entry = pendingReceivable();
      creditRepository.findById.mockResolvedValue(entry);

      const settled = await service.settle('user-1', entry.getId());

      expect(saveTransaction.execute).not.toHaveBeenCalled();
      expect(settled.getStatus()).toBe('settled');
      expect(settled.getSettledTransactionIndex()).toBeNull();
    });

    it('throws ConflictException when the entry is already settled', async () => {
      const entry = pendingReceivable().markSettled({
        settled_at: new Date(),
        transaction_id: null,
        transaction_index: null,
      });
      creditRepository.findById.mockResolvedValue(entry);

      await expect(
        service.settle('user-1', entry.getId()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(saveTransaction.execute).not.toHaveBeenCalled();
    });

    it('rolls back the wallet transaction when marking the entry fails', async () => {
      const entry = pendingReceivable({ account_id: 'acc-1' });
      creditRepository.findById.mockResolvedValue(entry);
      creditRepository.update.mockRejectedValue(new Error('db down'));

      await expect(service.settle('user-1', entry.getId())).rejects.toThrow(
        'db down',
      );
      expect(deleteTransaction.execute).toHaveBeenCalledWith(
        'user-1',
        '1234567890',
      );
    });
  });

  describe('unsettle', () => {
    it('soft-deletes the wallet transaction and clears the settlement', async () => {
      const entry = pendingReceivable({ account_id: 'acc-1' }).markSettled({
        settled_at: new Date(),
        transaction_id: 'M-abc123',
        transaction_index: '1234567890',
      });
      creditRepository.findById.mockResolvedValue(entry);

      const result = await service.unsettle('user-1', entry.getId());

      expect(deleteTransaction.execute).toHaveBeenCalledWith(
        'user-1',
        '1234567890',
      );
      expect(result.getStatus()).toBe('pending');
      expect(result.getSettledAt()).toBeNull();
      expect(result.getSettledTransactionIndex()).toBeNull();
      expect(result.getSettledTransactionId()).toBeNull();
    });

    it('settles back to pending even when the wallet transaction is already gone', async () => {
      const entry = pendingReceivable({ account_id: 'acc-1' }).markSettled({
        settled_at: new Date(),
        transaction_id: 'M-abc123',
        transaction_index: '1234567890',
      });
      creditRepository.findById.mockResolvedValue(entry);
      deleteTransaction.execute.mockRejectedValue(
        new NotFoundException('Transaction not found'),
      );

      const result = await service.unsettle('user-1', entry.getId());

      expect(result.getStatus()).toBe('pending');
    });

    it('throws ConflictException when the entry is not settled', async () => {
      const entry = pendingReceivable();
      creditRepository.findById.mockResolvedValue(entry);

      await expect(
        service.unsettle('user-1', entry.getId()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(deleteTransaction.execute).not.toHaveBeenCalled();
    });
  });

  describe('update / delete guards', () => {
    it('refuses to edit a settled entry', async () => {
      const entry = pendingReceivable({ account_id: 'acc-1' }).markSettled({
        settled_at: new Date(),
        transaction_id: 'M-abc123',
        transaction_index: '1234567890',
      });
      creditRepository.findById.mockResolvedValue(entry);

      await expect(
        service.update('user-1', entry.getId(), { amount: 999 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(creditRepository.update).not.toHaveBeenCalled();
    });

    it('refuses to soft-delete a settled entry (unsettle it first)', async () => {
      const entry = pendingReceivable({ account_id: 'acc-1' }).markSettled({
        settled_at: new Date(),
        transaction_id: 'M-abc123',
        transaction_index: '1234567890',
      });
      creditRepository.findById.mockResolvedValue(entry);

      await expect(
        service.softDelete('user-1', entry.getId()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(creditRepository.delete).not.toHaveBeenCalled();
    });

    it('refuses to hard-delete a settled entry (unsettle it first)', async () => {
      const entry = pendingReceivable().markSettled({
        settled_at: new Date(),
        transaction_id: null,
        transaction_index: null,
      });
      creditRepository.findById.mockResolvedValue(entry);

      await expect(
        service.hardDelete('user-1', entry.getId()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(creditRepository.hardDelete).not.toHaveBeenCalled();
    });

    it('soft-deletes and restores pending entries', async () => {
      const entry = pendingReceivable();
      creditRepository.findById.mockResolvedValue(entry);

      await service.softDelete('user-1', entry.getId());
      expect(creditRepository.delete).toHaveBeenCalledWith(entry.getId());

      await service.restore('user-1', entry.getId());
      expect(creditRepository.findById).toHaveBeenCalledWith(
        'user-1',
        entry.getId(),
        true,
      );
      expect(creditRepository.restore).toHaveBeenCalledWith(entry.getId());
    });

    it('scopes lookups by user so entries of others are not found', async () => {
      creditRepository.findById.mockResolvedValue(null);

      await expect(
        service.getById('intruder', 'someone-elses-entry'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(creditRepository.findById).toHaveBeenCalledWith(
        'intruder',
        'someone-elses-entry',
        false,
      );
    });
  });

  describe('calendar', () => {
    it('groups the month by due date and sums pending/settled totals per type', async () => {
      const rows = [
        pendingReceivable({ amount: 100 }),
        pendingReceivable({ amount: 50 }),
        pendingReceivable({ amount: 30 }).markSettled({
          settled_at: new Date(),
          transaction_id: 'M-1',
          transaction_index: '1',
        }),
        pendingReceivable({ type: 'payable', amount: 40 }),
        pendingReceivable({ type: 'payable', amount: 20 }).markSettled({
          settled_at: new Date(),
          transaction_id: 'M-2',
          transaction_index: '2',
        }),
      ];
      creditRepository.findMonth.mockResolvedValue(rows);

      const result = await service.calendar({
        user_id: 'user-1',
        year: 2026,
        month: 10,
      });

      expect(creditRepository.findMonth).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          from: new Date(Date.UTC(2026, 9, 1)),
          to: new Date(Date.UTC(2026, 10, 1)),
        }),
      );
      expect(result.year).toBe(2026);
      expect(result.month).toBe(10);
      expect(result.summary.receivable).toEqual({
        pending_count: 2,
        pending_amount: 150,
        settled_count: 1,
        settled_amount: 30,
      });
      expect(result.summary.payable).toEqual({
        pending_count: 1,
        pending_amount: 40,
        settled_count: 1,
        settled_amount: 20,
      });
      expect(result.data).toHaveLength(5);
      expect(result.data[0].concept).toBe('Cobro de alquiler');
    });

    it('rejects an out-of-range month', async () => {
      await expect(
        service.calendar({ user_id: 'user-1', year: 2026, month: 13 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(creditRepository.findMonth).not.toHaveBeenCalled();
    });
  });
});
