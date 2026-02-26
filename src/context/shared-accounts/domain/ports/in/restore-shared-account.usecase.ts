import { SharedAccount } from '../../entities/shared-account.entity';

export const RESTORE_SHARED_ACCOUNT_USECASE = Symbol('RESTORE_SHARED_ACCOUNT_USECASE');

export interface RestoreSharedAccountUseCase {
    execute(id: string): Promise<SharedAccount>;
}
