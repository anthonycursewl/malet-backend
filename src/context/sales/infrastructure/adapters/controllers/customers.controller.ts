import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  STORES_USECASE,
  StoresUseCase,
} from '../../../domain/ports/in/stores.usecase';
import {
  CUSTOMERS_USECASE,
  CustomersUseCase,
} from '../../../domain/ports/in/customers.usecase';
import { CreateCustomerDto } from '../../../application/dtos/create-customer.dto';
import { UpdateCustomerDto } from '../../../application/dtos/update-customer.dto';
import { LinkCustomerDto } from '../../../application/dtos/link-customer.dto';
import { CustomersQueryDto } from '../dtos/customers-query.dto';

const DEFAULT_CUSTOMERS_TAKE = 20;

@Controller('stores/:store_id/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(
    @Inject(STORES_USECASE)
    private readonly storesUseCase: StoresUseCase,
    @Inject(CUSTOMERS_USECASE)
    private readonly customersUseCase: CustomersUseCase,
  ) {}

  private async assertMember(
    store_id: string,
    user: { userId: string },
  ): Promise<void> {
    await this.storesUseCase.getMemberStore(store_id, user.userId);
  }

  /**
   * Keyset paginated list (cursor = `seq`, the auto-increment of the link).
   * `nextCursor` is the `seq` of the last row of the page.
   */
  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Query() query: CustomersQueryDto,
  ) {
    await this.assertMember(store_id, user);
    const take = query.take ?? DEFAULT_CUSTOMERS_TAKE;

    const results = await this.customersUseCase.list({
      store_id,
      take,
      cursor: query.cursor,
      search: query.search,
    });

    const nextCursor =
      results.length === take ? String(results[results.length - 1].seq) : null;

    return {
      data: results.map((link) => ({
        ...link.customer.toPrimitives(),
        seq: link.seq,
        linked_at: link.linked_at,
      })),
      nextCursor,
    };
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Body() dto: CreateCustomerDto,
  ) {
    await this.assertMember(store_id, user);
    const { customer, linked_existing } = await this.customersUseCase.create(
      store_id,
      user.userId,
      dto,
    );

    return { ...customer.toPrimitives(), linked_existing };
  }

  /** Shares an existing customer with this store. */
  @Post('link')
  async link(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Body() dto: LinkCustomerDto,
  ) {
    await this.assertMember(store_id, user);
    const customer = await this.customersUseCase.link(
      store_id,
      user.userId,
      dto.customer_id,
    );

    return customer.toPrimitives();
  }

  @Get(':customer_id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('customer_id') customer_id: string,
  ) {
    await this.assertMember(store_id, user);
    const customer = await this.customersUseCase.getById(store_id, customer_id);
    return customer.toPrimitives();
  }

  /** Purchases, top products, payment methods, frequency and weekday habits. */
  @Get(':customer_id/stats')
  async stats(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('customer_id') customer_id: string,
  ) {
    await this.assertMember(store_id, user);
    return this.customersUseCase.stats(store_id, customer_id);
  }

  @Put(':customer_id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('customer_id') customer_id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    await this.assertMember(store_id, user);
    const customer = await this.customersUseCase.update(
      store_id,
      customer_id,
      dto,
    );
    return customer.toPrimitives();
  }

  /** Removes the customer from this store (other stores keep their link). */
  @Delete(':customer_id')
  async unlink(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('customer_id') customer_id: string,
  ) {
    await this.assertMember(store_id, user);
    await this.customersUseCase.unlink(store_id, customer_id);
    return { success: true };
  }

  @Delete(':customer_id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('customer_id') customer_id: string,
  ) {
    await this.assertMember(store_id, user);
    await this.customersUseCase.hardDelete(store_id, customer_id, user.userId);
    return { success: true };
  }
}
