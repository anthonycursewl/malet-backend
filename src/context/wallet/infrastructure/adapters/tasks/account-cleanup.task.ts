import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    ACCOUNT_REPOSITORY_PORT,
    AccountRepository,
} from 'src/context/wallet/domain/ports/out/account.repository';

@Injectable()
export class AccountCleanupTask {
    private readonly logger = new Logger(AccountCleanupTask.name);

    constructor(
        @Inject(ACCOUNT_REPOSITORY_PORT)
        private readonly accountRepository: AccountRepository,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCleanup() {
        this.logger.log('Starting account cleanup task...');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const accountsToDelete =
            await this.accountRepository.findDeletedOlderThan(thirtyDaysAgo);

        this.logger.log(`Found ${accountsToDelete.length} accounts to permanently delete.`);

        for (const account of accountsToDelete) {
            try {
                await this.accountRepository.delete(account.getId());
                this.logger.log(`Permanently deleted account: ${account.getId()}`);
            } catch (error) {
                this.logger.error(
                    `Failed to delete account ${account.getId()}: ${error.message}`,
                );
            }
        }

        this.logger.log('Account cleanup task finished.');
    }
}
