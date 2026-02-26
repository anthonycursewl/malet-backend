export const HARD_DELETE_SHARED_ACCOUNT_USECASE = Symbol('HARD_DELETE_SHARED_ACCOUNT_USECASE');

export interface HardDeleteSharedAccountUseCase {
    execute(id: string): Promise<void>;
}
