-- Drop tables that are no longer in the Prisma schema (moved to a separate backend)
DROP TABLE IF EXISTS "community" CASCADE;
DROP TABLE IF EXISTS "community_member" CASCADE;
DROP TABLE IF EXISTS "interest_category" CASCADE;
DROP TABLE IF EXISTS "user_interest" CASCADE;
DROP TABLE IF EXISTS "user_onboarding" CASCADE;

-- CreateTable
CREATE TABLE "client_ops" (
    "id" UUID NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "client_id" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_ops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_ops_user_id_client_id_key" ON "client_ops"("user_id", "client_id");

-- CreateIndex
CREATE INDEX "client_ops_user_id_created_at_idx" ON "client_ops"("user_id", "created_at");
