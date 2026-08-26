import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

import {
  CREATE_SHARED_ACCOUNT_USECASE,
  CreateSharedAccountUseCase,
} from '../../../domain/ports/in/create-shared-account.usecase';
import {
  GET_SHARED_ACCOUNTS_USECASE,
  GetSharedAccountsUseCase,
} from '../../../domain/ports/in/get-shared-accounts.usecase';
import {
  UPDATE_SHARED_ACCOUNT_USECASE,
  UpdateSharedAccountUseCase,
} from '../../../domain/ports/in/update-shared-account.usecase';
import {
  DELETE_SHARED_ACCOUNT_USECASE,
  DeleteSharedAccountUseCase,
} from '../../../domain/ports/in/delete-shared-account.usecase';
import {
  RESTORE_SHARED_ACCOUNT_USECASE,
  RestoreSharedAccountUseCase,
} from '../../../domain/ports/in/restore-shared-account.usecase';
import {
  HARD_DELETE_SHARED_ACCOUNT_USECASE,
  HardDeleteSharedAccountUseCase,
} from '../../../domain/ports/in/hard-delete-shared-account.usecase';

import { CreateSharedAccountDto } from '../../../application/dtos/create-shared-account.dto';
import { UpdateSharedAccountDto } from '../../../application/dtos/update-shared-account.dto';
import { SharedAccount } from '../../../domain/entities/shared-account.entity';

@Controller('shared/accounts')
@UseGuards(JwtAuthGuard)
export class SharedAccountsController {
  constructor(
    @Inject(CREATE_SHARED_ACCOUNT_USECASE)
    private readonly createSharedAccountUseCase: CreateSharedAccountUseCase,
    @Inject(GET_SHARED_ACCOUNTS_USECASE)
    private readonly getSharedAccountsUseCase: GetSharedAccountsUseCase,
    @Inject(UPDATE_SHARED_ACCOUNT_USECASE)
    private readonly updateSharedAccountUseCase: UpdateSharedAccountUseCase,
    @Inject(DELETE_SHARED_ACCOUNT_USECASE)
    private readonly deleteSharedAccountUseCase: DeleteSharedAccountUseCase,
    @Inject(RESTORE_SHARED_ACCOUNT_USECASE)
    private readonly restoreSharedAccountUseCase: RestoreSharedAccountUseCase,
    @Inject(HARD_DELETE_SHARED_ACCOUNT_USECASE)
    private readonly hardDeleteSharedAccountUseCase: HardDeleteSharedAccountUseCase,
  ) {}

  private async assertOwnership(
    id: string,
    userId: string,
  ): Promise<SharedAccount> {
    const accounts = await this.getSharedAccountsUseCase.execute({
      user_id: userId,
      take: 1,
    });
    const account = accounts.find((a) => a.getId() === id);
    if (!account) {
      throw new NotFoundException('Shared account not found');
    }
    if (account.getUserId() !== userId) {
      throw new ForbiddenException('You do not own this shared account');
    }
    return account;
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSharedAccountDto,
  ) {
    const newAccount = await this.createSharedAccountUseCase.execute(
      user.userId,
      dto,
    );
    return newAccount.toPrimitives();
  }

  @Get()
  async getPaginated(
    @CurrentUser() user: { userId: string },
    @Query('account_id') account_id?: string,
    @Query('take') takeQuery?: string,
    @Query('cursor') cursor?: string,
  ) {
    const take = takeQuery ? Number(takeQuery) : 10;

    const results: SharedAccount[] =
      await this.getSharedAccountsUseCase.execute({
        user_id: user.userId,
        take,
        cursor,
        account_id,
      });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((account) => account.toPrimitives()),
      nextCursor,
    };
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateSharedAccountDto,
  ) {
    await this.assertOwnership(id, user.userId);
    const updated = await this.updateSharedAccountUseCase.execute(id, dto);
    return updated.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.assertOwnership(id, user.userId);
    const deleted = await this.deleteSharedAccountUseCase.execute(id);
    return deleted.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.assertOwnership(id, user.userId);
    const restored = await this.restoreSharedAccountUseCase.execute(id);
    return restored.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.assertOwnership(id, user.userId);
    await this.hardDeleteSharedAccountUseCase.execute(id);
    return { success: true };
  }
}
