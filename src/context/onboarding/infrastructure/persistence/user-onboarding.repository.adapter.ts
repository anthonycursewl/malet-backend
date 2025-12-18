import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
    UserOnboardingRepository,
    UpdateOnboardingData
} from '../../domain/ports/out/user-onboarding.repository';
import { UserOnboarding } from '../../domain/entities/user-onboarding.entity';

@Injectable()
export class UserOnboardingRepositoryAdapter implements UserOnboardingRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(onboarding: UserOnboarding): Promise<UserOnboarding> {
        const primitives = onboarding.toPrimitives();

        const saved = await this.prisma.user_onboarding.create({
            data: {
                id: primitives.id,
                user_id: primitives.userId,
                completed: primitives.completed,
                step_interests: primitives.stepInterests,
                step_communities: primitives.stepCommunities,
                step_profile: primitives.stepProfile,
                skipped: primitives.skipped,
                completed_at: primitives.completedAt,
                created_at: primitives.createdAt,
                updated_at: primitives.updatedAt
            }
        });

        return this.mapToDomain(saved);
    }

    async findByUserId(userId: string): Promise<UserOnboarding | null> {
        const onboarding = await this.prisma.user_onboarding.findUnique({
            where: { user_id: userId }
        });

        return onboarding ? this.mapToDomain(onboarding) : null;
    }

    async update(userId: string, data: UpdateOnboardingData): Promise<UserOnboarding> {
        const updateData: any = {
            updated_at: new Date()
        };

        if (data.stepInterests !== undefined) updateData.step_interests = data.stepInterests;
        if (data.stepCommunities !== undefined) updateData.step_communities = data.stepCommunities;
        if (data.stepProfile !== undefined) updateData.step_profile = data.stepProfile;
        if (data.completed !== undefined) updateData.completed = data.completed;
        if (data.skipped !== undefined) updateData.skipped = data.skipped;
        if (data.completedAt !== undefined) updateData.completed_at = data.completedAt;

        const updated = await this.prisma.user_onboarding.update({
            where: { user_id: userId },
            data: updateData
        });

        return this.mapToDomain(updated);
    }

    async getOrCreate(userId: string): Promise<UserOnboarding> {
        const existing = await this.findByUserId(userId);

        if (existing) {
            return existing;
        }

        const newOnboarding = UserOnboarding.create(userId);
        return this.create(newOnboarding);
    }

    private mapToDomain(data: any): UserOnboarding {
        return UserOnboarding.fromPrimitives({
            id: data.id,
            userId: data.user_id,
            completed: data.completed,
            stepInterests: data.step_interests,
            stepCommunities: data.step_communities,
            stepProfile: data.step_profile,
            skipped: data.skipped,
            completedAt: data.completed_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        });
    }
}
