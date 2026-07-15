-- CreateTable: taskiti_analytics
CREATE TABLE "taskiti_analytics" (
    "id" UUID NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "tasks_created" INTEGER NOT NULL DEFAULT 0,
    "tasks_completed" INTEGER NOT NULL DEFAULT 0,
    "tasks_deleted" INTEGER NOT NULL DEFAULT 0,
    "tasks_expired" INTEGER NOT NULL DEFAULT 0,
    "priority_low" INTEGER NOT NULL DEFAULT 0,
    "priority_medium" INTEGER NOT NULL DEFAULT 0,
    "priority_high" INTEGER NOT NULL DEFAULT 0,
    "priority_urgent" INTEGER NOT NULL DEFAULT 0,
    "avg_completion_hours" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "taskiti_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "taskiti_analytics_user_id_date_key" ON "taskiti_analytics"("user_id", "date");
CREATE INDEX "taskiti_analytics_user_id_date_idx" ON "taskiti_analytics"("user_id", "date");

-- AddForeignKey
ALTER TABLE "taskiti_analytics" ADD CONSTRAINT "taskiti_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
