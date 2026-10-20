-- Facturas (documento previo al pago) + conceptos libres en las líneas de venta.

-- 1) Líneas de venta: admiten conceptos sin producto (servicios).
ALTER TABLE "store_sale_items"
  ADD COLUMN IF NOT EXISTS "name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "item_type" VARCHAR(20) NOT NULL DEFAULT 'product';

-- Snapshot del nombre para las líneas históricas (antes se resolvía por join).
UPDATE "store_sale_items" i
SET "name" = COALESCE(p."name", 'Producto')
FROM "store_products" p
WHERE p."id" = i."product_id";

UPDATE "store_sale_items" SET "name" = 'Producto' WHERE "name" IS NULL;

ALTER TABLE "store_sale_items" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "store_sale_items" ALTER COLUMN "product_id" DROP NOT NULL;

-- 2) Facturas: se convierten en venta + recibo solo al pagarse.
CREATE TABLE IF NOT EXISTS "store_invoices" (
  "id"                VARCHAR(255) NOT NULL,
  "store_id"          VARCHAR(255) NOT NULL,
  "customer_id"       VARCHAR(255),
  "customer_name"     VARCHAR(255),
  "sequence"          INTEGER NOT NULL,
  "year"              INTEGER NOT NULL,
  "number"            VARCHAR(32) NOT NULL,
  "currency"          VARCHAR(10) NOT NULL,
  "subtotal"          DECIMAL(12,2) NOT NULL,
  "total"             DECIMAL(12,2) NOT NULL,
  "notes"             VARCHAR(2000),
  "status"            VARCHAR(20) NOT NULL DEFAULT 'pending',
  "issued_at"         TIMESTAMPTZ(6) NOT NULL,
  "due_at"            TIMESTAMPTZ(6),
  "paid_at"           TIMESTAMPTZ(6),
  "payment_method_id" VARCHAR(255),
  "sale_id"           VARCHAR(255),
  "receipt_id"        VARCHAR(255),
  "lines"             JSONB NOT NULL,
  "created_by"        VARCHAR(255) NOT NULL,
  "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at"        TIMESTAMPTZ(6),
  CONSTRAINT "store_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "store_invoices_number_key" ON "store_invoices"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "store_invoices_sale_id_key" ON "store_invoices"("sale_id");
CREATE UNIQUE INDEX IF NOT EXISTS "store_invoices_receipt_id_key" ON "store_invoices"("receipt_id");
CREATE UNIQUE INDEX IF NOT EXISTS "store_invoices_year_sequence_key" ON "store_invoices"("year", "sequence");
CREATE INDEX IF NOT EXISTS "store_invoices_store_id_issued_at_idx" ON "store_invoices"("store_id", "issued_at");
CREATE INDEX IF NOT EXISTS "store_invoices_store_id_status_idx" ON "store_invoices"("store_id", "status");
CREATE INDEX IF NOT EXISTS "store_invoices_customer_id_idx" ON "store_invoices"("customer_id");
CREATE INDEX IF NOT EXISTS "store_invoices_deleted_at_idx" ON "store_invoices"("deleted_at");

ALTER TABLE "store_invoices"
  ADD CONSTRAINT "store_invoices_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_invoices"
  ADD CONSTRAINT "store_invoices_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "store_invoices"
  ADD CONSTRAINT "store_invoices_payment_method_id_fkey"
  FOREIGN KEY ("payment_method_id") REFERENCES "store_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "store_invoices"
  ADD CONSTRAINT "store_invoices_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "store_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "store_invoices"
  ADD CONSTRAINT "store_invoices_receipt_id_fkey"
  FOREIGN KEY ("receipt_id") REFERENCES "store_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
