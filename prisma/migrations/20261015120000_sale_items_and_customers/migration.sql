-- CreateTable: global customer identity (shareable between stores)
CREATE TABLE "customers" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateTable: store <-> customer link (seq drives cursor pagination)
CREATE TABLE "store_customers" (
    "id" VARCHAR(255) NOT NULL,
    "store_id" VARCHAR(255) NOT NULL,
    "customer_id" VARCHAR(255) NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "store_customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_customers_store_id_customer_id_key" ON "store_customers"("store_id", "customer_id");

-- CreateIndex
CREATE INDEX "store_customers_store_id_seq_idx" ON "store_customers"("store_id", "seq");

-- CreateIndex
CREATE INDEX "store_customers_customer_id_idx" ON "store_customers"("customer_id");

-- AddForeignKey
ALTER TABLE "store_customers" ADD CONSTRAINT "store_customers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_customers" ADD CONSTRAINT "store_customers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: sale line items (one row per product sold)
CREATE TABLE "store_sale_items" (
    "id" VARCHAR(255) NOT NULL,
    "sale_id" VARCHAR(255) NOT NULL,
    "product_id" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "store_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_sale_items_sale_id_idx" ON "store_sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "store_sale_items_product_id_idx" ON "store_sale_items"("product_id");

-- CreateIndex
CREATE INDEX "store_sale_items_deleted_at_idx" ON "store_sale_items"("deleted_at");

-- AddForeignKey
ALTER TABLE "store_sale_items" ADD CONSTRAINT "store_sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "store_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_sale_items" ADD CONSTRAINT "store_sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "store_products"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Data migration: every existing sale becomes a sale with exactly one line item.
-- Nothing is lost: prices, quantity and soft-delete state are copied as-is.
INSERT INTO "store_sale_items" (
    "id", "sale_id", "product_id", "quantity", "unit_price", "unit_cost",
    "created_at", "updated_at", "deleted_at"
)
SELECT
    gen_random_uuid()::text, "id", "product_id", "quantity", "unit_price", "unit_cost",
    "created_at", "updated_at", "deleted_at"
FROM "store_sales";

-- Optional customer on the sale header
ALTER TABLE "store_sales" ADD COLUMN "customer_id" VARCHAR(255);

-- CreateIndex
CREATE INDEX "store_sales_customer_id_idx" ON "store_sales"("customer_id");

-- AddForeignKey
ALTER TABLE "store_sales" ADD CONSTRAINT "store_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the single-product columns: the line items are now the source of truth.
ALTER TABLE "store_sales" DROP CONSTRAINT "store_sales_product_id_fkey";

-- DropIndex
DROP INDEX "store_sales_product_id_idx";

-- AlterTable
ALTER TABLE "store_sales"
    DROP COLUMN "product_id",
    DROP COLUMN "quantity",
    DROP COLUMN "unit_price",
    DROP COLUMN "unit_cost";
