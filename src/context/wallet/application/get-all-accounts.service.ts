import { Injectable, Inject } from '@nestjs/common';
import { GetAllAccountsUseCase } from '../domain/ports/in/get-all-acounts.usecase';
import { Account } from '../domain/entities/account.entity';
import {
  ACCOUNT_REPOSITORY_PORT,
  AccountRepository,
} from '../domain/ports/out/account.repository';

@Injectable()
export class GetAllAccountsService implements GetAllAccountsUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_PORT)
    private readonly accountRepository: AccountRepository,
  ) {}

  async execute(userId: string): Promise<Account[] | []> {
    return this.accountRepository.getAllAccounts(userId);
  }
}
