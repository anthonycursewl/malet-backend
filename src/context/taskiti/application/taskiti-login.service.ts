import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { User } from '../../../context/users/domain/entities/user.entity';
import { TaskitiAuthService } from '../infrastructure/services/taskiti-auth.service';

@Injectable()
export class TaskitiLoginService {
  private readonly logger = new Logger(TaskitiLoginService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskitiAuthService: TaskitiAuthService,
  ) {}

  async execute(email: string, password: string) {
    const record = await this.prisma.user.findUnique({ where: { email } });
    if (!record) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = User.fromPrimitives(record);
    const valid = await user.comparePassword(password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = await this.taskitiAuthService.generateAccessToken({
      sub: user.getId(),
      email: user.getEmail(),
      name: user.getName(),
    });

    const refresh_token = await this.taskitiAuthService.generateRefreshToken(
      user.getId(),
    );

    this.logger.log(`Taskiti login: ${user.getEmail()}`);

    return {
      user: {
        id: user.getId(),
        name: user.getName(),
        email: user.getEmail(),
        avatar_url: user.getAvatarUrl() || null,
      },
      tokens: {
        access_token,
        refresh_token,
      },
    };
  }
}
