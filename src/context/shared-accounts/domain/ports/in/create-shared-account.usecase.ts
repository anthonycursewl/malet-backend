import { SharedAccount } from '../../entities/shared-account.entity';
import { CreateSharedAccountDto } from '../../../application/dtos/create-shared-account.dto';

export const CREATE_SHARED_ACCOUNT_USECASE = Symbol('CREATE_SHARED_ACCOUNT_USECASE');

export interface CreateSharedAccountUseCase {
    execute(user_id: string, dto: CreateSharedAccountDto): Promise<SharedAccount>;
}
