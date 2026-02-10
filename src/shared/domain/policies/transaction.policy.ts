import { Policy, AuthenticatedUser } from './policy.interface';
import { Transaction } from 'src/context/wallet/domain/entities/transaction.entity';
import { Account } from 'src/context/wallet/domain/entities/account.entity';

/**
 * Contexto adicional para verificación de transacciones.
 * Las transacciones pertenecen a cuentas, no directamente a usuarios.
 */
export interface TransactionWithAccount extends Transaction {
  account?: Account;
}

/**
 * Política de autorización para recursos de tipo Transaction.
 * Las transacciones son propiedad indirecta del usuario a través de la cuenta.
 *
 * NOTA: Para verificar ownership, necesitamos la cuenta asociada.
 * El resolver debe proporcionar la transacción junto con su cuenta.
 */
export class TransactionPolicy implements Policy<Transaction> {
  /**
   * Un usuario puede crear transacciones si es dueño de la cuenta destino.
   * Esta verificación se hace en el servicio ya que necesita la cuenta.
   */
  canCreate(user: AuthenticatedUser): boolean {
    // La verificación real se hace en el servicio con la cuenta
    return !!user.userId;
  }

  /**
   * Solo el dueño de la cuenta puede ver las transacciones.
   * Requiere que el resolver proporcione la cuenta.
   */
  canRead(
    user: AuthenticatedUser,
    transaction: Transaction & { account?: Account },
  ): boolean {
    if (!transaction.account) {
      // Si no hay cuenta en el contexto, denegar por seguridad
      return false;
    }
    return transaction.account.getUserId() === user.userId;
  }

  /**
   * Las transacciones son inmutables por diseño.
   * No se permite actualizar transacciones.
   */
  canUpdate(_user: AuthenticatedUser, _transaction: Transaction): boolean {
    return false; // Las transacciones no se actualizan
  }

  /**
   * Solo el dueño de la cuenta puede eliminar transacciones.
   */
  canDelete(
    user: AuthenticatedUser,
    transaction: Transaction & { account?: Account },
  ): boolean {
    if (!transaction.account) {
      return false;
    }
    return transaction.account.getUserId() === user.userId;
  }
}
