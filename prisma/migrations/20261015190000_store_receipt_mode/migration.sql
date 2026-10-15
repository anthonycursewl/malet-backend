-- Política de recibos de la tienda: ask | always | never.
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "receipt_mode" VARCHAR(10) NOT NULL DEFAULT 'ask';
