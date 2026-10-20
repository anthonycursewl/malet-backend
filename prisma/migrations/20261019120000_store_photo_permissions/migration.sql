-- Permisos de las fotos de la tienda: quién puede cambiar el avatar y el banner
-- (`owner` = solo el dueño, `members` = cualquier miembro activo).
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "avatar_edit_mode" VARCHAR(10) NOT NULL DEFAULT 'owner';

ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "banner_edit_mode" VARCHAR(10) NOT NULL DEFAULT 'owner';
