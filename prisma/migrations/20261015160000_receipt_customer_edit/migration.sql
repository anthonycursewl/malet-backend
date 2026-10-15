-- Corrección auditada del "Facturar a" de un recibo ya emitido.
-- Los importes y las líneas siguen siendo inmutables: solo el nombre del
-- cliente puede corregirse, dejando rastro de quién y cuándo lo hizo.
ALTER TABLE "store_receipts"
  ADD COLUMN IF NOT EXISTS "customer_name_updated_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "customer_name_updated_by" VARCHAR(255);
