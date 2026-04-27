-- Add multi-niche AI support fields to Account
ALTER TABLE "Account" ADD COLUMN "businessCategory" TEXT NOT NULL DEFAULT 'beauty';
ALTER TABLE "Account" ADD COLUMN "aiTone" TEXT NOT NULL DEFAULT 'friendly';
ALTER TABLE "Account" ADD COLUMN "aiConfig" JSONB;
