import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateSaleItemDto } from './dtos/create-sale.dto';
import { ProductRepository } from '../domain/ports/out/product.repository';
import { SaleItemInput } from '../domain/entities/sale-item.entity';

/**
 * Validates the lines of a cart/document in a **single query** and snapshots
 * their prices. A line is either a catalog `product_id` or a free concept
 * (service) identified by `name` + `unit_price`.
 */
export async function resolveLineInputs(
  productRepository: ProductRepository,
  store_id: string,
  items: CreateSaleItemDto[],
): Promise<SaleItemInput[]> {
  const ids = [
    ...new Set(
      items
        .map((item) => item.product_id)
        .filter((id): id is string => id != null),
    ),
  ];
  const products = ids.length
    ? await productRepository.findManyByIds(store_id, ids)
    : [];
  const byId = new Map(products.map((product) => [product.getId(), product]));

  return items.map((item) => {
    if (item.product_id) {
      const product = byId.get(item.product_id);
      if (!product) {
        throw new NotFoundException(
          'Product not found in this store (it may be deleted)',
        );
      }

      return {
        product_id: product.getId(),
        name: item.name?.trim() || product.getName(),
        item_type: 'product' as const,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? product.getPvp(),
        unit_cost: item.unit_cost ?? product.getCost(),
      };
    }

    // Free concept (service): the name and price are mandatory.
    const name = item.name?.trim();
    if (!name) {
      throw new BadRequestException(
        'Each item needs a product_id or a name (free concept)',
      );
    }
    if (item.unit_price === undefined) {
      throw new BadRequestException(
        `unit_price is required for the free concept "${name}"`,
      );
    }

    return {
      product_id: null,
      name,
      item_type: item.item_type ?? ('service' as const),
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price,
      unit_cost: item.unit_cost ?? 0,
    };
  });
}
