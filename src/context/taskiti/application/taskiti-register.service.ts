import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { User } from '../../../context/users/domain/entities/user.entity';
import { TaskitiAuthService } from '../infrastructure/services/taskiti-auth.service';

@Injectable()
export class TaskitiRegisterService {
  private readonly logger = new Logger(TaskitiRegisterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskitiAuthService: TaskitiAuthService,
  ) {}

  async execute(name: string, email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = await User.create({
      name,
      username: email.split('@')[0],
      email,
      password,
      avatar_url: undefined,
      banner_url: undefined,
    });

    const saved = await this.prisma.user.create({ data: user.toPrimitives() as any });

    const access_token = await this.taskitiAuthService.generateAccessToken({
      sub: saved.id,
      email: saved.email,
      name: saved.name,
    });

    const refresh_token = await this.taskitiAuthService.generateRefreshToken(
      saved.id,
    );

    this.logger.log(`Taskiti register: ${saved.email}`);

    return {
      user: {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        avatar_url: saved.avatar_url || null,
      },
      tokens: {
        access_token,
        refresh_token,
      },
    };
  }
}
