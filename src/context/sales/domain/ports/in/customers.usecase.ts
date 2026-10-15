import { Customer } from '../../entities/customer.entity';
import { CustomerStats, StoreCustomerLink } from '../out/customer.repository';

export const CUSTOMERS_USECASE = Symbol('CUSTOMERS_USECASE');

export interface ListCustomersFilters {
  store_id: string;
  take: number;
  cursor?: number;
  search?: string;
}

export interface CreateCustomerResult {
  customer: Customer;
  /** True when an existing customer was linked instead of creating a duplicate. */
  linked_existing: boolean;
}

export interface CustomersUseCase {
  list(filters: ListCustomersFilters): Promise<StoreCustomerLink[]>;
  /** Customer of the store (`404` when it is not linked). */
  getById(store_id: string, customer_id: string): Promise<Customer>;
  create(
    store_id: string,
    user_id: string,
    dto: { name: string; phone?: string; email?: string },
  ): Promise<CreateCustomerResult>;
  /** Links an existing customer to the store (sharing it between stores). */
  link(
    store_id: string,
    user_id: string,
    customer_id: string,
  ): Promise<Customer>;
  update(
    store_id: string,
    customer_id: string,
    dto: { name?: string; phone?: string | null; email?: string | null },
  ): Promise<Customer>;
  /** Removes the link of this store (the identity survives in other stores). */
  unlink(store_id: string, customer_id: string): Promise<void>;
  /** Permanent delete: only the creator, and only when no store uses it. */
  hardDelete(
    store_id: string,
    customer_id: string,
    user_id: string,
  ): Promise<void>;
  stats(store_id: string, customer_id: string): Promise<CustomerStats>;
  /** Validates that the customer can be used by this store (sales). */
  assertLinked(store_id: string, customer_id: string): Promise<Customer>;
}
