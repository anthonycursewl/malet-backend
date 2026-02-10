import { Injectable, Inject } from '@nestjs/common';
import { ResourceResolver } from './resource-resolver.interface';
import { Account } from 'src/context/wallet/domain/entities/account.entity';
import {
  ACCOUNT_REPOSITORY_PORT,
  AccountRepository,
} from 'src/context/wallet/domain/ports/out/account.repository';

/**
 * Resolver para recursos de tipo Account.
 * Obtiene la cuenta desde el repositorio para verificación de políticas.
 */
@Injectable()
export class AccountResourceResolver implements ResourceResolver<Account> {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_PORT)
    private readonly accountRepository: AccountRepository,
  ) {}

  /**
   * Resuelve una cuenta por su ID
   */
  async resolve(resourceId: string): Promise<Account | null> {
    try {
      return await this.accountRepository.findById(resourceId);
    } catch {
      return null;
    }
  }
}
