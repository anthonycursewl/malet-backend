import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ModuleStatus,
  ModulesUseCase,
} from '../domain/ports/in/modules.usecase';
import {
  USER_MODULE_REPOSITORY_PORT,
  UserModuleRepository,
} from '../domain/ports/out/user-module.repository';
import { UserModule } from '../domain/entities/user-module.entity';
import {
  AVAILABLE_MODULES,
  AvailableModule,
  ModuleKey,
  findAvailableModule,
} from '../domain/constants';

@Injectable()
export class ModulesService implements ModulesUseCase {
  constructor(
    @Inject(USER_MODULE_REPOSITORY_PORT)
    private readonly userModuleRepository: UserModuleRepository,
  ) {}

  async list(user_id: string): Promise<ModuleStatus[]> {
    const rows = await this.userModuleRepository.findManyByUser(user_id);
    const byKey = new Map(rows.map((row) => [row.getModuleKey(), row]));

    return AVAILABLE_MODULES.map((module) =>
      this.toStatus(module, byKey.get(module.key) ?? null),
    );
  }

  async setEnabled(
    user_id: string,
    key: ModuleKey,
    enabled: boolean,
  ): Promise<ModuleStatus> {
    const available = this.resolveAvailable(key);
    const existing = await this.userModuleRepository.findByUserAndKey(
      user_id,
      key,
    );

    const module = existing
      ? enabled
        ? existing.enable()
        : existing.disable()
      : UserModule.create({ user_id, module_key: key, enabled });

    const saved = await this.userModuleRepository.save(module);
    return this.toStatus(available, saved);
  }

  async assertEnabled(user_id: string, key: ModuleKey): Promise<void> {
    const available = this.resolveAvailable(key);
    if (!available.opt_in) {
      return;
    }

    const row = await this.userModuleRepository.findByUserAndKey(user_id, key);
    if (!row || !row.isEnabled()) {
      throw new ForbiddenException(
        `The "${key}" module is not enabled for this user`,
      );
    }
  }

  private resolveAvailable(key: string): AvailableModule {
    const available = findAvailableModule(key);
    if (!available) {
      throw new NotFoundException(`Unknown module "${key}"`);
    }
    return available;
  }

  private toStatus(
    available: AvailableModule,
    row: UserModule | null,
  ): ModuleStatus {
    return {
      key: available.key,
      name: available.name,
      description: available.description,
      opt_in: available.opt_in,
      enabled: row?.isEnabled() ?? false,
      enabled_at: row?.getEnabledAt() ?? null,
    };
  }
}
