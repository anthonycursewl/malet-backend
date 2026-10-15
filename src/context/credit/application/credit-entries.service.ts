import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreditEntriesUseCase,
  ListCreditEntriesOptions,
} from '../domain/ports/in/credit-entries.usecase';
import { CreateCreditEntryDto } from './dtos/create-credit-entry.dto';
import { UpdateCreditEntryDto } from './dtos/update-credit-entry.dto';
import { CreditEntry } from '../domain/entities/credit-entry.entity';
import {
  CreditCalendarParams,
  CreditCalendarResult,
  CreditTypeSummary,
} from '../domain/types';
import { monthRange, parseDueDate } from '../domain/credit-date';
import {
  CREDIT_ENTRY_REPOSITORY_PORT,
  CreditEntryRepository,
} from '../domain/ports/out/credit-entry.repository';
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

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const emptySummary = (): CreditTypeSummary => ({
  pending_count: 0,
  pending_amount: 0,
  settled_count: 0,
  settled_amount: 0,
});

@Injectable()
export class CreditEntriesService implements CreditEntriesUseCase {
  constructor(
    @Inject(CREDIT_ENTRY_REPOSITORY_PORT)
    private readonly creditRepository: CreditEntryRepository,
    @Inject(ACCOUNT_REPOSITORY_PORT)
    private readonly accountRepository: AccountRepository,
    @Inject(SAVE_TRANSACTION_USECASE)
    private readonly saveTransactionUseCase: SaveTransactionUseCase,
    @Inject(DELETE_TRANSACTION_USECASE)
    private readonly deleteTransactionUseCase: DeleteTransactionUseCase,
  ) {}

  async create(
    user_id: string,
    dto: CreateCreditEntryDto,
  ): Promise<CreditEntry> {
    const account_id = dto.account_id
      ? await this.resolveAccountId(user_id, dto.account_id)
      : null;

    const entry = CreditEntry.create({
      user_id,
      type: dto.type,
      concept: dto.concept,
      party: dto.party,
      amount: dto.amount,
      due_date: parseDueDate(dto.due_date),
      account_id,
      notes: dto.notes,
    });

    return this.creditRepository.save(entry);
  }

  async list(options: ListCreditEntriesOptions): Promise<CreditEntry[]> {
    return this.creditRepository.findMany(options);
  }

  async calendar(params: CreditCalendarParams): Promise<CreditCalendarResult> {
    const { from, to } = monthRange(params.year, params.month);

    const rows = await this.creditRepository.findMonth({
      user_id: params.user_id,
      from,
      to,
      type: params.type,
      status: params.status,
      account_id: params.account_id,
    });

    const summary: Record<'receivable' | 'payable', CreditTypeSummary> = {
      receivable: emptySummary(),
      payable: emptySummary(),
    };

    for (const row of rows) {
      const bucket = summary[row.getType()];
      if (row.isSettled()) {
        bucket.settled_count += 1;
        bucket.settled_amount += row.getAmount();
      } else {
        bucket.pending_count += 1;
        bucket.pending_amount += row.getAmount();
      }
    }

    summary.receivable.pending_amount = round2(
      summary.receivable.pending_amount,
    );
    summary.receivable.settled_amount = round2(
      summary.receivable.settled_amount,
    );
    summary.payable.pending_amount = round2(summary.payable.pending_amount);
    summary.payable.settled_amount = round2(summary.payable.settled_amount);

    return {
      year: params.year,
      month: params.month,
      summary,
      data: rows.map((row) => row.toPrimitives()),
    };
  }

  async getById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<CreditEntry> {
    const entry = await this.creditRepository.findById(
      user_id,
      id,
      include_deleted,
    );
    if (!entry) {
      throw new NotFoundException('Credit entry not found');
    }
    return entry;
  }

  async update(
    user_id: string,
    id: string,
    dto: UpdateCreditEntryDto,
  ): Promise<CreditEntry> {
    const entry = await this.getById(user_id, id);
    if (entry.isSettled()) {
      throw new ConflictException(
        'This entry is settled: unsettle it before editing',
      );
    }

    const patch: Parameters<CreditEntry['update']>[0] = {};

    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.concept !== undefined) patch.concept = dto.concept;
    if (dto.party !== undefined) patch.party = dto.party;
    if (dto.amount !== undefined) patch.amount = dto.amount;
    if (dto.due_date !== undefined) patch.due_date = parseDueDate(dto.due_date);
    if (dto.notes !== undefined) patch.notes = dto.notes;
    if (dto.account_id !== undefined) {
      patch.account_id =
        dto.account_id === null
          ? null
          : await this.resolveAccountId(user_id, dto.account_id);
    }

    return this.creditRepository.update(entry.update(patch));
  }

  async settle(user_id: string, id: string): Promise<CreditEntry> {
    const entry = await this.getById(user_id, id);
    if (entry.isSettled()) {
      throw new ConflictException('This entry is already settled');
    }

    const account_id = entry.getAccountId();
    let transaction_id: string | null = null;
    let transaction_index: string | null = null;

    if (account_id) {
      // receivable -> money comes in (+) => 'saving'; payable -> money goes out (-) => 'expense'
      const transaction = await this.saveTransactionUseCase.execute(user_id, {
        name: this.transactionName(entry),
        amount: entry.getAmount(),
        account_id,
        type: entry.getType() === 'receivable' ? 'saving' : 'expense',
      });
      transaction_id = transaction.getId();
      transaction_index = transaction.getIndexId()?.toString() ?? null;
    }

    const settled = entry.markSettled({
      settled_at: new Date(),
      transaction_id,
      transaction_index,
    });

    try {
      return await this.creditRepository.update(settled);
    } catch (error) {
      // Compensate: never leave the money moved if the entry could not be marked.
      if (transaction_index) {
        try {
          await this.deleteTransactionUseCase.execute(
            user_id,
            transaction_index,
          );
        } catch {
          /* best effort */
        }
      }
      throw error;
    }
  }

  async unsettle(user_id: string, id: string): Promise<CreditEntry> {
    const entry = await this.getById(user_id, id);
    if (!entry.isSettled()) {
      throw new ConflictException('This entry is not settled');
    }

    const transaction_index = entry.getSettledTransactionIndex();
    if (transaction_index) {
      try {
        // Soft-deleting reverts the account balance (wallet invariant).
        await this.deleteTransactionUseCase.execute(user_id, transaction_index);
      } catch (error) {
        if (!(error instanceof NotFoundException)) throw error;
        // The transaction is gone: nothing to revert, keep going.
      }
    }

    return this.creditRepository.update(entry.markPending());
  }

  async softDelete(user_id: string, id: string): Promise<CreditEntry> {
    const entry = await this.getById(user_id, id);
    if (entry.isSettled()) {
      throw new ConflictException(
        'This entry is settled: unsettle it before deleting',
      );
    }

    return this.creditRepository.delete(entry.getId());
  }

  async restore(user_id: string, id: string): Promise<CreditEntry> {
    const entry = await this.getById(user_id, id, true);
    if (entry.isSettled()) {
      throw new ConflictException(
        'This entry is settled: unsettle it before deleting',
      );
    }

    return this.creditRepository.restore(entry.getId());
  }

  async hardDelete(user_id: string, id: string): Promise<void> {
    const entry = await this.getById(user_id, id, true);
    if (entry.getUserId() !== user_id) {
      throw new ForbiddenException(
        'Only the creator of this record can permanently delete it',
      );
    }
    if (entry.isSettled()) {
      throw new ConflictException(
        'This entry is settled: unsettle it before deleting',
      );
    }

    return this.creditRepository.hardDelete(entry.getId());
  }

  private async resolveAccountId(
    user_id: string,
    account_id: string,
  ): Promise<string> {
    const account = await this.accountRepository.findById(account_id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    if (account.getUserId() !== user_id) {
      throw new ForbiddenException('You do not own this account');
    }
    return account.getId();
  }

  private transactionName(entry: CreditEntry): string {
    const prefix = entry.getType() === 'receivable' ? 'Cobro' : 'Pago';
    return `${prefix}: ${entry.getConcept()}`.slice(0, 255);
  }
}
