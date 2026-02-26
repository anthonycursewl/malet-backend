import { SharedAccount } from '../../entities/shared-account.entity';

export const DELETE_SHARED_ACCOUNT_USECASE = Symbol('DELETE_SHARED_ACCOUNT_USECASE');

export interface DeleteSharedAccountUseCase {
    execute(id: string): Promise<SharedAccount>;
}
