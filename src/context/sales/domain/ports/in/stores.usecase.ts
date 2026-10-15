import { Store } from '../../entities/store.entity';
import { CreateStoreDto } from '../../../application/dtos/create-store.dto';
import { UpdateStoreDto } from '../../../application/dtos/update-store.dto';

export const STORES_USECASE = Symbol('STORES_USECASE');

export interface ListStoresOptions {
  user_id: string;
  take: number;
  cursor?: string;
}

export interface StoreDetail {
  store: Store;
  member_count: number;
}

export interface StoresUseCase {
  create(user_id: string, dto: CreateStoreDto): Promise<Store>;
  list(options: ListStoresOptions): Promise<Store[]>;
  /** Returns the store only if it exists (not soft-deleted) and the user is an active member. */
  getMemberStore(store_id: string, user_id: string): Promise<Store>;
  detail(store_id: string, user_id: string): Promise<StoreDetail>;
  update(store_id: string, user_id: string, dto: UpdateStoreDto): Promise<Store>;
  softDelete(store_id: string): Promise<Store>;
  /** Works on soft-deleted stores; requires an active membership. */
  restore(store_id: string, user_id: string): Promise<Store>;
  /** Permanent wipe: only the store owner can do it. */
  hardDelete(store_id: string, user_id: string): Promise<void>;
}
