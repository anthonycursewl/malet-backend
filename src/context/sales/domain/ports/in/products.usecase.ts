import { Product } from '../../entities/product.entity';
import { CreateProductDto } from '../../../application/dtos/create-product.dto';
import { UpdateProductDto } from '../../../application/dtos/update-product.dto';

export const PRODUCTS_USECASE = Symbol('PRODUCTS_USECASE');

export interface ListProductsOptions {
  store_id: string;
  take: number;
  cursor?: string;
  include_deleted?: boolean;
}

export interface ProductsUseCase {
  create(
    store_id: string,
    user_id: string,
    dto: CreateProductDto,
  ): Promise<Product>;
  list(options: ListProductsOptions): Promise<Product[]>;
  getById(
    store_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Product>;
  update(store_id: string, id: string, dto: UpdateProductDto): Promise<Product>;
  softDelete(store_id: string, id: string): Promise<Product>;
  restore(store_id: string, id: string): Promise<Product>;
  /** Permanent delete: only the creator of the record can do it. */
  hardDelete(store_id: string, id: string, user_id: string): Promise<void>;
}
