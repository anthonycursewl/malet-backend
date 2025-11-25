import { Body, Controller, Get, Inject, Param, Post, Put, UseGuards } from "@nestjs/common";
import { CREATE_ACCOUNT_USECASE, CreateAccountUseCase } from "src/context/wallet/domain/ports/in/create-account.usecase";
import { CreateAccountDto } from "../dtos/create-account.dto";
import { GET_ALL_ACCOUNTS_USECASE, GetAllAccountsUseCase } from "src/context/wallet/domain/ports/in/get-all-acounts.usecase";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { UpdateAccountDto } from "src/context/wallet/application/dtos/update-account.dto";
import { UPDATE_ACCOUNT_USECASE, UpdateAccountUseCase } from "src/context/wallet/domain/ports/in/update-account.usecase";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
    constructor(
        @Inject(CREATE_ACCOUNT_USECASE)
        private readonly createAccountUseCase: CreateAccountUseCase,
        @Inject(GET_ALL_ACCOUNTS_USECASE)
        private readonly getAllAccountsUseCase: GetAllAccountsUseCase,
        @Inject(UPDATE_ACCOUNT_USECASE)
        private readonly updateAccountUseCase: UpdateAccountUseCase
    ) { }

    @Post('create')
    async createAccount(
        @CurrentUser() user: { userId: string; email: string },
        @Body() createAccountDto: CreateAccountDto
    ) {
        return this.createAccountUseCase.execute(user.userId, createAccountDto)
    }

    @Put('update/:account_id')
    async updateAccount(
        @CurrentUser() user: { userId: string; email: string },
        @Param('account_id') accountId: string,
        @Body() updateAccountDto: UpdateAccountDto
    ) {
        return this.updateAccountUseCase.execute(user.userId, accountId, updateAccountDto)
    }

    @Get('get/all')
    async getAllAccounts(
        @CurrentUser() user: { userId: string; email: string }
    ) {
        return await this.getAllAccountsUseCase.execute(user.userId)
    }

}
