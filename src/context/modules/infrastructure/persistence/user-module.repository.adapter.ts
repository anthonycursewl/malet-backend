import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UserModuleRepository } from '../../domain/ports/out/user-module.repository';
import { UserModule } from '../../domain/entities/user-module.entity';

@Injectable()
export class UserModuleRepositoryAdapter implements UserModuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): UserModule {
    return UserModule.fromPrimitives({
      ...row,
      enabled_at: row.enabled_at ?? null,
    });
  }

  async findByUserAndKey(
    user_id: string,
    module_key: string,
  ): Promise<UserModule | null> {
    const row = await this.prisma.user_modules.findUnique({
      where: { user_id_module_key: { user_id, module_key } },
    });

    return row ? this.toEntity(row) : null;
  }

  async findManyByUser(user_id: string): Promise<UserModule[]> {
    const rows = await this.prisma.user_modules.findMany({
      where: { user_id },
    });
    return rows.map((row) => this.toEntity(row));
  }

  async save(module: UserModule): Promise<UserModule> {
    const data = module.toPrimitives();

    const row = await this.prisma.user_modules.upsert({
      where: {
        user_id_module_key: {
          user_id: data.user_id,
          module_key: data.module_key,
        },
      },
      create: {
        id: data.id,
        user_id: data.user_id,
        module_key: data.module_key,
        enabled: data.enabled,
        enabled_at: data.enabled_at ?? null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      update: {
        enabled: data.enabled,
        enabled_at: data.enabled_at ?? null,
        updated_at: data.updated_at,
      },
    });

    return this.toEntity(row);
  }
}
