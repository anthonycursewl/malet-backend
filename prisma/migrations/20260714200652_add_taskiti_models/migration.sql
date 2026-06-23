-- CreateTable: taskiti_tasks
CREATE TABLE "taskiti_tasks" (
    "id" UUID NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "tags" TEXT[],
    "notes" VARCHAR(2000) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "taskiti_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: taskiti_refresh_tokens
CREATE TABLE "taskiti_refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "taskiti_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "taskiti_tasks_user_id_idx" ON "taskiti_tasks"("user_id");
CREATE INDEX "taskiti_tasks_updated_at_idx" ON "taskiti_tasks"("updated_at");
CREATE INDEX "taskiti_tasks_user_id_deleted_at_idx" ON "taskiti_tasks"("user_id", "deleted_at");
CREATE INDEX "taskiti_refresh_tokens_user_id_idx" ON "taskiti_refresh_tokens"("user_id");
CREATE INDEX "taskiti_refresh_tokens_expires_at_idx" ON "taskiti_refresh_tokens"("expires_at");

-- AddForeignKeys
ALTER TABLE "taskiti_tasks" ADD CONSTRAINT "taskiti_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "taskiti_refresh_tokens" ADD CONSTRAINT "taskiti_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
