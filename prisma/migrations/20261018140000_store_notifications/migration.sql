-- Avisos por email de la tienda: grupos activos, destinatarios seleccionados
-- y auditoría de cada envío.

ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "notification_events" JSONB;

ALTER TABLE "store_members"
  ADD COLUMN IF NOT EXISTS "notify" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "store_notification_logs" (
  "id"         VARCHAR(255) NOT NULL,
  "store_id"   VARCHAR(255) NOT NULL,
  "event"      VARCHAR(50) NOT NULL,
  "subject"    VARCHAR(255) NOT NULL,
  "recipients" JSONB NOT NULL,
  "status"     VARCHAR(20) NOT NULL,
  "error"      VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "store_notification_logs_store_id_created_at_idx"
  ON "store_notification_logs"("store_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_notification_logs_store_id_fkey'
  ) THEN
    ALTER TABLE "store_notification_logs"
      ADD CONSTRAINT "store_notification_logs_store_id_fkey"
      FOREIGN KEY ("store_id") REFERENCES "stores"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
