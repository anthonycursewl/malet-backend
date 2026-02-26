export const DELETE_ACCOUNT_USECASE = 'DELETE_ACCOUNT_USECASE';

export interface DeleteAccountUseCase {
    execute(userId: string, accountId: string): Promise<void>;
}
