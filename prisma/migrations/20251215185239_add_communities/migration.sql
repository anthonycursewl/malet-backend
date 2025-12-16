/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_verified_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "email_verification_token" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "token" VARCHAR(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_verification_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "slug" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'public',
    "avatar_url" VARCHAR(500),
    "banner_url" VARCHAR(500),
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "owner_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_member" (
    "id" VARCHAR(255) NOT NULL,
    "community_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "community_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_category" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "icon" VARCHAR(100),

    CONSTRAINT "community_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_category_assignment" (
    "community_id" VARCHAR(255) NOT NULL,
    "category_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "community_category_assignment_pkey" PRIMARY KEY ("community_id","category_id")
);

-- CreateIndex
CREATE INDEX "email_verification_token_token_idx" ON "email_verification_token"("token");

-- CreateIndex
CREATE INDEX "email_verification_token_expires_at_idx" ON "email_verification_token"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_token_user_id_token_key" ON "email_verification_token"("user_id", "token");

-- CreateIndex
CREATE UNIQUE INDEX "community_slug_key" ON "community"("slug");

-- CreateIndex
CREATE INDEX "community_owner_id_idx" ON "community"("owner_id");

-- CreateIndex
CREATE INDEX "community_type_idx" ON "community"("type");

-- CreateIndex
CREATE INDEX "community_is_active_idx" ON "community"("is_active");

-- CreateIndex
CREATE INDEX "community_created_at_idx" ON "community"("created_at");

-- CreateIndex
CREATE INDEX "community_member_user_id_idx" ON "community_member"("user_id");

-- CreateIndex
CREATE INDEX "community_member_role_idx" ON "community_member"("role");

-- CreateIndex
CREATE INDEX "community_member_status_idx" ON "community_member"("status");

-- CreateIndex
CREATE UNIQUE INDEX "community_member_community_id_user_id_key" ON "community_member"("community_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_category_slug_key" ON "community_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "email_verification_token" ADD CONSTRAINT "email_verification_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community" ADD CONSTRAINT "community_owner_id" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_member" ADD CONSTRAINT "member_community_id" FOREIGN KEY ("community_id") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_member" ADD CONSTRAINT "member_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_category_assignment" ADD CONSTRAINT "community_category_assignment_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_category_assignment" ADD CONSTRAINT "community_category_assignment_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "community_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
