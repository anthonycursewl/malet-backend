import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  DELETE_ACCOUNT_USECASE,
  DeleteAccountUseCase,
} from 'src/context/wallet/domain/ports/in/delete-account.usecase';
import {
  GET_DELETED_ACCOUNTS_USECASE,
  GetDeletedAccountsUseCase,
} from 'src/context/wallet/domain/ports/in/get-deleted-accounts.usecase';

import {

  CREATE_ACCOUNT_USECASE,
  CreateAccountUseCase,
} from 'src/context/wallet/domain/ports/in/create-account.usecase';
import {
  RESTORE_ACCOUNT_USECASE,
  RestoreAccountUseCase,
} from 'src/context/wallet/domain/ports/in/restore-account.usecase';
import { CreateAccountDto } from '../dtos/create-account.dto';

import {
  GET_ALL_ACCOUNTS_USECASE,
  GetAllAccountsUseCase,
} from 'src/context/wallet/domain/ports/in/get-all-acounts.usecase';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateAccountDto } from 'src/context/wallet/application/dtos/update-account.dto';
import {
  UPDATE_ACCOUNT_USECASE,
  UpdateAccountUseCase,
} from 'src/context/wallet/domain/ports/in/update-account.usecase';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { PolicyGuard } from 'src/shared/infrastructure/authorization/guards/policy.guard';
import {
  CanUpdate,
  CanRead,
} from 'src/shared/infrastructure/authorization/decorators/check-policy.decorator';
import { ResolvedResource } from 'src/shared/infrastructure/authorization/decorators/resolved-resource.decorator';
import { Account } from 'src/context/wallet/domain/entities/account.entity';

@Controller('accounts')
@UseGuards(JwtAuthGuard, PolicyGuard)
export class AccountsController {
  constructor(
    @Inject(CREATE_ACCOUNT_USECASE)
    private readonly createAccountUseCase: CreateAccountUseCase,
    @Inject(GET_ALL_ACCOUNTS_USECASE)
    private readonly getAllAccountsUseCase: GetAllAccountsUseCase,
    @Inject(UPDATE_ACCOUNT_USECASE)
    private readonly updateAccountUseCase: UpdateAccountUseCase,
    @Inject(DELETE_ACCOUNT_USECASE)
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
    @Inject(GET_DELETED_ACCOUNTS_USECASE)
    private readonly getDeletedAccountsUseCase: GetDeletedAccountsUseCase,
    @Inject(RESTORE_ACCOUNT_USECASE)
    private readonly restoreAccountUseCase: RestoreAccountUseCase,
  ) { }



  /**
   * Crea una nueva cuenta para el usuario autenticado.
   * No requiere @CanCreate porque estamos creando para el propio usuario.
   */
  @Post('create')
  async createAccount(
    @CurrentUser() user: { userId: string; email: string },
    @Body() createAccountDto: CreateAccountDto,
  ) {
    return this.createAccountUseCase.execute(user.userId, createAccountDto);
  }

  /**
   * Actualiza una cuenta existente.
   * @CanUpdate verifica automáticamente que el usuario sea dueño de la cuenta.
   * @ResolvedResource proporciona la cuenta ya verificada (evita doble fetch).
   */
  @Put('update/:account_id')
  @CanUpdate('account', 'account_id') // ← Verificación declarativa de ownership
  async updateAccount(
    @ResolvedResource() account: Account, // ← Cuenta ya verificada por el guard
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.updateAccountUseCase.execute(
      account.getUserId(),
      account.getId(),
      updateAccountDto,
    );
  }

  /**
   * Obtiene una cuenta específica por ID.
   * @CanRead verifica que el usuario sea dueño antes de retornar los datos.
   */
  @Get(':account_id')
  @CanRead('account', 'account_id')
  async getAccount(
    @ResolvedResource() account: Account
  ) {
    return account.toPrimitives();
  }

  /**
   * Obtiene todas las cuentas del usuario autenticado.
   * No requiere @CanRead porque filtramos por userId (solo sus propias cuentas).
   */
  @Get('get/all')
  async getAllAccounts(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: { take?: string; cursor?: string },
  ) {
    const take = query.take ? Number(query.take) : 10;
    const cursor = query.cursor;

    const accounts = await this.getAllAccountsUseCase.execute(
      user.userId,
      take,
      cursor,
    );

    const nextCursor =
      accounts.length === take ? accounts[accounts.length - 1].getId() : null;

    console.log(accounts)

    const d = {
      data: accounts.map((a) => a.toPrimitives()),
      nextCursor,
    };
    console.log(d)
    return d;
  }

  /**
   * Obtiene todas las cuentas en la papelera (soft-deleted) del usuario.
   */
  @Get('get/deleted')
  async getDeletedAccounts(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: { take?: string; cursor?: string },
  ) {
    const take = query.take ? Number(query.take) : 10;
    const cursor = query.cursor;

    const accounts = await this.getDeletedAccountsUseCase.execute(
      user.userId,
      take,
      cursor,
    );

    const nextCursor =
      accounts.length === take ? accounts[accounts.length - 1].getId() : null;

    return {
      data: accounts.map((a) => a.toPrimitives()),
      nextCursor,
    };
  }

  /**
   * Restaura una cuenta de la papelera.
   */
  @Post('restore/:account_id')
  @CanUpdate('account', 'account_id', { includeDeleted: true })

  async restoreAccount(@ResolvedResource() account: Account) {
    return this.restoreAccountUseCase.execute(
      account.getUserId(),
      account.getId(),
    );
  }

  /**
   * Elimina una cuenta (soft-delete).

   * @CanUpdate verifica automáticamente que el usuario sea dueño de la cuenta.
   */
  @Delete('delete/:account_id')
  @CanUpdate('account', 'account_id')
  async deleteAccount(@ResolvedResource() account: Account) {
    return this.deleteAccountUseCase.execute(
      account.getUserId(),
      account.getId(),
    );
  }
}

