-- CreateTable
CREATE TABLE "linked_account" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMPTZ(6),
    "scopes" VARCHAR(100)[],
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "linked_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_state" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "state_token" VARCHAR(255) NOT NULL,
    "code_verifier" VARCHAR(255),
    "redirect_url" VARCHAR(500),
    "scopes" VARCHAR(100)[],
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "oauth_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_provider_config" (
    "id" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "icon_url" VARCHAR(500),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "supports_provisioning" BOOLEAN NOT NULL DEFAULT false,
    "default_scopes" VARCHAR(100)[],
    "config" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "integration_provider_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "linked_account_provider_idx" ON "linked_account"("provider");

-- CreateIndex
CREATE INDEX "linked_account_provider_user_id_idx" ON "linked_account"("provider_user_id");

-- CreateIndex
CREATE INDEX "linked_account_is_active_idx" ON "linked_account"("is_active");

-- CreateIndex
CREATE INDEX "linked_account_token_expires_at_idx" ON "linked_account"("token_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "linked_account_user_id_provider_key" ON "linked_account"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_state_state_token_key" ON "oauth_state"("state_token");

-- CreateIndex
CREATE INDEX "oauth_state_state_token_idx" ON "oauth_state"("state_token");

-- CreateIndex
CREATE INDEX "oauth_state_expires_at_idx" ON "oauth_state"("expires_at");

-- CreateIndex
CREATE INDEX "oauth_state_user_id_provider_idx" ON "oauth_state"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "integration_provider_config_provider_key" ON "integration_provider_config"("provider");

-- CreateIndex
CREATE INDEX "integration_provider_config_is_enabled_idx" ON "integration_provider_config"("is_enabled");

-- AddForeignKey
ALTER TABLE "linked_account" ADD CONSTRAINT "linked_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
