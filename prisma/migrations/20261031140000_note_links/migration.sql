-- Enlaces wiki entre notas + títulos únicos por usuario (solo no vacíos).
CREATE TABLE "note_links" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "source_note_id" VARCHAR(255) NOT NULL,
    "target_note_id" VARCHAR(255),
    "raw_title" VARCHAR(255) NOT NULL,
    "alias" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "note_links_source_note_id_raw_title_key" ON "note_links"("source_note_id", "raw_title");
CREATE INDEX "note_links_user_id_target_note_id_idx" ON "note_links"("user_id", "target_note_id");
CREATE INDEX "note_links_source_note_id_idx" ON "note_links"("source_note_id");

ALTER TABLE "note_links" ADD CONSTRAINT "note_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_source_note_id_fkey" FOREIGN KEY ("source_note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_target_note_id_fkey" FOREIGN KEY ("target_note_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- `[[Título]]` debe ser inequívoco: título único por usuario (case-insensitive).
-- Se ignora el título vacío para permitir varias notas sin título.
CREATE UNIQUE INDEX "notes_user_lower_title_key"
  ON "notes" ("user_id", lower("title"))
  WHERE "deleted_at" IS NULL AND btrim("title") <> '';
