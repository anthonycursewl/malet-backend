import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListProductsOptions,
  ProductsUseCase,
} from '../domain/ports/in/products.usecase';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { Product } from '../domain/entities/product.entity';
import {
  PRODUCT_REPOSITORY_PORT,
  ProductRepository,
} from '../domain/ports/out/product.repository';

@Injectable()
export class ProductsService implements ProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepository,
  ) {}

  async create(
    store_id: string,
    user_id: string,
    dto: CreateProductDto,
  ): Promise<Product> {
    const product = Product.create({ ...dto, store_id, created_by: user_id });
    return this.productRepository.save(product);
  }

  async list(options: ListProductsOptions): Promise<Product[]> {
    return this.productRepository.findMany(options);
  }

  async getById(
    store_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Product> {
    const product = await this.productRepository.findById(
      store_id,
      id,
      include_deleted,
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(
    store_id: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.getById(store_id, id);
    return this.productRepository.update(product.update(dto));
  }

  async softDelete(store_id: string, id: string): Promise<Product> {
    const product = await this.getById(store_id, id);
    return this.productRepository.delete(product.getId());
  }

  async restore(store_id: string, id: string): Promise<Product> {
    const product = await this.getById(store_id, id, true);
    return this.productRepository.restore(product.getId());
  }

  async hardDelete(
    store_id: string,
    id: string,
    user_id: string,
  ): Promise<void> {
    const product = await this.getById(store_id, id, true);
    if (product.getCreatedBy() !== user_id) {
      throw new ForbiddenException(
        'Only the creator of this record can permanently delete it',
      );
    }

    return this.productRepository.hardDelete(product.getId());
  }
}
