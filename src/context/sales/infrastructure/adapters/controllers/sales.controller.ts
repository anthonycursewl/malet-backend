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
  SALES_USECASE,
  SalesUseCase,
} from '../../../domain/ports/in/sales.usecase';
import {
  SALES_REPORTS_USECASE,
  SalesReportsUseCase,
} from '../../../domain/ports/in/sales-reports.usecase';
import {
  RECEIPTS_USECASE,
  ReceiptsUseCase,
} from '../../../domain/ports/in/receipts.usecase';
import { CreateSaleDto } from '../../../application/dtos/create-sale.dto';
import { UpdateSaleDto } from '../../../application/dtos/update-sale.dto';
import { SalesQueryDto } from '../dtos/sales-query.dto';
import { SalesSeriesQueryDto } from '../dtos/sales-series-query.dto';

@Controller('stores/:store_id/sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(
    @Inject(STORES_USECASE)
    private readonly storesUseCase: StoresUseCase,
    @Inject(SALES_USECASE)
    private readonly salesUseCase: SalesUseCase,
    @Inject(SALES_REPORTS_USECASE)
    private readonly salesReportsUseCase: SalesReportsUseCase,
    @Inject(RECEIPTS_USECASE)
    private readonly receiptsUseCase: ReceiptsUseCase,
  ) {}

  private async assertMember(
    store_id: string,
    user: { userId: string },
  ): Promise<void> {
    await this.storesUseCase.getMemberStore(store_id, user.userId);
  }

  /** Pre-computed totals for a date range (custom or preset). */
  @Get('summary')
  async summary(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Query() query: SalesQueryDto,
  ) {
    await this.assertMember(store_id, user);
    return this.salesReportsUseCase.summary({
      store_id,
      payment_method_id: query.payment_method_id,
      product_id: query.product_id,
      preset: query.preset,
      from: query.from,
      to: query.to,
    });
  }

  /** Sales bucketed by day/week/month for a date range (custom or preset). */
  @Get('series')
  async series(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Query() query: SalesSeriesQueryDto,
  ) {
    await this.assertMember(store_id, user);
    return this.salesReportsUseCase.series({
      store_id,
      payment_method_id: query.payment_method_id,
      product_id: query.product_id,
      preset: query.preset,
      from: query.from,
      to: query.to,
      period: query.period,
    });
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Query() query: SalesQueryDto,
  ) {
    await this.assertMember(store_id, user);
    const take = query.take ?? DEFAULT_LIST_TAKE;

    const results = await this.salesUseCase.list({
      store_id,
      take,
      cursor: query.cursor,
      payment_method_id: query.payment_method_id,
      product_id: query.product_id,
      preset: query.preset,
      from: query.from,
      to: query.to,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((sale) => sale.toPrimitives()),
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
    const sale = await this.salesUseCase.getById(store_id, id);
    return sale.toPrimitives();
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Body() dto: CreateSaleDto,
  ) {
    await this.assertMember(store_id, user);
    const { sale, receipt } = await this.salesUseCase.create(
      store_id,
      user.userId,
      dto,
    );

    return {
      ...sale.toPrimitives(),
      receipt: receipt
        ? {
            ...receipt.toPrimitives(),
            // Token de verificación pública: el QR del ticket lo usa.
            verify_token: this.receiptsUseCase.verifyToken(receipt),
          }
        : null,
    };
  }

  /** Receipt issued for this sale (404 when it has none). */
  @Get(':id/receipt')
  async receipt(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const receipt = await this.receiptsUseCase.getBySaleId(store_id, id);
    return {
      ...receipt.toPrimitives(),
      verify_token: this.receiptsUseCase.verifyToken(receipt),
    };
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
    @Body() dto: UpdateSaleDto,
  ) {
    await this.assertMember(store_id, user);
    const sale = await this.salesUseCase.update(store_id, id, dto);
    return sale.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const sale = await this.salesUseCase.softDelete(store_id, id);
    return sale.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const sale = await this.salesUseCase.restore(store_id, id);
    return sale.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    await this.salesUseCase.hardDelete(store_id, id, user.userId);
    return { success: true };
  }
}
