import { Body, Controller, Inject, Post, Get, UseGuards, Query } from "@nestjs/common";
import { TransactionDto } from "src/context/wallet/application/dtos/transaction.dto";
import { SAVE_TRANSACTION_USECASE, SaveTransactionUseCase } from "src/context/wallet/domain/ports/in/save-transaction.usecase";
import { GET_HISTORY_TRANSACTION_USECASE, GetHistoryTransactionUseCase } from "src/context/wallet/domain/ports/in/get-history-transaction.usecase";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
    constructor(
        @Inject(SAVE_TRANSACTION_USECASE)
        private readonly saveTransactionUseCase: SaveTransactionUseCase,
        @Inject(GET_HISTORY_TRANSACTION_USECASE)
        private readonly getHistoryTransactionUseCase: GetHistoryTransactionUseCase
    ) {}

    @Post('save')
    async save(@Body() tx: TransactionDto) {
        return this.saveTransactionUseCase.execute(tx)
    }

    @Get('history')
    async history(
        @Query() query: { skip: string, take: string, account_id: string, user_id: string }
    ) {
        if (!query.skip) query.skip = '0'
        if (!query.take) query.take = '10'
        if (query.account_id && query.user_id) {
            return this.getHistoryTransactionUseCase.execute(query.account_id, Number(query.skip), Number(query.take), 'by_account_id', query.user_id)
        }
        return this.getHistoryTransactionUseCase.execute(query.account_id, Number(query.skip), Number(query.take), 'by_user_id', query.user_id)
    }
}