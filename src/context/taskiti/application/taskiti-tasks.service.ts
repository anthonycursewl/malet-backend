import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma.service';

interface CreateTaskDto {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  notes?: string;
  expiry_hours?: number;
  created_at?: string;
}

interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  notes?: string;
  completed?: boolean;
  expiry_hours?: number;
  version: number;
}

@Injectable()
export class TaskitiTasksService {
  private readonly logger = new Logger(TaskitiTasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    params: {
      include_deleted?: string;
      since?: string;
      status?: string;
      take: number;
      cursor?: string;
    },
  ) {
    try {
      const where: any = { user_id: userId };
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

      return { tasks, next_cursor: nextCursor };
    } catch (error) {
      this.logger.error(`Failed to list tasks: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to list tasks');
    }
  }

  async create(userId: string, dto: CreateTaskDto) {
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
      this.logger.error(`Failed to create task: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
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

      if (dto.version < existing.version) {
        throw new ConflictException({
          error: 'version_conflict',
          message: 'Task was modified by another device',
          server_task: existing,
        });
      }

      const data: any = {
        updated_at: new Date(),
        version: existing.version + 1,
      };

      if (dto.title !== undefined) data.title = dto.title;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.priority !== undefined) data.priority = dto.priority;
      if (dto.tags !== undefined) data.tags = dto.tags;
      if (dto.notes !== undefined) data.notes = dto.notes;
      if (dto.completed !== undefined) data.completed = dto.completed;
      if (dto.expiry_hours !== undefined) {
        data.expires_at = new Date(
          Date.now() + Math.max(1, dto.expiry_hours) * 3600000,
        );
      }

      const task = await this.prisma.taskiti_tasks.update({
        where: { id: taskId },
        data,
      });

      return { task };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to update task ${taskId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  async remove(userId: string, taskId: string) {
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
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to delete task ${taskId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete task');
    }
  }

  private safeDate(value: any, fallback: Date = new Date()): Date {
    if (!value) return fallback;
    const d = new Date(value);
    return isNaN(d.getTime()) ? fallback : d;
  }

  async sync(
    userId: string,
    payload: {
      tasks: any[];
      last_sync_at: string;
      device_id?: string;
    },
  ) {
    try {
      const conflicts: any[] = [];
      const now = new Date();

      for (const clientTask of payload.tasks || []) {
        const existing = await this.prisma.taskiti_tasks.findUnique({
          where: { id: clientTask.id },
        });

        if (!existing) {
          await this.prisma.taskiti_tasks.create({
            data: {
              id: clientTask.id,
              user_id: userId,
              title: clientTask.title,
              description: clientTask.description || '',
              completed: clientTask.completed || false,
              priority: clientTask.priority || 'medium',
              tags: clientTask.tags || [],
              notes: clientTask.notes || '',
              created_at: this.safeDate(clientTask.created_at, now),
              expires_at: this.safeDate(clientTask.expires_at, now),
              updated_at: now,
              deleted_at: clientTask.deleted_at
                ? this.safeDate(clientTask.deleted_at)
                : null,
              version: clientTask.version || 1,
            },
          });
        } else if (existing.user_id !== userId) {
          continue;
        } else if (clientTask.version < existing.version) {
          conflicts.push({
            task_id: clientTask.id,
            client_version: clientTask.version,
            server_version: existing.version,
            server_task: existing,
          });
        } else {
          const data: any = { updated_at: now };
          if (clientTask.title !== undefined) data.title = clientTask.title;
          if (clientTask.description !== undefined)
            data.description = clientTask.description;
          if (clientTask.completed !== undefined)
            data.completed = clientTask.completed;
          if (clientTask.priority !== undefined)
            data.priority = clientTask.priority;
          if (clientTask.tags !== undefined) data.tags = clientTask.tags;
          if (clientTask.notes !== undefined) data.notes = clientTask.notes;
          if (clientTask.expires_at !== undefined)
            data.expires_at = this.safeDate(clientTask.expires_at);
          if (clientTask.deleted_at !== undefined) {
            data.deleted_at = clientTask.deleted_at
              ? this.safeDate(clientTask.deleted_at)
              : null;
          }

          const clientVersion = clientTask.version || 0;
          data.version = Math.max(existing.version, clientVersion) + 1;

          await this.prisma.taskiti_tasks.update({
            where: { id: clientTask.id },
            data,
          });
        }
      }

      const serverChanges = await this.prisma.taskiti_tasks.findMany({
        where: {
          user_id: userId,
          updated_at: { gt: this.safeDate(payload.last_sync_at, new Date(0)) },
        },
        orderBy: { updated_at: 'asc' },
      });

      const deletedIds = serverChanges
        .filter((t) => t.deleted_at)
        .map((t) => t.id);

      return {
        tasks: serverChanges,
        deleted_ids: deletedIds,
        sync_at: now.toISOString(),
        conflicts,
      };
    } catch (error) {
      this.logger.error(`Failed to sync tasks: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to sync tasks');
    }
  }
}
