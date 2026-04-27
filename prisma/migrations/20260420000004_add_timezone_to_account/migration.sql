-- AlterTable: Add timezone field to Account model
-- This allows each salon to have an explicit timezone instead of relying on server timezone
-- Default is "America/Sao_Paulo" which covers the majority of Brazilian salons

ALTER TABLE "Account" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
