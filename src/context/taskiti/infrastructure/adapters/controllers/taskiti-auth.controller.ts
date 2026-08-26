import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { SourceGuard } from '../../../../../auth/guards/source.guard';
import { Source } from '../../../../../auth/decorators/source.decorator';
import { PrismaService } from '../../../../../prisma.service';
import { TaskitiLoginService } from '../../../application/taskiti-login.service';
import { TaskitiRegisterService } from '../../../application/taskiti-register.service';
import { TaskitiRefreshService } from '../../../application/taskiti-refresh.service';
import { TaskitiLoginDto, TaskitiRegisterDto, TaskitiRefreshDto } from '../dtos/taskiti-auth.dto';

@Controller('auth/taskiti')
export class TaskitiAuthController {
  constructor(
    private readonly loginService: TaskitiLoginService,
    private readonly registerService: TaskitiRegisterService,
    private readonly refreshService: TaskitiRefreshService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @UseGuards(SourceGuard)
  @Source('taskiti')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: TaskitiLoginDto) {
    return this.loginService.execute(body.email, body.password);
  }

  @Post('register')
  @UseGuards(SourceGuard)
  @Source('taskiti')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: TaskitiRegisterDto) {
    return this.registerService.execute(body.name, body.email, body.password);
  }

  @Post('refresh')
  @UseGuards(SourceGuard)
  @Source('taskiti')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: TaskitiRefreshDto) {
    return this.refreshService.execute(body.refresh_token);
  }

  @Get('verify')
  @UseGuards(AuthGuard('taskiti-jwt'))
  @HttpCode(HttpStatus.OK)
  async verify(@Req() req: any) {
    const record = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!record) {
      throw new NotFoundException('User not found');
    }
    return {
      user: {
        id: record.id,
        name: record.name,
        email: record.email,
        avatar_url: record.avatar_url || null,
      },
    };
  }
}
