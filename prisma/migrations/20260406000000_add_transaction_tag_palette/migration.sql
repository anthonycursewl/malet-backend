-- Add palette column to transaction_tag (non-destructive)
ALTER TABLE "transaction_tag" ADD COLUMN "palette" JSONB;
