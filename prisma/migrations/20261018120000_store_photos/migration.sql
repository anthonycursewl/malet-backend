-- Fotos de la tienda: avatar y banner en 3 resoluciones cada uno
-- (small/medium/large) para usarlas donde convenga sin descargar de más.
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "avatar_small_url" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "avatar_medium_url" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "avatar_large_url" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "banner_small_url" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "banner_medium_url" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "banner_large_url" VARCHAR(500);
