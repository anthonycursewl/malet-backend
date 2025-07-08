import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { CREATE_ACCOUNT_USECASE, CreateAccountUseCase } from "src/context/wallet/domain/ports/in/create-account.usecase";
import { CreateAccountDto } from "../dtos/create-account.dto";
import { GET_ALL_ACCOUNTS_USECASE, GetAllAccountsUseCase } from "src/context/wallet/domain/ports/in/get-all-acounts.usecase";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
    constructor(
        @Inject(CREATE_ACCOUNT_USECASE)
        private readonly createAccountUseCase: CreateAccountUseCase,
        @Inject(GET_ALL_ACCOUNTS_USECASE)
        private readonly getAllAccountsUseCase: GetAllAccountsUseCase
    ) {}

    @Post('create')
    async createAccount(@Body() createAccountDto: CreateAccountDto) {
        return this.createAccountUseCase.execute(createAccountDto)
    }

    @Get('get/all/:user_id')
    async getAllAccounts(@Param('user_id') userId: string) {
        console.log(userId)
        return await this.getAllAccountsUseCase.execute(userId)
    }

}
