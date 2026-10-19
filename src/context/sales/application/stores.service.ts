import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
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
import {
  FILE_STORAGE_PORT,
  FileStoragePort,
} from 'src/shared/infrastructure/file-storage/file-storage.port';
import {
  IMAGE_PROCESSOR_PORT,
  ImageProcessorPort,
} from 'src/shared/infrastructure/image-processing/image-processor.port';
import { StorePhotoVariants } from '../domain/entities/store.entity';
import {
  STORE_NOTIFICATIONS_USECASE,
  StoreNotificationsUseCase,
} from '../domain/ports/in/store-notifications.usecase';

/** Resoluciones que genera el servidor (ancho máximo en px). */
const PHOTO_WIDTHS: Record<
  'avatar' | 'banner',
  Record<'small' | 'medium' | 'large', number>
> = {
  avatar: { small: 96, medium: 256, large: 512 },
  banner: { small: 480, medium: 960, large: 1600 },
};

@Injectable()
export class StoresService implements StoresUseCase {
  constructor(
    @Inject(STORE_REPOSITORY_PORT)
    private readonly storeRepository: StoreRepository,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort,
    @Inject(IMAGE_PROCESSOR_PORT)
    private readonly imageProcessor: ImageProcessorPort,
    @Inject(STORE_NOTIFICATIONS_USECASE)
    private readonly notifications: StoreNotificationsUseCase,
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

  async update(
    store_id: string,
    user_id: string,
    dto: UpdateStoreDto,
  ): Promise<Store> {
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

    const updated = await this.storeRepository.update(store.update(dto));

    // Aviso por email (fire-and-forget: no bloquea la respuesta).
    void this.notifications.notify(store_id, 'store_updated', {
      subject: `${updated.getName()} · Tienda actualizada`,
      title: 'Configuración de la tienda actualizada',
      intro: `Se actualizó la configuración de "${updated.getName()}".`,
      actor_id: user_id,
      rows: [{ label: 'Cambios', value: this.describeChanges(dto) }],
      footerNote:
        'Recibes este aviso porque el dueño de la tienda te añadió a los avisos por correo.',
    });

    return updated;
  }

  /** Nombres legibles de los campos cambiados (para el correo). */
  private describeChanges(dto: UpdateStoreDto): string {
    const labels: Record<string, string> = {
      name: 'nombre',
      currency: 'moneda',
      phone: 'teléfono',
      email: 'correo',
      address: 'dirección',
      receipt_mode: 'política de recibos',
    };

    const changed = Object.keys(dto).map((key) => labels[key] ?? key);
    return changed.length > 0 ? changed.join(', ') : 'sin cambios';
  }

  /**
   * Fotos de la tienda (avatar o banner): recibe **una** imagen ya acotada por
   * el cliente y el servidor genera las 3 resoluciones con `sharp`.
   * **Solo el dueño** puede cambiarlas; los archivos anteriores se borran.
   */
  async updatePhotos(
    store_id: string,
    user_id: string,
    kind: 'avatar' | 'banner',
    file: Express.Multer.File,
  ): Promise<Store> {
    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    if (store.getUserId() !== user_id) {
      throw new ForbiddenException(
        'Only the store owner can change the store photos',
      );
    }

    const previous = store.getPhotos(kind);
    const folder = `stores/${store_id}/${kind}`;
    const widths = PHOTO_WIDTHS[kind];
    const uploaded: StorePhotoVariants = {};

    for (const size of ['small', 'medium', 'large'] as const) {
      let resized;
      try {
        resized = await this.imageProcessor.resize(file, widths[size]);
      } catch {
        throw new BadRequestException('The uploaded file is not a valid image');
      }

      uploaded[size] = await this.fileStorage.uploadFile({
        file: resized.buffer,
        fileName: resized.fileName,
        mimeType: resized.mimeType,
        folder,
      });
    }

    // Limpieza: los archivos anteriores se borran al reemplazarlos.
    await Promise.all(
      Object.values(previous)
        .filter((url): url is string => !!url)
        .map((url) => this.fileStorage.deleteFile(url)),
    );

    return this.storeRepository.update(store.withPhotos(kind, uploaded));
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
