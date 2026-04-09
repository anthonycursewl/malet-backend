-- Add missing columns to existing tables
ALTER TABLE "accounts" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "transactions" ADD COLUMN "currency_code" VARCHAR(10);
CREATE INDEX "transactions_account_id_idx" ON "transactions"("account_id");
CREATE INDEX "transactions_issued_at_idx" ON "transactions"("issued_at");
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- Create missing tables from the database
CREATE TABLE "shared_accounts" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "account_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "identification_number" VARCHAR(255),
    "phone_associated" VARCHAR(255),
    "email_associated" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "shared_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "web_auth_session" (
    "id" VARCHAR(255) NOT NULL,
    "session_token" VARCHAR(255) NOT NULL,
    "qr_code" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "ip_address" VARCHAR(100),
    "user_agent" TEXT,
    "location" VARCHAR(255),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorized_at" TIMESTAMPTZ(6),

    CONSTRAINT "web_auth_session_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints and indices for the new tables
CREATE UNIQUE INDEX "web_auth_session_session_token_key" ON "web_auth_session"("session_token");
CREATE UNIQUE INDEX "web_auth_session_qr_code_key" ON "web_auth_session"("qr_code");
CREATE INDEX "web_auth_session_session_token_idx" ON "web_auth_session"("session_token");
CREATE INDEX "web_auth_session_qr_code_idx" ON "web_auth_session"("qr_code");
CREATE INDEX "web_auth_session_status_idx" ON "web_auth_session"("status");

-- Add foreign keys for the new tables
ALTER TABLE "shared_accounts" ADD CONSTRAINT "shared_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "web_auth_session" ADD CONSTRAINT "web_auth_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
