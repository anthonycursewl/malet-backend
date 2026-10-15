import { Product } from '../../entities/product.entity';

export const PRODUCT_REPOSITORY_PORT = Symbol('PRODUCT_REPOSITORY_PORT');

export interface ListProductsOptions {
  store_id: string;
  take: number;
  cursor?: string;
  include_deleted?: boolean;
}

export interface ProductRepository {
  save(product: Product): Promise<Product>;
  findById(
    store_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Product | null>;
  /** Batch lookup (avoids N queries when validating a multi-product sale). */
  findManyByIds(
    store_id: string,
    ids: string[],
    include_deleted?: boolean,
  ): Promise<Product[]>;
  findMany(options: ListProductsOptions): Promise<Product[]>;
  update(product: Product): Promise<Product>;
  delete(id: string): Promise<Product>;
  restore(id: string): Promise<Product>;
  /** Throws ConflictException when the product still has sales referencing it. */
  hardDelete(id: string): Promise<void>;
}
