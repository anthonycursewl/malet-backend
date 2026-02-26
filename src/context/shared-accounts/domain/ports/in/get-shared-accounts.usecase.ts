import { SharedAccount } from '../../entities/shared-account.entity';
import { GetSharedAccountsOptions } from '../out/shared-account.repository';

export const GET_SHARED_ACCOUNTS_USECASE = Symbol('GET_SHARED_ACCOUNTS_USECASE');

export interface GetSharedAccountsUseCase {
    execute(options: GetSharedAccountsOptions): Promise<SharedAccount[]>;
}
