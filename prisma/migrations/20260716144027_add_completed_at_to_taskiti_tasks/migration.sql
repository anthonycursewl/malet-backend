-- AlterTable: taskiti_tasks
ALTER TABLE "taskiti_tasks" ADD COLUMN "completed_at" TIMESTAMPTZ(6);
CREATE INDEX "taskiti_tasks_completed_at_idx" ON "taskiti_tasks"("completed_at");
