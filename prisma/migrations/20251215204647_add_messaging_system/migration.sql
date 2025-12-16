-- CreateTable
CREATE TABLE "conversation" (
    "id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "community_id" VARCHAR(255),
    "name" VARCHAR(255),
    "avatar_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_message_at" TIMESTAMPTZ(6),

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participant" (
    "id" VARCHAR(255) NOT NULL,
    "conversation_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ(6) NOT NULL,
    "last_read_at" TIMESTAMPTZ(6),
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "conversation_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" VARCHAR(255) NOT NULL,
    "conversation_id" VARCHAR(255) NOT NULL,
    "sender_id" VARCHAR(255) NOT NULL,
    "encrypted_content" TEXT NOT NULL,
    "encrypted_keys" TEXT NOT NULL,
    "content_iv" VARCHAR(32) NOT NULL,
    "content_tag" VARCHAR(32) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "reply_to_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "edited_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_read_receipt" (
    "message_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "message_read_receipt_pkey" PRIMARY KEY ("message_id","user_id")
);

-- CreateTable
CREATE TABLE "message_reaction" (
    "id" VARCHAR(255) NOT NULL,
    "message_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "emoji" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "message_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_public_key" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "device_id" VARCHAR(255) NOT NULL,
    "public_key" TEXT NOT NULL,
    "key_fingerprint" VARCHAR(64) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_public_key_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_community_id_key" ON "conversation"("community_id");

-- CreateIndex
CREATE INDEX "conversation_type_idx" ON "conversation"("type");

-- CreateIndex
CREATE INDEX "conversation_last_message_at_idx" ON "conversation"("last_message_at");

-- CreateIndex
CREATE INDEX "conversation_participant_user_id_idx" ON "conversation_participant"("user_id");

-- CreateIndex
CREATE INDEX "conversation_participant_last_read_at_idx" ON "conversation_participant"("last_read_at");

-- CreateIndex
CREATE INDEX "conversation_participant_is_active_idx" ON "conversation_participant"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participant_conversation_id_user_id_key" ON "conversation_participant"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "message_conversation_id_created_at_idx" ON "message"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "message_sender_id_idx" ON "message"("sender_id");

-- CreateIndex
CREATE INDEX "message_type_idx" ON "message"("type");

-- CreateIndex
CREATE INDEX "message_deleted_at_idx" ON "message"("deleted_at");

-- CreateIndex
CREATE INDEX "message_reaction_message_id_idx" ON "message_reaction"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reaction_message_id_user_id_emoji_key" ON "message_reaction"("message_id", "user_id", "emoji");

-- CreateIndex
CREATE INDEX "user_public_key_user_id_is_active_idx" ON "user_public_key"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "user_public_key_key_fingerprint_idx" ON "user_public_key"("key_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "user_public_key_user_id_device_id_key" ON "user_public_key"("user_id", "device_id");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_read_receipt" ADD CONSTRAINT "message_read_receipt_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_read_receipt" ADD CONSTRAINT "message_read_receipt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reaction" ADD CONSTRAINT "message_reaction_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reaction" ADD CONSTRAINT "message_reaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_public_key" ADD CONSTRAINT "user_public_key_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
