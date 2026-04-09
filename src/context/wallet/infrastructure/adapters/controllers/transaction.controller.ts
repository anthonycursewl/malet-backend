import {
  Body,
  Controller,
  Inject,
  Post,
  Get,
  UseGuards,
  Query,
  Param,
  Put,
} from '@nestjs/common';
import { TransactionDto } from 'src/context/wallet/application/dtos/transaction.dto';
import { CompleteTransactionDto } from 'src/context/wallet/application/dtos/complete-transaction.dto';

import {
  SAVE_TRANSACTION_USECASE,
  SaveTransactionUseCase,
} from 'src/context/wallet/domain/ports/in/save-transaction.usecase';
import {
  GET_HISTORY_TRANSACTION_USECASE,
  GetHistoryTransactionUseCase,
} from 'src/context/wallet/domain/ports/in/get-history-transaction.usecase';
import {
  COMPLETE_TRANSACTION_USECASE,
  CompleteTransactionUseCase,
} from 'src/context/wallet/domain/ports/in/complete-transaction.usecase';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Transaction } from 'src/context/wallet/domain/entities/transaction.entity';
import {
  TransactionTagRepository,
  TRANSACTION_TAG_REPOSITORY_PORT,
} from 'src/context/wallet/domain/ports/out/transaction-tag.repository';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(
    @Inject(SAVE_TRANSACTION_USECASE)
    private readonly saveTransactionUseCase: SaveTransactionUseCase,
    @Inject(GET_HISTORY_TRANSACTION_USECASE)
    private readonly getHistoryTransactionUseCase: GetHistoryTransactionUseCase,
    @Inject(COMPLETE_TRANSACTION_USECASE)
    private readonly completeTransactionUseCase: CompleteTransactionUseCase,
    @Inject(TRANSACTION_TAG_REPOSITORY_PORT)
    private readonly tagRepository: TransactionTagRepository,
  ) { }

  @Post('save')
  async save(
    @CurrentUser() user: { userId: string; email: string },
    @Body() tx: TransactionDto & { tag_ids?: string[] },
  ) {
    const transaction = await this.saveTransactionUseCase.execute(
      user.userId,
      tx,
    );

    const tags = await this.tagRepository.findByTransactionId(
      transaction.getId(),
    );

    return {
      ...transaction.toPrimitives(),
      tags: tags.map((t) => t.toPrimitives()),
    };
  }

  @Get('history')
  async history(
    @CurrentUser() user: { userId: string; email: string },
    @Query()
    query: {
      cursor?: string;
      take?: string;
      account_id?: string;
      types?: string;
      tags?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const take = query.take ? Number(query.take) : 10;
    const cursor = query.cursor;

    let transactionTypes: string[] | undefined;
    if (query.types) {
      transactionTypes = query.types.split(',');
    }

    let tags: string[] | undefined;
    if (query.tags) {
      tags = query.tags.split(',');
    }

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const options = {
      take,
      user_id: user.userId,
      cursor,
      transactionTypes,
      tags,
      startDate,
      endDate,
    };

    const transactions = await this.getHistoryTransactionUseCase.execute({
      ...options,
      id: query.account_id || user.userId,
      type: query.account_id ? 'by_account_id' : 'by_user_id',
    });

    const nextCursor =
      transactions.length === take
        ? transactions[transactions.length - 1].getId()
        : null;

    const data = transactions.map((tx) => tx.toPrimitives());

    return { data, nextCursor };
  }

  @Put('complete/:id')
  async complete(@Param('id') id: string, @Body() dto: CompleteTransactionDto) {
    const updatedTransaction = await this.completeTransactionUseCase.execute(
      id,
      dto.type,
    );
    return updatedTransaction.toPrimitives();
  }
}
