import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { CREATE_ACCOUNT_USECASE, CreateAccountUseCase } from "src/context/wallet/domain/ports/in/create-account.usecase";
import { CreateAccountDto } from "../dtos/create-account.dto";
import { GET_ALL_ACCOUNTS_USECASE, GetAllAccountsUseCase } from "src/context/wallet/domain/ports/in/get-all-acounts.usecase";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { UserPrimitives } from "src/context/users/domain/entities/user.entity";

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

    @Get('get/all')
    async getAllAccounts(@CurrentUser() user: UserPrimitives) {
        return this.getAllAccountsUseCase.execute(user.id)
    }

}
