-- Fase 4 de los avisos por email: resumen diario, auditoría con datos para
-- reintentar y control de intentos.

ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "notification_digest" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "store_notification_logs"
  ADD COLUMN IF NOT EXISTS "payload" JSONB;

ALTER TABLE "store_notification_logs"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 1;
