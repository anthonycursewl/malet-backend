import { PaymentMethod } from '../../entities/payment-method.entity';
import { CreatePaymentMethodDto } from '../../../application/dtos/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../../../application/dtos/update-payment-method.dto';

export const PAYMENT_METHODS_USECASE = Symbol('PAYMENT_METHODS_USECASE');

export interface ListPaymentMethodsOptions {
  store_id: string;
  take?: number;
  cursor?: string;
  include_deleted?: boolean;
}

export interface PaymentMethodsUseCase {
  create(
    store_id: string,
    user_id: string,
    dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethod>;
  list(options: ListPaymentMethodsOptions): Promise<PaymentMethod[]>;
  getById(
    store_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<PaymentMethod>;
  update(
    store_id: string,
    id: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod>;
  softDelete(store_id: string, id: string): Promise<PaymentMethod>;
  restore(store_id: string, id: string): Promise<PaymentMethod>;
  /** Permanent delete: only the creator of the record can do it, and only if no sales reference it. */
  hardDelete(store_id: string, id: string, user_id: string): Promise<void>;
}
