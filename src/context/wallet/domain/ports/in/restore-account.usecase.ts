export const RESTORE_ACCOUNT_USECASE = 'RESTORE_ACCOUNT_USECASE';

export interface RestoreAccountUseCase {
    execute(userId: string, accountId: string): Promise<void>;
}
