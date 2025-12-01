-- Migration: Add avatar_url and banner_url to user table
-- Date: 2024-11-28
-- Description: Adds optional fields for user profile images

ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "banner_url" VARCHAR(500);

-- Add comments for documentation
COMMENT ON COLUMN "user"."avatar_url" IS 'URL of the user profile avatar image stored in S3';
COMMENT ON COLUMN "user"."banner_url" IS 'URL of the user profile banner image stored in S3';
