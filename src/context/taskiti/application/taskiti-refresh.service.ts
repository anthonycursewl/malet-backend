import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { TaskitiAuthService } from '../infrastructure/services/taskiti-auth.service';

@Injectable()
export class TaskitiRefreshService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskitiAuthService: TaskitiAuthService,
  ) {}

  async execute(refreshToken: string) {
    const tokens = await this.prisma.taskiti_refresh_tokens.findMany({
      where: { expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });

    let matchedUserId: string | null = null;
    for (const stored of tokens) {
      const match = await this.compareHash(refreshToken, stored.token_hash);
      if (match) {
        matchedUserId = stored.user_id;
        await this.prisma.taskiti_refresh_tokens.delete({
          where: { id: stored.id },
        });
        break;
      }
    }

    if (!matchedUserId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const record = await this.prisma.user.findUnique({
      where: { id: matchedUserId },
    });
    if (!record) {
      throw new UnauthorizedException('User not found');
    }

    const access_token = await this.taskitiAuthService.generateAccessToken({
      sub: record.id,
      email: record.email,
      name: record.name,
    });

    const new_refresh_token =
      await this.taskitiAuthService.generateRefreshToken(matchedUserId);

    return {
      tokens: {
        access_token,
        refresh_token: new_refresh_token,
      },
    };
  }

  private async compareHash(
    plain: string,
    hash: string,
  ): Promise<boolean> {
    const { compare } = await import('bcrypt');
    return compare(plain, hash);
  }
}
