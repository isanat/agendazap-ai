-- Add AI auto-reply toggle to Account
ALTER TABLE "Account" ADD COLUMN "aiAutoReply" BOOLEAN NOT NULL DEFAULT true;
