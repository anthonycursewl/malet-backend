-- Visibilidad individual de las notas: privadas por defecto.
ALTER TABLE "notes" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false;
