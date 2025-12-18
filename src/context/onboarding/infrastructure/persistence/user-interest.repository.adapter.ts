import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UserInterestRepository } from '../../domain/ports/out/user-interest.repository';
import { UserInterest, InterestSource } from '../../domain/entities/user-interest.entity';

@Injectable()
export class UserInterestRepositoryAdapter implements UserInterestRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(interest: UserInterest): Promise<UserInterest> {
        const primitives = interest.toPrimitives();

        const saved = await this.prisma.user_interest.create({
            data: {
                id: primitives.id,
                user_id: primitives.userId,
                category_id: primitives.categoryId,
                weight: primitives.weight,
                source: primitives.source,
                created_at: primitives.createdAt,
                updated_at: primitives.updatedAt
            }
        });

        return this.mapToDomain(saved);
    }

    async saveMany(interests: UserInterest[]): Promise<UserInterest[]> {
        const results: UserInterest[] = [];

        for (const interest of interests) {
            const saved = await this.save(interest);
            results.push(saved);
        }

        return results;
    }

    async findByUserId(userId: string): Promise<UserInterest[]> {
        const interests = await this.prisma.user_interest.findMany({
            where: { user_id: userId },
            orderBy: { weight: 'desc' }
        });

        return interests.map(i => this.mapToDomain(i));
    }

    async findByUserAndCategory(userId: string, categoryId: string): Promise<UserInterest | null> {
        const interest = await this.prisma.user_interest.findUnique({
            where: {
                user_id_category_id: {
                    user_id: userId,
                    category_id: categoryId
                }
            }
        });

        return interest ? this.mapToDomain(interest) : null;
    }

    async updateWeight(id: string, weight: number): Promise<UserInterest> {
        const updated = await this.prisma.user_interest.update({
            where: { id },
            data: {
                weight,
                updated_at: new Date()
            }
        });

        return this.mapToDomain(updated);
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.prisma.user_interest.deleteMany({
            where: { user_id: userId }
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.user_interest.delete({
            where: { id }
        });
    }

    private mapToDomain(data: any): UserInterest {
        return UserInterest.fromPrimitives({
            id: data.id,
            userId: data.user_id,
            categoryId: data.category_id,
            weight: data.weight,
            source: data.source as InterestSource,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        });
    }
}
