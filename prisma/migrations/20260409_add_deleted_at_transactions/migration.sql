-- Add deleted_at column to transactions and index
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create index on deleted_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON "transactions" (deleted_at);
