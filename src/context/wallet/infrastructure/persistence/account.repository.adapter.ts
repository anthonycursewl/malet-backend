import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Account } from '../../domain/entities/account.entity';
import { AccountRepository } from '../../domain/ports/out/account.repository';
import { UpdateAccount } from '../../domain/ports/in/update-account.usecase';

@Injectable()
export class AccountRepositoryAdapter implements AccountRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(account: Account): Promise<Account> {
    const accountPrimitives = account.toPrimitives();
    const created = await this.prisma.accounts.create({
      data: {
        ...accountPrimitives,
        balance: accountPrimitives.balance,
      },
    });


    const primitives = {
      ...created,
      balance: Number(created.balance),
    };

    return Account.fromPrimitives(primitives);
  }

  async getAllAccounts(
    userId: string,
    take: number,
    cursor?: string,
  ): Promise<Account[] | []> {
    const accounts = await this.prisma.accounts.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      take: take,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: {
        created_at: 'desc',
      },
    });



    const primitives = accounts.map((account) => {
      return {
        ...account,
        balance: Number(account.balance),
      };
    });

    const fetchedAccounts = primitives.map((primitives) =>
      Account.fromPrimitives(primitives),
    );
    if (!fetchedAccounts) return [];

    return fetchedAccounts;
  }

  async update(
    accountId: string,
    updateAccountDto: UpdateAccount,
  ): Promise<Account> {
    const account = await this.prisma.accounts.update({
      where: {
        id: accountId,
      },
      data: updateAccountDto,
    });

    const primitives = {
      ...account,
      balance: Number(account.balance),
    };

    return Account.fromPrimitives(primitives);
  }

  async findById(
    accountId: string,
    includeDeleted = false,
  ): Promise<Account | null> {
    const account = await this.prisma.accounts.findUnique({
      where: {
        id: accountId,
      },
    });

    if (!account || (!includeDeleted && account.deleted_at)) return null;

    const primitives = {
      ...account,
      balance: Number(account.balance),
    };

    return Account.fromPrimitives(primitives);
  }


  async softDelete(accountId: string): Promise<void> {
    await this.prisma.accounts.update({
      where: { id: accountId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async restore(accountId: string): Promise<void> {
    await this.prisma.accounts.update({
      where: { id: accountId },
      data: {
        deleted_at: null,
        updated_at: new Date(),
      },
    });
  }

  async findDeletedOlderThan(date: Date): Promise<Account[]> {

    const accounts = await this.prisma.accounts.findMany({
      where: {
        deleted_at: {
          lt: date,
        },
      },
    });

    return accounts.map((account) => {
      const primitives = {
        ...account,
        balance: Number(account.balance),
      };
      return Account.fromPrimitives(primitives);
    });
  }

  async getDeletedAccounts(
    userId: string,
    take: number,
    cursor?: string,
  ): Promise<Account[] | []> {
    const accounts = await this.prisma.accounts.findMany({
      where: {
        user_id: userId,
        deleted_at: {
          not: null,
        },
      },
      take: take,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: {
        deleted_at: 'desc',
      },
    });


    return accounts.map((account) => {
      const primitives = {
        ...account,
        balance: Number(account.balance),
      };
      return Account.fromPrimitives(primitives);
    });
  }

  async delete(accountId: string): Promise<void> {
    await this.prisma.accounts.delete({
      where: { id: accountId },
    });
  }
}


