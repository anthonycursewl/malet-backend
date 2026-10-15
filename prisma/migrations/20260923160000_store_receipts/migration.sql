-- CreateTable
CREATE TABLE "store_receipts" (
    "id" VARCHAR(255) NOT NULL,
    "store_id" VARCHAR(255) NOT NULL,
    "sale_id" VARCHAR(255) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "number" VARCHAR(32) NOT NULL,
    "customer_name" VARCHAR(255),
    "currency" VARCHAR(10) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL,
    "lines" JSONB NOT NULL,
    "payments" JSONB NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "store_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_receipts_sale_id_key" ON "store_receipts"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_receipts_number_key" ON "store_receipts"("number");

-- CreateIndex
CREATE UNIQUE INDEX "store_receipts_year_sequence_key" ON "store_receipts"("year", "sequence");

-- CreateIndex
CREATE INDEX "store_receipts_store_id_issued_at_idx" ON "store_receipts"("store_id", "issued_at");

-- CreateIndex
CREATE INDEX "store_receipts_deleted_at_idx" ON "store_receipts"("deleted_at");

-- AddForeignKey
ALTER TABLE "store_receipts" ADD CONSTRAINT "store_receipts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_receipts" ADD CONSTRAINT "store_receipts_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "store_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
