import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateCustomerResult,
  CustomersUseCase,
  ListCustomersFilters,
} from '../domain/ports/in/customers.usecase';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { Customer } from '../domain/entities/customer.entity';
import {
  CUSTOMER_REPOSITORY_PORT,
  CustomerRepository,
  CustomerStats,
  StoreCustomerLink,
} from '../domain/ports/out/customer.repository';

@Injectable()
export class CustomersService implements CustomersUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY_PORT)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async list(filters: ListCustomersFilters): Promise<StoreCustomerLink[]> {
    return this.customerRepository.findMany({
      store_id: filters.store_id,
      take: filters.take,
      cursor: filters.cursor,
      search: filters.search?.trim() || undefined,
    });
  }

  async getById(store_id: string, customer_id: string): Promise<Customer> {
    const customer = await this.customerRepository.findLinkedCustomer(
      store_id,
      customer_id,
    );
    if (!customer) {
      throw new NotFoundException('Customer not found in this store');
    }
    return customer;
  }

  async create(
    store_id: string,
    user_id: string,
    dto: CreateCustomerDto,
  ): Promise<CreateCustomerResult> {
    // Dedupe: if the phone already exists in a store the user can see, the
    // existing customer is linked instead of creating a duplicate record.
    if (dto.phone) {
      const existing = await this.customerRepository.findByPhoneForUser(
        dto.phone.trim(),
        user_id,
      );
      if (existing) {
        await this.customerRepository.link(store_id, existing.getId(), user_id);
        return { customer: existing, linked_existing: true };
      }
    }

    const customer = Customer.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      created_by: user_id,
    });

    const saved = await this.customerRepository.save(customer, store_id);
    return { customer: saved, linked_existing: false };
  }

  async link(
    store_id: string,
    user_id: string,
    customer_id: string,
  ): Promise<Customer> {
    const customer = await this.customerRepository.findById(customer_id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const alreadyLinked = await this.customerRepository.isLinked(
      store_id,
      customer_id,
    );
    if (alreadyLinked) {
      throw new ConflictException('Customer is already linked to this store');
    }

    await this.customerRepository.link(store_id, customer_id, user_id);
    return customer;
  }

  async update(
    store_id: string,
    customer_id: string,
    dto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.getById(store_id, customer_id);
    return this.customerRepository.update(customer.update(dto));
  }

  async unlink(store_id: string, customer_id: string): Promise<void> {
    await this.getById(store_id, customer_id);
    await this.customerRepository.unlink(store_id, customer_id);
  }

  async hardDelete(
    store_id: string,
    customer_id: string,
    user_id: string,
  ): Promise<void> {
    const customer = await this.getById(store_id, customer_id);

    if (customer.getCreatedBy() !== user_id) {
      throw new ForbiddenException(
        'Only the creator of this record can permanently delete it',
      );
    }

    // The identity is shared: it cannot be destroyed while another store uses it.
    const links = await this.customerRepository.countActiveLinks(customer_id);
    if (links > 1) {
      throw new ConflictException(
        'This customer is linked to other stores; unlink it there first',
      );
    }

    await this.customerRepository.hardDelete(customer_id);
  }

  async stats(store_id: string, customer_id: string): Promise<CustomerStats> {
    await this.getById(store_id, customer_id);
    return this.customerRepository.getStats(store_id, customer_id);
  }
  async assertLinked(store_id: string, customer_id: string): Promise<Customer> {
    return this.getById(store_id, customer_id);
  }
}
