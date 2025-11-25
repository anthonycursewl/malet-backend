import { Body, Controller, Inject, Post, Get, UseGuards, Query } from "@nestjs/common";
import { TransactionDto } from "src/context/wallet/application/dtos/transaction.dto";
import { SAVE_TRANSACTION_USECASE, SaveTransactionUseCase } from "src/context/wallet/domain/ports/in/save-transaction.usecase";
import { GET_HISTORY_TRANSACTION_USECASE, GetHistoryTransactionUseCase } from "src/context/wallet/domain/ports/in/get-history-transaction.usecase";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
    constructor(
        @Inject(SAVE_TRANSACTION_USECASE)
        private readonly saveTransactionUseCase: SaveTransactionUseCase,
        @Inject(GET_HISTORY_TRANSACTION_USECASE)
        private readonly getHistoryTransactionUseCase: GetHistoryTransactionUseCase
    ) { }

    @Post('save')
    async save(
        @CurrentUser() user: { userId: string; email: string },
        @Body() tx: TransactionDto
    ) {
        return this.saveTransactionUseCase.execute(user.userId, tx)
    }

    @Get('history')
    async history(
        @CurrentUser() user: { userId: string; email: string },
        @Query() query: { skip?: string, take?: string, account_id?: string }
    ) {
        const skip = query.skip ? Number(query.skip) : 0;
        const take = query.take ? Number(query.take) : 10;

        if (query.account_id) {
            return this.getHistoryTransactionUseCase.execute(
                query.account_id,
                skip,
                take,
                'by_account_id',
                user.userId
            )
        }


        return this.getHistoryTransactionUseCase.execute(
            user.userId,
            skip,
            take,
            'by_user_id',
            user.userId
        )
    }
}