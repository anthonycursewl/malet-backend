-- CreateTable
CREATE TABLE "credit_entries" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "concept" VARCHAR(255) NOT NULL,
    "party" VARCHAR(255),
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "account_id" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL,
    "settled_at" TIMESTAMPTZ(6),
    "settled_transaction_id" VARCHAR(255),
    "settled_transaction_index" VARCHAR(255),
    "notes" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "credit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_entries_user_id_due_date_idx" ON "credit_entries"("user_id", "due_date");

-- CreateIndex
CREATE INDEX "credit_entries_user_id_status_idx" ON "credit_entries"("user_id", "status");

-- CreateIndex
CREATE INDEX "credit_entries_type_idx" ON "credit_entries"("type");

-- CreateIndex
CREATE INDEX "credit_entries_account_id_idx" ON "credit_entries"("account_id");

-- CreateIndex
CREATE INDEX "credit_entries_deleted_at_idx" ON "credit_entries"("deleted_at");

-- AddForeignKey
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

