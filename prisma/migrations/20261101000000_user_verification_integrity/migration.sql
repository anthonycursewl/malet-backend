-- La verificación de cuenta (badge) es independiente de email_verified.
-- Un usuario no puede tener la insignia sin un tipo de verificación asociado.
UPDATE "user"
SET "verified" = false
WHERE "verified" = true
  AND "verification_type_id" IS NULL;

ALTER TABLE "user"
ADD CONSTRAINT "user_verified_requires_type"
CHECK (NOT "verified" OR "verification_type_id" IS NOT NULL);
