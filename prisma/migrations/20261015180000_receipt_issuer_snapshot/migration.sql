-- Datos del emisor congelados al emitir el recibo: si la tienda cambia su
-- nombre, teléfono, correo o dirección, los recibos ya emitidos no cambian.
ALTER TABLE "store_receipts"
  ADD COLUMN IF NOT EXISTS "store_name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "store_phone" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "store_email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "store_address" VARCHAR(255);

-- Backfill: los recibos ya emitidos toman una foto de los datos actuales de su
-- tienda (los nuevos ya los capturan al momento de emitirse).
UPDATE "store_receipts" r
SET "store_name" = s."name",
    "store_phone" = s."phone",
    "store_email" = s."email",
    "store_address" = s."address"
FROM "stores" s
WHERE s."id" = r."store_id";
