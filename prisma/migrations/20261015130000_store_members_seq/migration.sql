-- Keyset pagination for the members list: an auto-increment cursor per row.
ALTER TABLE "store_members" ADD COLUMN "seq" BIGSERIAL;

-- CreateIndex
CREATE INDEX "store_members_store_id_seq_idx" ON "store_members"("store_id", "seq");
