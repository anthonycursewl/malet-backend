-- Contact info of the store: printed on the receipts as the issuer data.
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "address" VARCHAR(255);
