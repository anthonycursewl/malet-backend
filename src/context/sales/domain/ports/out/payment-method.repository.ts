import { PaymentMethod } from '../../entities/payment-method.entity';

export const PAYMENT_METHOD_REPOSITORY_PORT = Symbol(
  'PAYMENT_METHOD_REPOSITORY_PORT',
);

export interface ListPaymentMethodsOptions {
  store_id: string;
  take?: number;
  cursor?: string;
  include_deleted?: boolean;
}

export interface PaymentMethodRepository {
  save(paymentMethod: PaymentMethod): Promise<PaymentMethod>;
  findById(
    store_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<PaymentMethod | null>;
  findMany(options: ListPaymentMethodsOptions): Promise<PaymentMethod[]>;
  update(paymentMethod: PaymentMethod): Promise<PaymentMethod>;
  delete(id: string): Promise<PaymentMethod>;
  restore(id: string): Promise<PaymentMethod>;
  /** Throws ConflictException when sales still reference this payment method. */
  hardDelete(id: string): Promise<void>;
}
