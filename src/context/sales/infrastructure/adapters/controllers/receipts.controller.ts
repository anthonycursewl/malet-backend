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
  RECEIPTS_USECASE,
  ReceiptsUseCase,
} from '../../../domain/ports/in/receipts.usecase';
import { CreateReceiptDto } from '../../../application/dtos/create-receipt.dto';
import { UpdateReceiptDto } from '../../../application/dtos/update-receipt.dto';
import { Receipt } from '../../../domain/entities/receipt.entity';

@Controller('stores/:store_id/receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(
    @Inject(STORES_USECASE)
    private readonly storesUseCase: StoresUseCase,
    @Inject(RECEIPTS_USECASE)
    private readonly receiptsUseCase: ReceiptsUseCase,
  ) {}

  private async assertMember(
    store_id: string,
    user: { userId: string },
  ): Promise<void> {
    await this.storesUseCase.getMemberStore(store_id, user.userId);
  }

  /** Añade el token de verificación pública al recibo que consume la app. */
  private toResponse(receipt: Receipt) {
    return {
      ...receipt.toPrimitives(),
      verify_token: this.receiptsUseCase.verifyToken(receipt),
    };
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    await this.assertMember(store_id, user);
    const parsedTake = take ? Number(take) : DEFAULT_LIST_TAKE;

    const results = await this.receiptsUseCase.list({
      store_id,
      take: parsedTake,
      cursor,
    });

    const nextCursor =
      results.length === parsedTake
        ? results[results.length - 1].getId()
        : null;

    return {
      data: results.map((receipt) => receipt.toPrimitives()),
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
    const receipt = await this.receiptsUseCase.getById(store_id, id);
    return this.toResponse(receipt);
  }

  @Post('sales/:sale_id')
  async issue(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('sale_id') sale_id: string,
    @Body() dto: CreateReceiptDto,
  ) {
    await this.assertMember(store_id, user);
    const receipt = await this.receiptsUseCase.issue(
      store_id,
      sale_id,
      user.userId,
      dto,
    );
    return this.toResponse(receipt);
  }

  /** Corrección auditada del "Facturar a" (los importes no cambian). */
  @Put(':id')
  async updateCustomerName(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
    @Body() dto: UpdateReceiptDto,
  ) {
    await this.assertMember(store_id, user);
    const receipt = await this.receiptsUseCase.updateCustomerName(
      store_id,
      id,
      user.userId,
      dto,
    );
    return this.toResponse(receipt);
  }

  @Delete(':id')
  async softDelete(    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const receipt = await this.receiptsUseCase.softDelete(store_id, id);
    return receipt.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const receipt = await this.receiptsUseCase.restore(store_id, id);
    return receipt.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    await this.receiptsUseCase.hardDelete(store_id, id, user.userId);
    return { success: true };
  }
}
