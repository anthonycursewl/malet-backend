import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  STORES_USECASE,
  StoresUseCase,
} from '../../../domain/ports/in/stores.usecase';
import {
  PAYMENT_METHODS_USECASE,
  PaymentMethodsUseCase,
} from '../../../domain/ports/in/payment-methods.usecase';
import { CreatePaymentMethodDto } from '../../../application/dtos/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../../../application/dtos/update-payment-method.dto';

@Controller('stores/:store_id/payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(
    @Inject(STORES_USECASE)
    private readonly storesUseCase: StoresUseCase,
    @Inject(PAYMENT_METHODS_USECASE)
    private readonly paymentMethodsUseCase: PaymentMethodsUseCase,
  ) {}

  private async assertMember(
    store_id: string,
    user: { userId: string },
  ): Promise<void> {
    await this.storesUseCase.getMemberStore(store_id, user.userId);
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
  ) {
    await this.assertMember(store_id, user);
    const methods = await this.paymentMethodsUseCase.list({ store_id });
    return { data: methods.map((method) => method.toPrimitives()) };
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    await this.assertMember(store_id, user);
    const method = await this.paymentMethodsUseCase.create(
      store_id,
      user.userId,
      dto,
    );
    return method.toPrimitives();
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const method = await this.paymentMethodsUseCase.getById(store_id, id);
    return method.toPrimitives();
  }

  /** Renames and/or activates/deactivates the payment method. */
  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    await this.assertMember(store_id, user);
    const method = await this.paymentMethodsUseCase.update(store_id, id, dto);
    return method.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const method = await this.paymentMethodsUseCase.softDelete(store_id, id);
    return method.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const method = await this.paymentMethodsUseCase.restore(store_id, id);
    return method.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    await this.paymentMethodsUseCase.hardDelete(store_id, id, user.userId);
    return { success: true };
  }
}
