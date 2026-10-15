-- CreateTable
CREATE TABLE "store_invites" (
    "id" VARCHAR(255) NOT NULL,
    "store_id" VARCHAR(255) NOT NULL,
    "created_by" VARCHAR(255) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_invites_token_hash_key" ON "store_invites"("token_hash");

-- CreateIndex
CREATE INDEX "store_invites_store_id_idx" ON "store_invites"("store_id");

-- CreateIndex
CREATE INDEX "store_invites_expires_at_idx" ON "store_invites"("expires_at");

-- AddForeignKey
ALTER TABLE "store_invites" ADD CONSTRAINT "store_invites_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

