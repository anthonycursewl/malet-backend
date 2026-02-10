import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  CREATE_ACCOUNT_USECASE,
  CreateAccountUseCase,
} from 'src/context/wallet/domain/ports/in/create-account.usecase';
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
@UseGuards(JwtAuthGuard, PolicyGuard) // PolicyGuard añadido para autorización
export class AccountsController {
  constructor(
    @Inject(CREATE_ACCOUNT_USECASE)
    private readonly createAccountUseCase: CreateAccountUseCase,
    @Inject(GET_ALL_ACCOUNTS_USECASE)
    private readonly getAllAccountsUseCase: GetAllAccountsUseCase,
    @Inject(UPDATE_ACCOUNT_USECASE)
    private readonly updateAccountUseCase: UpdateAccountUseCase,
  ) {}

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
    // Ya no necesitamos pasar userId porque el ownership ya fue verificado
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
  @CanRead('account', 'account_id') // ← Solo el dueño puede ver
  async getAccount(
    @ResolvedResource() account: Account, // ← Cuenta ya verificada
  ) {
    return account.toPrimitives();
  }

  /**
   * Obtiene todas las cuentas del usuario autenticado.
   * No requiere @CanRead porque filtramos por userId (solo sus propias cuentas).
   */
  @Get('get/all')
  async getAllAccounts(@CurrentUser() user: { userId: string; email: string }) {
    return await this.getAllAccountsUseCase.execute(user.userId);
  }
}
