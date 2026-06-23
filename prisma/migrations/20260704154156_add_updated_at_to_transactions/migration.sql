-- AlterTable: add updated_at to transactions
ALTER TABLE "transactions" ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Set updated_at = issued_at for existing rows so they have a sensible initial value
UPDATE "transactions" SET "updated_at" = "issued_at" WHERE "updated_at" != "issued_at";

-- CreateIndex for cursor-based pagination
CREATE INDEX "transactions_updated_at_idx" ON "transactions"("updated_at");
