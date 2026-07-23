-- Add avatar JSONB column to User model
-- Migration: add_user_avatar
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" JSONB DEFAULT '{}'::jsonb;
