import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SourceGuard } from '../../../../../auth/guards/source.guard';
import { Source } from '../../../../../auth/decorators/source.decorator';
import { PrismaService } from '../../../../../prisma.service';

@Controller('debug/sync-state')
@UseGuards(AuthGuard('taskiti-jwt'), SourceGuard)
@Source('taskiti')
export class TaskitiDebugController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  async getSyncState(@Param('userId') userId: string) {
    const tasks = await this.prisma.taskiti_tasks.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        title: true,
        version: true,
        updated_at: true,
        deleted_at: true,
        completed: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    if (tasks.length === 0) {
      throw new NotFoundException('No tasks found for this user');
    }

    return {
      user_id: userId,
      total_tasks: tasks.length,
      active: tasks.filter((t) => !t.deleted_at).length,
      deleted: tasks.filter((t) => t.deleted_at).length,
      tasks,
    };
  }
}
