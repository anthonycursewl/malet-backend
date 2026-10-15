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
  PRODUCTS_USECASE,
  ProductsUseCase,
} from '../../../domain/ports/in/products.usecase';
import { CreateProductDto } from '../../../application/dtos/create-product.dto';
import { UpdateProductDto } from '../../../application/dtos/update-product.dto';
import { ListQueryDto } from '../dtos/list-query.dto';

@Controller('stores/:store_id/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    @Inject(STORES_USECASE)
    private readonly storesUseCase: StoresUseCase,
    @Inject(PRODUCTS_USECASE)
    private readonly productsUseCase: ProductsUseCase,
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
    @Query() query: ListQueryDto,
  ) {
    await this.assertMember(store_id, user);
    const take = query.take ?? DEFAULT_LIST_TAKE;

    const results = await this.productsUseCase.list({
      store_id,
      take,
      cursor: query.cursor,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((product) => product.toPrimitives()),
      nextCursor,
    };
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Body() dto: CreateProductDto,
  ) {
    await this.assertMember(store_id, user);
    const product = await this.productsUseCase.create(
      store_id,
      user.userId,
      dto,
    );
    return product.toPrimitives();
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const product = await this.productsUseCase.getById(store_id, id);
    return product.toPrimitives();
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    await this.assertMember(store_id, user);
    const product = await this.productsUseCase.update(store_id, id, dto);
    return product.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const product = await this.productsUseCase.softDelete(store_id, id);
    return product.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    const product = await this.productsUseCase.restore(store_id, id);
    return product.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('store_id') store_id: string,
    @Param('id') id: string,
  ) {
    await this.assertMember(store_id, user);
    await this.productsUseCase.hardDelete(store_id, id, user.userId);
    return { success: true };
  }
}
