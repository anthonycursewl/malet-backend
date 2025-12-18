import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { InterestCategoryRepository } from '../../domain/ports/out/interest-category.repository';
import { InterestCategory } from '../../domain/entities/interest-category.entity';

@Injectable()
export class InterestCategoryRepositoryAdapter implements InterestCategoryRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAllActive(): Promise<InterestCategory[]> {
        const categories = await this.prisma.interest_category.findMany({
            where: { is_active: true },
            orderBy: { order: 'asc' }
        });

        return categories.map(c => this.mapToDomain(c));
    }

    async findById(id: string): Promise<InterestCategory | null> {
        const category = await this.prisma.interest_category.findUnique({
            where: { id }
        });

        return category ? this.mapToDomain(category) : null;
    }

    async findBySlug(slug: string): Promise<InterestCategory | null> {
        const category = await this.prisma.interest_category.findUnique({
            where: { slug }
        });

        return category ? this.mapToDomain(category) : null;
    }

    async findByIds(ids: string[]): Promise<InterestCategory[]> {
        const categories = await this.prisma.interest_category.findMany({
            where: { id: { in: ids } }
        });

        return categories.map(c => this.mapToDomain(c));
    }

    async save(category: InterestCategory): Promise<InterestCategory> {
        const primitives = category.toPrimitives();

        const saved = await this.prisma.interest_category.create({
            data: {
                id: primitives.id,
                name: primitives.name,
                slug: primitives.slug,
                description: primitives.description,
                icon: primitives.icon,
                color: primitives.color,
                order: primitives.order,
                is_active: primitives.isActive,
                created_at: primitives.createdAt
            }
        });

        return this.mapToDomain(saved);
    }

    private mapToDomain(data: any): InterestCategory {
        return InterestCategory.fromPrimitives({
            id: data.id,
            name: data.name,
            slug: data.slug,
            description: data.description,
            icon: data.icon,
            color: data.color,
            order: data.order,
            isActive: data.is_active,
            createdAt: data.created_at
        });
    }
}
