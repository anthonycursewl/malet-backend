import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../../prisma.service';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class TaskitiAuthService {
  private readonly jwtService: JwtService;
  private readonly REFRESH_TOKEN_BYTES = 48;
  private readonly REFRESH_DAYS = 30;
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.jwtService = new JwtService({
      secret: this.configService.get<string>('JWT_SECRET_TASKITI_APP'),
      signOptions: { expiresIn: '15m' },
    });
  }

  async generateAccessToken(payload: {
    sub: string;
    email: string;
    name: string;
  }): Promise<string> {
    return this.jwtService.sign({ ...payload, source: 'taskiti' });
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(this.REFRESH_TOKEN_BYTES).toString('hex');
    const hash = await bcrypt.hash(raw, this.SALT_ROUNDS);

    await this.prisma.taskiti_refresh_tokens.create({
      data: {
        user_id: userId,
        token_hash: hash,
        expires_at: new Date(Date.now() + this.REFRESH_DAYS * 86400000),
      },
    });

    return raw;
  }

  async rotateRefreshToken(
    userId: string,
    oldRawToken: string,
  ): Promise<TokenPair> {
    const stored = await this.prisma.taskiti_refresh_tokens.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const match = await bcrypt.compare(oldRawToken, stored.token_hash);
    if (!match || stored.expires_at < new Date()) {
      await this.prisma.taskiti_refresh_tokens.deleteMany({
        where: { id: stored.id },
      });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.taskiti_refresh_tokens.deleteMany({
      where: { id: stored.id },
    });

    const access_token = await this.generateAccessToken({
      sub: userId,
      email: '',
      name: '',
    });
    const refresh_token = await this.generateRefreshToken(userId);

    return { access_token, refresh_token };
  }

  async revokeRefreshTokens(userId: string): Promise<void> {
    await this.prisma.taskiti_refresh_tokens.deleteMany({
      where: { user_id: userId },
    });
  }
}
