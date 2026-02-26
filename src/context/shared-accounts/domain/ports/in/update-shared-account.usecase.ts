import { SharedAccount } from '../../entities/shared-account.entity';
import { UpdateSharedAccountDto } from '../../../application/dtos/update-shared-account.dto';

export const UPDATE_SHARED_ACCOUNT_USECASE = Symbol('UPDATE_SHARED_ACCOUNT_USECASE');

export interface UpdateSharedAccountUseCase {
    execute(id: string, dto: UpdateSharedAccountDto): Promise<SharedAccount>;
}
