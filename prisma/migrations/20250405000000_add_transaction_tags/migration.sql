-- CreateTransactionTag
CREATE TABLE "transaction_tag" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "color" VARCHAR(20),
    "user_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "transaction_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTransactionTagAssignment
CREATE TABLE "transaction_tag_assignment" (
    "transaction_id" VARCHAR(255) NOT NULL,
    "tag_id" VARCHAR(255) NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "transaction_tag_assignment_pkey" PRIMARY KEY ("transaction_id", "tag_id")
);

-- Add foreign keys
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_tag_assignment" ADD CONSTRAINT "transaction_tag_assignment_transaction_id_fkey" 
    FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_tag_assignment" ADD CONSTRAINT "transaction_tag_assignment_tag_id_fkey" 
    FOREIGN KEY ("tag_id") REFERENCES "transaction_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE UNIQUE INDEX "transaction_tag_user_id_slug_key" ON "transaction_tag"("user_id", "slug");
CREATE INDEX "transaction_tag_user_id_idx" ON "transaction_tag"("user_id");
CREATE INDEX "transaction_tag_slug_idx" ON "transaction_tag"("slug");
CREATE INDEX "transaction_tag_deleted_at_idx" ON "transaction_tag"("deleted_at");
CREATE INDEX "transaction_tag_assignment_tag_id_idx" ON "transaction_tag_assignment"("tag_id");

-- Add column to transactions (already has tags relation but needs the column reference if needed)
-- Note: The many-to-many relation is handled via the assignment table, no column needed on transactions