import { taskiti_tasks } from '@prisma/client';

export interface CreateTaskInput {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  notes?: string;
  expiry_hours?: number;
  created_at?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  notes?: string;
  completed?: boolean;
  expiry_hours?: number;
  version: number;
}

export interface SyncPayload {
  tasks: any[];
  deleted_ids?: string[];
  last_sync_at: string;
  device_id?: string;
  take?: number;
  cursor?: string;
}

export interface SyncConflict {
  task_id: string;
  client_version: number;
  server_version: number;
  server_task: taskiti_tasks;
}

export interface SyncResult {
  tasks: taskiti_tasks[];
  deleted_ids: string[];
  sync_at: string;
  conflicts: SyncConflict[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface FindAllParams {
  include_deleted?: string;
  since?: string;
  status?: string;
  take: number;
  cursor?: string;
}

export interface FindAllResult {
  tasks: taskiti_tasks[];
  next_cursor: string | null;
}

export interface SingleTaskResult {
  task: taskiti_tasks;
}

export interface DeletedResult {
  deleted_at: Date;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
