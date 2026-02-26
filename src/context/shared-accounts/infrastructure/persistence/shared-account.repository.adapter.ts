import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SharedAccountRepository, GetSharedAccountsOptions } from '../../domain/ports/out/shared-account.repository';
import { SharedAccount } from '../../domain/entities/shared-account.entity';

@Injectable()
export class SharedAccountRepositoryAdapter implements SharedAccountRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(sharedAccount: SharedAccount): Promise<SharedAccount> {
        const data = sharedAccount.toPrimitives();

        const created = await this.prisma.shared_accounts.create({
            data: {
                ...data,
                deleted_at: data.deleted_at || null,
            },
        });

        return SharedAccount.fromPrimitives({
            ...created,
            deleted_at: created.deleted_at || undefined,
        });
    }

    async findById(id: string): Promise<SharedAccount | null> {
        const result = await this.prisma.shared_accounts.findUnique({
            where: { id },
        });

        if (!result || result.deleted_at !== null) return null;

        return SharedAccount.fromPrimitives({
            ...result,
            deleted_at: result.deleted_at || undefined,
        });
    }

    async getSharedAccounts(options: GetSharedAccountsOptions): Promise<SharedAccount[]> {
        const { take, cursor, user_id, account_id } = options;

        const queryOptions: any = {
            where: {
                user_id,
                ...(account_id && { account_id }),
                deleted_at: null,
            },
            take,
            ...(cursor && {
                skip: 1,
                cursor: { id: cursor },
            }),
            orderBy: {
                created_at: 'desc',
            },
        };

        const results = await this.prisma.shared_accounts.findMany(queryOptions);

        return results.map((result) =>
            SharedAccount.fromPrimitives({
                ...result,
                deleted_at: result.deleted_at || undefined,
            }),
        );
    }

    async update(sharedAccount: SharedAccount): Promise<SharedAccount> {
        const data = sharedAccount.toPrimitives();

        const updated = await this.prisma.shared_accounts.update({
            where: { id: data.id },
            data: {
                name: data.name,
                phone_associated: data.phone_associated,
                email_associated: data.email_associated,
                account_id: data.account_id,
                identification_number: data.identification_number,
                user_id: data.user_id,
                updated_at: data.updated_at,
            },
        });

        return SharedAccount.fromPrimitives({
            ...updated,
            deleted_at: updated.deleted_at || undefined,
        });
    }

    async delete(id: string): Promise<SharedAccount> {
        const deleted = await this.prisma.shared_accounts.update({
            where: { id },
            data: { deleted_at: new Date() },
        });

        return SharedAccount.fromPrimitives({
            ...deleted,
            deleted_at: deleted.deleted_at || undefined,
        });
    }

    async restore(id: string): Promise<SharedAccount> {
        const restored = await this.prisma.shared_accounts.update({
            where: { id },
            data: { deleted_at: null },
        });

        return SharedAccount.fromPrimitives({
            ...restored,
            deleted_at: restored.deleted_at || undefined,
        });
    }

    async hardDelete(id: string): Promise<void> {
        await this.prisma.shared_accounts.delete({
            where: { id },
        });
    }
}
