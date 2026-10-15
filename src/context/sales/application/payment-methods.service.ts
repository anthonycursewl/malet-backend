import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListPaymentMethodsOptions,
  PaymentMethodsUseCase,
} from '../domain/ports/in/payment-methods.usecase';
import { CreatePaymentMethodDto } from './dtos/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dtos/update-payment-method.dto';
import { PaymentMethod } from '../domain/entities/payment-method.entity';
import {
  PAYMENT_METHOD_REPOSITORY_PORT,
  PaymentMethodRepository,
} from '../domain/ports/out/payment-method.repository';

@Injectable()
export class PaymentMethodsService implements PaymentMethodsUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY_PORT)
    private readonly paymentMethodRepository: PaymentMethodRepository,
  ) {}

  async create(
    store_id: string,
    user_id: string,
    dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    const paymentMethod = PaymentMethod.create({
      ...dto,
      store_id,
      created_by: user_id,
    });
    return this.paymentMethodRepository.save(paymentMethod);
  }

  async list(options: ListPaymentMethodsOptions): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.findMany(options);
  }

  async getById(
    store_id: string,
    id: string,
    include_deleted = false,
  ): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findById(
      store_id,
      id,
      include_deleted,
    );
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    return paymentMethod;
  }

  async update(
    store_id: string,
    id: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    const paymentMethod = await this.getById(store_id, id);
    return this.paymentMethodRepository.update(paymentMethod.update(dto));
  }

  async softDelete(store_id: string, id: string): Promise<PaymentMethod> {
    const paymentMethod = await this.getById(store_id, id);
    return this.paymentMethodRepository.delete(paymentMethod.getId());
  }

  async restore(store_id: string, id: string): Promise<PaymentMethod> {
    const paymentMethod = await this.getById(store_id, id, true);
    return this.paymentMethodRepository.restore(paymentMethod.getId());
  }

  async hardDelete(
    store_id: string,
    id: string,
    user_id: string,
  ): Promise<void> {
    const paymentMethod = await this.getById(store_id, id, true);
    if (paymentMethod.getCreatedBy() !== user_id) {
      throw new ForbiddenException(
        'Only the creator of this record can permanently delete it',
      );
    }

    return this.paymentMethodRepository.hardDelete(paymentMethod.getId());
  }
}
