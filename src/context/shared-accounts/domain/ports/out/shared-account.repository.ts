import { SharedAccount } from '../../entities/shared-account.entity';

export const SHARED_ACCOUNT_REPOSITORY_PORT = Symbol('SHARED_ACCOUNT_REPOSITORY_PORT');

export interface GetSharedAccountsOptions {
    take: number;
    cursor?: string;
    account_id?: string;
    user_id: string;
}

export interface SharedAccountRepository {
    save(sharedAccount: SharedAccount): Promise<SharedAccount>;
    findById(id: string): Promise<SharedAccount | null>;
    getSharedAccounts(options: GetSharedAccountsOptions): Promise<SharedAccount[]>;
    update(sharedAccount: SharedAccount): Promise<SharedAccount>;
    delete(id: string): Promise<SharedAccount>;
    restore(id: string): Promise<SharedAccount>;
    hardDelete(id: string): Promise<void>;
}
