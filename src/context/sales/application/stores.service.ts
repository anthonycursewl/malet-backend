import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListStoresOptions,
  StoreDetail,
  StoresUseCase,
} from '../domain/ports/in/stores.usecase';
import { CreateStoreDto } from './dtos/create-store.dto';
import { UpdateStoreDto } from './dtos/update-store.dto';
import { Store } from '../domain/entities/store.entity';
import { StoreMember } from '../domain/entities/store-member.entity';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';

@Injectable()
export class StoresService implements StoresUseCase {
  constructor(
    @Inject(STORE_REPOSITORY_PORT)
    private readonly storeRepository: StoreRepository,
  ) {}

  async create(user_id: string, dto: CreateStoreDto): Promise<Store> {
    const store = Store.create({
      name: dto.name,
      user_id,
      currency: dto.currency,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
    });
    const ownerMember = StoreMember.create({
      store_id: store.getId(),
      user_id,
      created_by: user_id,
    });

    return this.storeRepository.saveWithOwnerMember(store, ownerMember);
  }

  async list(options: ListStoresOptions): Promise<Store[]> {
    return this.storeRepository.findStoresForMember(options);
  }

  async getMemberStore(store_id: string, user_id: string): Promise<Store> {
    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const membership = await this.storeRepository.findMembership(
      store_id,
      user_id,
    );
    if (!membership) {
      throw new ForbiddenException(
        'You are not an active member of this store',
      );
    }

    return store;
  }

  async detail(store_id: string, user_id: string): Promise<StoreDetail> {
    const store = await this.getMemberStore(store_id, user_id);
    const member_count =
      await this.storeRepository.countActiveMembers(store_id);
    return { store, member_count };
  }

  async update(store_id: string, user_id: string, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // La información de contacto y la política de recibos son **solo del dueño**
    // (el nombre y la moneda los puede cambiar cualquier miembro, como antes).
    const ownerOnlyChange =
      dto.phone !== undefined ||
      dto.email !== undefined ||
      dto.address !== undefined ||
      dto.receipt_mode !== undefined;

    if (ownerOnlyChange && store.getUserId() !== user_id) {
      throw new ForbiddenException(
        'Only the store owner can change the store information and the receipt policy',
      );
    }

    if (dto.currency !== undefined && dto.currency !== store.getCurrency()) {
      // Changing the currency would reinterpret every historical amount, so
      // it is only allowed while the store has no sales at all.
      const hasSales = await this.storeRepository.hasSales(store_id);
      if (hasSales) {
        throw new ConflictException(
          'The currency of a store cannot change once it has sales',
        );
      }
    }

    return this.storeRepository.update(store.update(dto));
  }

  async softDelete(store_id: string): Promise<Store> {
    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.storeRepository.delete(store_id);
  }

  async restore(store_id: string, user_id: string): Promise<Store> {
    const store = await this.storeRepository.findById(store_id, true);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const membership = await this.storeRepository.findMembership(
      store_id,
      user_id,
    );
    if (!membership) {
      throw new ForbiddenException(
        'You are not an active member of this store',
      );
    }

    return this.storeRepository.restore(store_id);
  }

  async hardDelete(store_id: string, user_id: string): Promise<void> {
    const store = await this.storeRepository.findById(store_id, true);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    if (store.getUserId() !== user_id) {
      throw new ForbiddenException(
        'Only the store owner can permanently delete this store',
      );
    }

    return this.storeRepository.hardDelete(store_id);
  }
}
