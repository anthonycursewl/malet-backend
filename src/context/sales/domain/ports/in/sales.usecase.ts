import { Sale } from '../../entities/sale.entity';
import { CreateSaleDto } from '../../../application/dtos/create-sale.dto';
import { UpdateSaleDto } from '../../../application/dtos/update-sale.dto';
import { CreateSaleResult } from '../../../application/sales.service';
import { ListSalesFilters } from '../../types';

export const SALES_USECASE = Symbol('SALES_USECASE');

export interface SalesUseCase {
  /** Creates the sale and, when requested, its receipt in the same request. */
  create(
    store_id: string,
    user_id: string,
    dto: CreateSaleDto,
  ): Promise<CreateSaleResult>;
  list(filters: ListSalesFilters): Promise<Sale[]>;
  getById(
    store_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Sale>;
  update(store_id: string, id: string, dto: UpdateSaleDto): Promise<Sale>;
  softDelete(store_id: string, id: string): Promise<Sale>;
  restore(store_id: string, id: string): Promise<Sale>;
  /** Permanent delete: only the creator of the record can do it. */
  hardDelete(store_id: string, id: string, user_id: string): Promise<void>;
}
