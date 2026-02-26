import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { SharedAccountsController } from './infrastructure/adapters/controllers/shared-accounts.controller';
import { CREATE_SHARED_ACCOUNT_USECASE } from './domain/ports/in/create-shared-account.usecase';
import { GET_SHARED_ACCOUNTS_USECASE } from './domain/ports/in/get-shared-accounts.usecase';
import { UPDATE_SHARED_ACCOUNT_USECASE } from './domain/ports/in/update-shared-account.usecase';
import { DELETE_SHARED_ACCOUNT_USECASE } from './domain/ports/in/delete-shared-account.usecase';
import { RESTORE_SHARED_ACCOUNT_USECASE } from './domain/ports/in/restore-shared-account.usecase';
import { HARD_DELETE_SHARED_ACCOUNT_USECASE } from './domain/ports/in/hard-delete-shared-account.usecase';
import { SHARED_ACCOUNT_REPOSITORY_PORT } from './domain/ports/out/shared-account.repository';

import { SharedAccountRepositoryAdapter } from './infrastructure/persistence/shared-account.repository.adapter';

import { CreateSharedAccountService } from './application/create-shared-account.service';
import { GetSharedAccountsService } from './application/get-shared-accounts.service';
import { UpdateSharedAccountService } from './application/update-shared-account.service';
import { DeleteSharedAccountService } from './application/delete-shared-account.service';
import { RestoreSharedAccountService } from './application/restore-shared-account.service';
import { HardDeleteSharedAccountService } from './application/hard-delete-shared-account.service';

@Module({
    imports: [PrismaModule],
    controllers: [SharedAccountsController],
    providers: [
        {
            provide: SHARED_ACCOUNT_REPOSITORY_PORT,
            useClass: SharedAccountRepositoryAdapter,
        },
        {
            provide: CREATE_SHARED_ACCOUNT_USECASE,
            useClass: CreateSharedAccountService,
        },
        {
            provide: GET_SHARED_ACCOUNTS_USECASE,
            useClass: GetSharedAccountsService,
        },
        {
            provide: UPDATE_SHARED_ACCOUNT_USECASE,
            useClass: UpdateSharedAccountService,
        },
        {
            provide: DELETE_SHARED_ACCOUNT_USECASE,
            useClass: DeleteSharedAccountService,
        },
        {
            provide: RESTORE_SHARED_ACCOUNT_USECASE,
            useClass: RestoreSharedAccountService,
        },
        {
            provide: HARD_DELETE_SHARED_ACCOUNT_USECASE,
            useClass: HardDeleteSharedAccountService,
        },
    ],
    exports: [SHARED_ACCOUNT_REPOSITORY_PORT],
})
export class SharedAccountsModule { }
