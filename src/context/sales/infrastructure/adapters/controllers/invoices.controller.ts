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
import { DEFAULT_LIST_TAKE } from '../../../domain/constants';
import {
  STORES_USECASE,
  StoresUseCase,
} from '../../../domain/ports/in/stores.usecase';
import {
  INVOICES_USECASE,
  InvoicesUseCase,
} from '../../../domain/ports/in/invoices.usecase';
import {
  RECEIPTS_USECASE,
  ReceiptsUseCase,
} from '../../../domain/ports/in/receipts.usecase';
import { CreateInvoiceDto } from '../../../application/dtos/create-invoice.dto';
import { UpdateInvoiceDto } from '../../../application/dtos/update-invoice.dto';
import { PayInvoiceDto } from '../../../application/dtos/pay-invoice.dto';
import { InvoicesQueryDto } from '../dtos/invoices-query.dto';

/**
 * Invoices (facturas): created before payment, they become a sale + receipt
 * only when `POST /:id/pay` is called.
 */
@Controller('stores/:store_id/invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(
    @Inject(STORES_USECASE)
    private readonly storesUseCase: StoresUseCase,
    @Inject(INVOICES_USECASE)
    private readonly invoicesUseCase: InvoicesUseCase,
    @Inject(RECEIPTS_USECASE)
    private readonly receiptsUseCase: ReceiptsUseCase,
  ) {}

  private async assertMember(
    store_id: string,
    user: { userId: string },
  ): Promise<void> {
    await this.storesUseCase.getMemberStore(store_id, user.userId);
  }

  /** "Por cobrar" card: pending vs paid totals. */
  @Get('summary')
  async summary(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
  ) {
    await this.assertMember(store_id, user);
    return this.invoicesUseCase.totals(store_id);
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Query() query: InvoicesQueryDto,
  ) {
    await this.assertMember(store_id, user);
    const take = query.take ?? DEFAULT_LIST_TAKE;

    const results = await this.invoicesUseCase.list({
      store_id,
      take,
      cursor: query.cursor,
      status: query.status,
      customer_id: query.customer_id,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((invoice) => invoice.toPrimitives()),
      nextCursor,
    };
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const invoice = await this.invoicesUseCase.getById(store_id, id);
    return invoice.toPrimitives();
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    await this.assertMember(store_id, user);
    const invoice = await this.invoicesUseCase.create(
      store_id,
      user.userId,
      dto,
    );
    return invoice.toPrimitives();
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    await this.assertMember(store_id, user);
    const invoice = await this.invoicesUseCase.update(store_id, id, dto);
    return invoice.toPrimitives();
  }

  /** Cancels a pending invoice (it never becomes a sale or receipt). */
  @Post(':id/cancel')
  async cancel(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const invoice = await this.invoicesUseCase.cancel(
      store_id,
      id,
      user.userId,
    );
    return invoice.toPrimitives();
  }

  /**
   * Marks the invoice as paid: creates the sale and issues the receipt in the
   * same request (the receipt is never issued before payment).
   */
  @Post(':id/pay')
  async pay(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
    @Body() dto: PayInvoiceDto,
  ) {
    await this.assertMember(store_id, user);
    const { invoice, sale, receipt } = await this.invoicesUseCase.pay(
      store_id,
      id,
      user.userId,
      dto,
    );

    return {
      invoice: invoice.toPrimitives(),
      sale: sale.toPrimitives(),
      receipt: {
        ...receipt.toPrimitives(),
        // Token de verificación pública: el QR del ticket lo usa.
        verify_token: this.receiptsUseCase.verifyToken(receipt),
      },
    };
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const invoice = await this.invoicesUseCase.softDelete(store_id, id);
    return invoice.toPrimitives();
  }
}
