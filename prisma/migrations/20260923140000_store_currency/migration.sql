-- AlterTable
-- Idempotent on purpose: this migration was regenerated after an incorrect
-- version tried to drop unrelated tables that exist in the database but are
-- no longer part of the Prisma datamodel.
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) NOT NULL DEFAULT 'Bs';
