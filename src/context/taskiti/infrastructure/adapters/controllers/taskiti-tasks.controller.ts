import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { taskiti_tasks } from '@prisma/client';
import { SourceGuard } from '../../../../../auth/guards/source.guard';
import { Source } from '../../../../../auth/decorators/source.decorator';
import { TaskitiTasksService } from '../../../application/taskiti-tasks.service';
import { SyncRequestDto } from '../dtos/sync-request.dto';
import { CreateTaskInput, UpdateTaskInput, SyncConflict } from '../../../domain/types';

interface AuthenticatedRequest {
  user: { userId: string; email: string; name: string };
}

interface BatchSyncResponse {
  batch_id?: string;
  result: {
    tasks: taskiti_tasks[];
    deleted_ids: string[];
    sync_at: string;
    conflicts: SyncConflict[];
    has_more: boolean;
    next_cursor: string | null;
  };
}

@Controller('tasks')
@UseGuards(AuthGuard('taskiti-jwt'), SourceGuard)
@Source('taskiti')
export class TaskitiTasksController {
  constructor(private readonly tasksService: TaskitiTasksService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Req() req: any,
    @Query('include_deleted') include_deleted?: string,
    @Query('since') since?: string,
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.tasksService.findAll(req.user.userId, {
      include_deleted,
      since,
      status,
      take: take ? Math.min(Number(take), 100) : 20,
      cursor,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.findOne(req.user.userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    return this.tasksService.create(req.user.userId, body);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.tasksService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.remove(req.user.userId, id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync(@Req() req: AuthenticatedRequest, @Body() body: SyncRequestDto) {
    if (body && Array.isArray(body.batches)) {
      const allTasks: taskiti_tasks[] = [];
      const allDeletedIds: string[] = [];
      const allConflicts: SyncConflict[] = [];
      const batchResponses: BatchSyncResponse[] = [];

      for (const batch of body.batches) {
        const payload = {
          tasks: batch.tasks || [],
          deleted_ids: batch.deleted_ids || [],
          completed_ids: (batch as any).completed_ids || [],
          last_sync_at: batch.last_sync_at || body.last_sync_at,
          device_id: batch.device_id || body.device_id,
          take: (batch as any).take || (body as any).take,
          cursor: (batch as any).cursor || (body as any).cursor,
        };
        const res = await this.tasksService.sync(req.user.userId, payload);
        allTasks.push(...res.tasks);
        allDeletedIds.push(...res.deleted_ids);
        allConflicts.push(...res.conflicts);
        batchResponses.push({ batch_id: batch.batch_id, result: res });
      }

      const lastResult = batchResponses[batchResponses.length - 1]?.result;
      return {
        tasks: allTasks,
        deleted_ids: allDeletedIds,
        conflicts: allConflicts,
        sync_at: new Date().toISOString(),
        has_more: lastResult?.has_more ?? false,
        next_cursor: lastResult?.next_cursor ?? null,
        batches: batchResponses,
      };
    }

    const payload = {
      tasks: body?.tasks || [],
      deleted_ids: body?.deleted_ids || [],
      last_sync_at: body?.last_sync_at || new Date().toISOString(),
      device_id: body?.device_id,
      take: body?.take,
      cursor: body?.cursor,
    };
    return this.tasksService.sync(req.user.userId, payload);
  }
}
