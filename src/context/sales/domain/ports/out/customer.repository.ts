import { Customer } from '../../entities/customer.entity';

export const CUSTOMER_REPOSITORY_PORT = Symbol('CUSTOMER_REPOSITORY_PORT');

export interface ListCustomersOptions {
  store_id: string;
  take: number;
  /** Keyset cursor: the last `seq` seen (auto-increment, so it never repeats). */
  cursor?: number;
  /** Case-insensitive match on name, phone or email. */
  search?: string;
}

/** A customer linked to a store plus its keyset position. */
export interface StoreCustomerLink {
  customer: Customer;
  seq: number;
  linked_at: Date;
}

export interface CustomerTopProduct {
  product_id: string;
  product_name: string;
  units: number;
  revenue: number;
}

export interface CustomerTopPaymentMethod {
  payment_method_id: string | null;
  name: string | null;
  sales: number;
}

export interface CustomerWeekdayPoint {
  weekday: number;
  sales: number;
}

export interface CustomerRecentSale {
  id: string;
  sold_at: string;
  total: number;
  items: number;
}

/** Aggregates used by the customer detail screen. */
export interface CustomerStats {
  purchase_count: number;
  units_bought: number;
  total_spent: number;
  average_ticket: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  /** Average days between purchases (`null` with fewer than two purchases). */
  average_days_between: number | null;
  top_products: CustomerTopProduct[];
  top_payment_methods: CustomerTopPaymentMethod[];
  by_weekday: CustomerWeekdayPoint[];
  recent_sales: CustomerRecentSale[];
}

export interface CustomerRepository {
  /** Creates the customer and links it to the store in one transaction. */
  save(customer: Customer, store_id: string): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  /** Existing customer with that phone, visible to the user (dedupe on create). */
  findByPhoneForUser(phone: string, user_id: string): Promise<Customer | null>;
  findLinkedCustomer(store_id: string, customer_id: string): Promise<Customer | null>;
  isLinked(store_id: string, customer_id: string): Promise<boolean>;
  /** Idempotent: restores the link when it already existed. */
  link(store_id: string, customer_id: string, created_by: string): Promise<void>;
  unlink(store_id: string, customer_id: string): Promise<void>;
  findMany(options: ListCustomersOptions): Promise<StoreCustomerLink[]>;
  update(customer: Customer): Promise<Customer>;
  /** Stores where this customer is still linked (used before hard-deleting). */
  countActiveLinks(customer_id: string): Promise<number>;
  hardDelete(id: string): Promise<void>;
  getStats(store_id: string, customer_id: string): Promise<CustomerStats>;
}
