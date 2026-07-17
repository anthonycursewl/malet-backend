import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, taskiti_tasks } from '@prisma/client';
import { PrismaService } from '../../../prisma.service';
import {
  CreateTaskInput,
  UpdateTaskInput,
  SyncPayload,
  SyncConflict,
  FindAllParams,
} from '../domain/types';

@Injectable()
export class TaskitiTasksService {
  private readonly logger = new Logger(TaskitiTasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, params: FindAllParams) {
    try {
      const where: Prisma.taskiti_tasksWhereInput = { user_id: userId };
      const includeDeleted = params.include_deleted === 'true';

      if (!includeDeleted) {
        where.deleted_at = null;
      }

      if (params.since) {
        where.updated_at = { gt: new Date(params.since) };
      }

      if (params.status === 'completed') {
        where.completed = true;
      } else if (params.status === 'active') {
        where.completed = false;
        // exclude expired tasks from active list
        where.expires_at = { gt: new Date() };
      }

      const tasks = await this.prisma.taskiti_tasks.findMany({
        where,
        take: params.take,
        ...(params.cursor && {
          skip: 1,
          cursor: { id: params.cursor },
        }),
        orderBy: { created_at: 'desc' },
      });

      const nextCursor =
        tasks.length === params.take ? tasks[tasks.length - 1].id : null;

      this.logger.log(
        `[Pull] user=${userId} since=${params.since || 'none'} status=${params.status || 'all'}\n` +
          `  → returned: ${tasks.length} tasks [${tasks.map((t) => t.id).slice(0, 10).join(', ')}${tasks.length > 10 ? '...' : ''}]`,
      );

      return { tasks, next_cursor: nextCursor };
    } catch (error) {
      this.logger.error(`Failed to list tasks: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to list tasks');
    }
  }

  async findOne(userId: string, taskId: string) {
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      throw new BadRequestException('Invalid task id');
    }

    try {
      const task = await this.prisma.taskiti_tasks.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      if (task.user_id !== userId) {
        throw new ForbiddenException('Not your task');
      }

      return { task };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to get task ${taskId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get task');
    }
  }

  async create(userId: string, dto: CreateTaskInput) {
    const now = new Date();
    let created_at = now;
    if (dto.created_at) {
      const parsed = new Date(dto.created_at);
      if (!isNaN(parsed.getTime())) created_at = parsed;
    }
    const hours = Math.max(1, dto.expiry_hours || 24);
    const expires_at = new Date(created_at.getTime() + hours * 3600000);

    try {
      const task = await this.prisma.taskiti_tasks.create({
        data: {
          id: dto.id,
          user_id: userId,
          title: dto.title,
          description: dto.description || '',
          completed: false,
          priority: dto.priority || 'medium',
          tags: dto.tags || [],
          notes: dto.notes || '',
          created_at,
          expires_at,
          version: 1,
        },
      });

      this.logger.log(
        `Task created: id=${task.id} title="${task.title}" user=${userId}`,
      );

      return { task };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.taskiti_tasks.findUnique({
          where: { id: dto.id },
        });
        if (existing && existing.user_id === userId) {
          this.logger.warn(
            `Task ${dto.id} already exists, returning existing (idempotent create)`,
          );
          return { task: existing };
        }
      }
      this.logger.error(
        `Failed to create task: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  async update(userId: string, taskId: string, dto: UpdateTaskInput) {
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      throw new BadRequestException('Invalid task id');
    }
    try {
      const existing = await this.prisma.taskiti_tasks.findUnique({
        where: { id: taskId },
      });

      if (!existing) {
        throw new NotFoundException('Task not found');
      }

      if (existing.user_id !== userId) {
        throw new ForbiddenException('Not your task');
      }

      const data: Prisma.taskiti_tasksUpdateInput = {
        updated_at: new Date(),
        version: Math.max(existing.version, dto.version || 0) + 1,
      };

      if (dto.title !== undefined) data.title = dto.title;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.priority !== undefined) data.priority = dto.priority;
      if (dto.tags !== undefined) data.tags = dto.tags;
      if (dto.notes !== undefined) data.notes = dto.notes;
      if (dto.completed !== undefined) {
        data.completed = dto.completed;
        data.completed_at = dto.completed ? new Date() : null;
      }
      if (dto.expiry_hours !== undefined) {
        const base = existing.created_at || new Date();
        data.expires_at = new Date(
          base.getTime() + Math.max(1, dto.expiry_hours) * 3600000,
        );
      }

      const task = await this.prisma.taskiti_tasks.update({
        where: { id: taskId },
        data,
      });

      return { task };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update task ${taskId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  async remove(userId: string, taskId: string) {
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      throw new BadRequestException('Invalid task id');
    }
    try {
      const existing = await this.prisma.taskiti_tasks.findUnique({
        where: { id: taskId },
      });

      if (!existing) {
        throw new NotFoundException('Task not found');
      }

      if (existing.user_id !== userId) {
        throw new ForbiddenException('Not your task');
      }

      const task = await this.prisma.taskiti_tasks.update({
        where: { id: taskId },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });

      return { deleted_at: task.deleted_at };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to delete task ${taskId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to delete task');
    }
  }

  private safeDate(value: any, fallback: Date = new Date()): Date {
    if (!value) return fallback;
    const d = new Date(value);
    return isNaN(d.getTime()) ? fallback : d;
  }

  private hasContentChanged(ct: any, existing: any): boolean {
    return (
      (ct.title !== undefined && ct.title !== existing.title) ||
      (ct.completed !== undefined && ct.completed !== existing.completed) ||
      (ct.priority !== undefined && ct.priority !== existing.priority) ||
      (ct.description !== undefined && ct.description !== existing.description) ||
      (ct.notes !== undefined && ct.notes !== existing.notes) ||
      (ct.tags !== undefined &&
        JSON.stringify(ct.tags) !== JSON.stringify(existing.tags)) ||
      (ct.expires_at !== undefined &&
        this.safeDate(ct.expires_at).getTime() !==
          new Date(existing.expires_at).getTime()) ||
      (ct.deleted_at !== undefined &&
        (ct.deleted_at ? true : false) !==
          (existing.deleted_at ? true : false))
    );
  }

  async sync(userId: string, payload: SyncPayload) {
    try {
      const now = new Date();
      const lastSyncAt = this.safeDate(payload.last_sync_at, new Date(0));
      const take = Math.min(Math.max(payload.take || 50, 1), 200);
      const processedIds: string[] = [];
      const upsertedIds: string[] = [];
      const softDeletedIds: string[] = [];
      const conflicts: SyncConflict[] = [];

      this.logger.log(
        `[Sync Push] user=${userId} device=${payload.device_id || 'unknown'}\n` +
          `  tasks_recibidas: [${(payload.tasks || []).map((t) => t.id).join(', ')}] (${(payload.tasks || []).length} tareas)\n` +
          `  deleted_ids:     [${(payload.deleted_ids || []).join(', ')}]\n` +
          `  last_sync_at:    ${payload.last_sync_at}`,
      );

      // Bulk processing: collect ids and existing tasks in one query
      const incomingIds = Array.from(
        new Set([
          ...(payload.tasks || []).map((t: any) => t.id).filter(Boolean),
          ...(payload.deleted_ids || []),
        ]),
      );

      const existingTasks = incomingIds.length
        ? await this.prisma.taskiti_tasks.findMany({
            where: { id: { in: incomingIds } },
          })
        : [];

      const existingById: Record<string, taskiti_tasks> = {};
      for (const e of existingTasks) existingById[e.id] = e;

      const createData: Prisma.taskiti_tasksCreateManyInput[] = [];
      const updateOps: Prisma.PrismaPromise<any>[] = [];

      // handle deletions
      for (const deletedId of payload.deleted_ids || []) {
        if (!deletedId) continue;
        processedIds.push(deletedId);
        const existing = existingById[deletedId];
        if (existing && existing.user_id === userId && !existing.deleted_at) {
          // schedule update op
          updateOps.push(
            this.prisma.taskiti_tasks.update({
              where: { id: deletedId },
              data: { deleted_at: now, updated_at: now, version: existing.version + 1 },
            }),
          );
          softDeletedIds.push(deletedId);
        }
      }

      // handle tasks: partition create / update / conflicts
      for (const ct of payload.tasks || []) {
        if (!ct.id) continue;
        processedIds.push(ct.id);
        const existing = existingById[ct.id];
        if (!existing) {
          const created_at = this.safeDate(ct.created_at, now);
          const expires_at = ct.expires_at
            ? this.safeDate(ct.expires_at)
            : new Date(created_at.getTime() + 86400000);

          createData.push({
            id: ct.id,
            user_id: userId,
            title: ct.title || 'Untitled',
            description: ct.description || '',
            completed: ct.completed || false,
            completed_at: ct.completed ? now : null,
            priority: ct.priority || 'medium',
            tags: ct.tags || [],
            notes: ct.notes || '',
            created_at,
            expires_at,
            updated_at: now,
            deleted_at: ct.deleted_at ? this.safeDate(ct.deleted_at) : null,
            version: ct.version || 1,
          });
          upsertedIds.push(ct.id);
        } else if (existing.user_id !== userId) {
          continue;
        } else if (ct.version < existing.version) {
          conflicts.push({
            task_id: ct.id,
            client_version: ct.version,
            server_version: existing.version,
            server_task: existing,
          });
        } else {
          const changed = this.hasContentChanged(ct, existing);
          const data: Prisma.taskiti_tasksUpdateInput = { version: Math.max(existing.version, ct.version || 0) + 1 };
          if (changed) data.updated_at = now;
          if (ct.title !== undefined) data.title = ct.title;
          if (ct.description !== undefined) data.description = ct.description;
          if (ct.completed !== undefined) {
            data.completed = ct.completed;
            data.completed_at = ct.completed ? now : null;
          }
          if (ct.priority !== undefined) data.priority = ct.priority;
          if (ct.tags !== undefined) data.tags = ct.tags;
          if (ct.notes !== undefined) data.notes = ct.notes;
          if (ct.expires_at !== undefined) data.expires_at = this.safeDate(ct.expires_at);
          if (ct.deleted_at !== undefined) data.deleted_at = ct.deleted_at ? this.safeDate(ct.deleted_at) : null;

          updateOps.push(this.prisma.taskiti_tasks.update({ where: { id: ct.id }, data }));
          if (changed) upsertedIds.push(ct.id);
        }
      }

      // execute all operations in a transaction
      const txOps: Prisma.PrismaPromise<any>[] = [];
      if (createData.length > 0) {
        txOps.push(this.prisma.taskiti_tasks.createMany({ data: createData, skipDuplicates: true }));
      }
      txOps.push(...updateOps);

      if (txOps.length > 0) {
        await this.prisma.$transaction(txOps, { timeout: 30000 });
      }

      const serverChanges = await this.prisma.taskiti_tasks.findMany({
        where: {
          user_id: userId,
          updated_at: { gt: lastSyncAt },
          id: { notIn: processedIds },
        },
        take: take + 1,
        ...(payload.cursor && { skip: 1, cursor: { id: payload.cursor } }),
        orderBy: { updated_at: 'asc' },
      });

      const hasMore = serverChanges.length > take;
      if (hasMore) serverChanges.pop();
      const nextCursor = hasMore
        ? serverChanges[serverChanges.length - 1].id
        : null;

      const deletedIds = serverChanges
        .filter((t) => t.deleted_at)
        .map((t) => t.id);

      const remoteIds = serverChanges
        .filter((t) => !t.deleted_at)
        .map((t) => t.id);

      this.logger.log(
        `[Sync Response] user=${userId}\n` +
          `  → upserted:      [${upsertedIds.join(', ')}]\n` +
          `  → soft_deleted:  [${softDeletedIds.join(', ')}]\n` +
          `  → remote_changes: [${remoteIds.join(', ')}]\n` +
          `  → conflicts:     [${conflicts.map((c) => c.task_id).join(', ')}]`,
      );

      return {
        tasks: serverChanges,
        deleted_ids: deletedIds,
        sync_at: now.toISOString(),
        conflicts,
        has_more: hasMore,
        next_cursor: nextCursor,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync tasks: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to sync tasks');
    }
  }
}
