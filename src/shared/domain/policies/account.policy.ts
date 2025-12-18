import { Policy, AuthenticatedUser } from './policy.interface';
import { Account } from 'src/context/wallet/domain/entities/account.entity';

/**
 * Política de autorización para recursos de tipo Account.
 * Define las reglas de negocio para determinar quién puede
 * realizar operaciones sobre las cuentas.
 */
export class AccountPolicy implements Policy<Account> {
    /**
     * Cualquier usuario autenticado puede crear cuentas
     */
    canCreate(user: AuthenticatedUser): boolean {
        return !!user.userId;
    }

    /**
     * Solo el dueño puede ver la cuenta
     */
    canRead(user: AuthenticatedUser, account: Account): boolean {
        return account.getUserId() === user.userId;
    }

    /**
     * Solo el dueño puede actualizar la cuenta
     */
    canUpdate(user: AuthenticatedUser, account: Account): boolean {
        return account.getUserId() === user.userId;
    }

    /**
     * Solo el dueño puede eliminar la cuenta
     */
    canDelete(user: AuthenticatedUser, account: Account): boolean {
        return account.getUserId() === user.userId;
    }
}
