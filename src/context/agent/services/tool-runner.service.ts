import { Injectable, Logger, Inject } from '@nestjs/common';
import { ToolRunner, ToolResult } from '../interfaces/tool-runner.interface';
import {
  TRANSACTION_REPOSITORY_PORT,
  TransactionRepository,
} from 'src/context/wallet/domain/ports/out/transaction.repository';
import {
  ACCOUNT_REPOSITORY_PORT,
  AccountRepository,
} from 'src/context/wallet/domain/ports/out/account.repository';
import {
  SaveTransactionUseCase,
  SAVE_TRANSACTION_USECASE,
} from 'src/context/wallet/domain/ports/in/save-transaction.usecase';

@Injectable()
export class ToolRunnerService implements ToolRunner {
  private readonly logger = new Logger(ToolRunnerService.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepository,
    @Inject(ACCOUNT_REPOSITORY_PORT)
    private readonly accountRepository: AccountRepository,
    @Inject(SAVE_TRANSACTION_USECASE)
    private readonly saveTransactionUseCase: SaveTransactionUseCase,
  ) {}

  async execute(name: string, args: any, userId: string): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_balance':
          return this.getBalance(args, userId);
        case 'list_transactions':
          return this.listTransactions(args, userId);
        case 'create_transaction':
          return this.createTransaction(args, userId);
        default:
          return { status: 'error', error: 'Unknown tool' };
      }
    } catch (e) {
      this.logger.error(`Tool ${name} failed: ${e.message}`);
      return { status: 'error', error: e.message };
    }
  }

  private async getBalance(args: any, userId: string): Promise<ToolResult> {
    const { account_id } = args;
    if (!account_id) return { status: 'error', error: 'account_id required' };

    const acc = await this.accountRepository.findById(account_id);
    if (!acc) return { status: 'error', error: 'Account not found' };
    if (acc.getUserId() !== userId)
      return { status: 'error', error: 'Forbidden' };

    return {
      status: 'ok',
      data: { balance: acc.getBalance(), currency: acc.getCurrency() },
    };
  }

  private async listTransactions(
    args: any,
    userId: string,
  ): Promise<ToolResult> {
    const { account_id, take } = args;
    const takeN = take ? Number(take) : 10;

    const txs = await this.transactionRepository.getHistoryTransaction({
      id: account_id || userId,
      take: takeN,
      type: account_id ? 'by_account_id' : 'by_user_id',
      user_id: userId,
    } as any);

    return { status: 'ok', data: txs.map((t) => t.toPrimitives()) };
  }

  private async createTransaction(
    args: any,
    userId: string,
  ): Promise<ToolResult> {
    // Validate basic fields
    const required = ['account_id', 'name', 'amount', 'type', 'dedup_key'];
    for (const r of required)
      if (!args[r]) return { status: 'error', error: `${r} required` };

    // Validate ownership
    const account = await this.accountRepository.findById(args.account_id);
    if (!account) return { status: 'error', error: 'Account not found' };
    if (account.getUserId() !== userId)
      return { status: 'error', error: 'Forbidden' };

    // Build tx object matching SaveTransactionUseCase
    const tx = {
      name: args.name,
      amount: Number(args.amount),
      type: args.type,
      account_id: args.account_id,
      currency_code: args.currency_code,
      tag_ids: args.tag_ids || [],
    } as any;

    const created = await this.saveTransactionUseCase.execute(userId, tx);
    return { status: 'ok', data: created.toPrimitives() };
  }
}
