/**
 * Database Migration Utilities
 *
 * Provides runtime schema migration for the Neon production database.
 * This is used when Prisma's build-time `migrate deploy` can't run
 * (e.g., missing DIRECT_URL, or Vercel build failures).
 *
 * All SQL uses IF NOT EXISTS / IF EXISTS patterns for idempotency.
 */

import { db } from '@/lib/db';

let _migrationInProgress = false;
let _migrationDone = false;

/**
 * Ensure all required schema columns exist in the database.
 * This is a runtime alternative to `prisma migrate deploy`.
 *
 * Safe to call multiple times - it only adds missing columns.
 */
export async function ensureSchemaColumns(): Promise<{
  ok: boolean;
  applied: string[];
  errors: string[];
}> {
  // Prevent concurrent migrations
  if (_migrationInProgress) {
    return { ok: true, applied: [], errors: [] };
  }

  // Skip if already done in this process
  if (_migrationDone) {
    return { ok: true, applied: [], errors: [] };
  }

  _migrationInProgress = true;

  const applied: string[] = [];
  const errors: string[] = [];

  try {
    // All the ALTER TABLE statements that add columns which may be missing
    // These correspond to migrations 20260420000001 through 20260420000004
    const migrations: Array<{ sql: string; description: string }> = [
      // Migration 20260420000001 - restore and implement features
      { sql: `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "googleMapsEmbed" TEXT`, description: 'Account.googleMapsEmbed' },
      { sql: `ALTER TABLE "AccountSubscription" ADD COLUMN IF NOT EXISTS "mercadoPagoSubscriptionId" TEXT`, description: 'AccountSubscription.mercadoPagoSubscriptionId' },
      { sql: `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixQrCode" TEXT`, description: 'Appointment.pixQrCode' },
      { sql: `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixDeepLink" TEXT`, description: 'Appointment.pixDeepLink' },
      { sql: `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixExpiresAt" TIMESTAMP(3)`, description: 'Appointment.pixExpiresAt' },
      { sql: `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixPaid" BOOLEAN NOT NULL DEFAULT false`, description: 'Appointment.pixPaid' },
      { sql: `ALTER TABLE "AITokenUsage" ADD COLUMN IF NOT EXISTS "requestType" TEXT`, description: 'AITokenUsage.requestType' },
      { sql: `ALTER TABLE "AITokenUsage" ADD COLUMN IF NOT EXISTS "metadata" JSONB`, description: 'AITokenUsage.metadata' },
      { sql: `ALTER TABLE "NoShowFee" ADD COLUMN IF NOT EXISTS "pixQrCode" TEXT`, description: 'NoShowFee.pixQrCode' },
      { sql: `ALTER TABLE "NoShowFee" ADD COLUMN IF NOT EXISTS "pixDeepLink" TEXT`, description: 'NoShowFee.pixDeepLink' },
      { sql: `ALTER TABLE "NoShowFee" ADD COLUMN IF NOT EXISTS "pixId" TEXT`, description: 'NoShowFee.pixId' },
      { sql: `ALTER TABLE "NoShowFee" ADD COLUMN IF NOT EXISTS "reminderSent" BOOLEAN NOT NULL DEFAULT false`, description: 'NoShowFee.reminderSent' },
      { sql: `ALTER TABLE "OAuthState" ADD COLUMN IF NOT EXISTS "codeVerifier" TEXT`, description: 'OAuthState.codeVerifier' },
      { sql: `ALTER TABLE "Professional" ADD COLUMN IF NOT EXISTS "userId" TEXT`, description: 'Professional.userId' },
      { sql: `ALTER TABLE "ServiceProfessional" ADD COLUMN IF NOT EXISTS "customPrice" DOUBLE PRECISION`, description: 'ServiceProfessional.customPrice' },
      { sql: `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxAiTokensMonth" INTEGER NOT NULL DEFAULT 100000`, description: 'SubscriptionPlan.maxAiTokensMonth' },
      { sql: `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "aiModelType" TEXT NOT NULL DEFAULT 'basic'`, description: 'SubscriptionPlan.aiModelType' },
      { sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT`, description: 'User.avatar' },
      { sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clientId" TEXT`, description: 'User.clientId' },
      { sql: `ALTER TABLE "WhatsappMessage" ADD COLUMN IF NOT EXISTS "metadata" JSONB`, description: 'WhatsappMessage.metadata' },

      // Migration 20260420000002 - client CPF/birthDate and appointment PIX
      { sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "cpf" TEXT`, description: 'Client.cpf' },
      { sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3)`, description: 'Client.birthDate' },
      { sql: `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION`, description: 'Appointment.price' },
      { sql: `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixId" TEXT`, description: 'Appointment.pixId' },
      { sql: `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixPaidAt" TIMESTAMP(3)`, description: 'Appointment.pixPaidAt' },
      { sql: `ALTER TABLE "SystemConfiguration" ADD COLUMN IF NOT EXISTS "mpClientId" TEXT`, description: 'SystemConfiguration.mpClientId' },
      { sql: `ALTER TABLE "SystemConfiguration" ADD COLUMN IF NOT EXISTS "mpClientSecret" TEXT`, description: 'SystemConfiguration.mpClientSecret' },
      { sql: `ALTER TABLE "SystemConfiguration" ADD COLUMN IF NOT EXISTS "mpRedirectUri" TEXT`, description: 'SystemConfiguration.mpRedirectUri' },

      // Migration 20260420000003 - AI auto-reply
      { sql: `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "aiAutoReply" BOOLEAN NOT NULL DEFAULT true`, description: 'Account.aiAutoReply' },

      // Migration 20260420000004 - timezone
      { sql: `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo'`, description: 'Account.timezone' },
    ];

    // Create missing tables
    const tableMigrations: Array<{ sql: string; description: string }> = [
      {
        sql: `CREATE TABLE IF NOT EXISTS "BlockedSlot" (
          "id" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "professionalId" TEXT,
          "startDate" TIMESTAMP(3) NOT NULL,
          "endDate" TIMESTAMP(3) NOT NULL,
          "reason" TEXT NOT NULL DEFAULT 'unavailable',
          "description" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "BlockedSlot_pkey" PRIMARY KEY ("id")
        )`,
        description: 'BlockedSlot table',
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS "Report" (
          "id" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "data" JSONB NOT NULL,
          "periodStart" TIMESTAMP(3) NOT NULL,
          "periodEnd" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
        )`,
        description: 'Report table',
      },
    ];

    const allMigrations = [...migrations, ...tableMigrations];

    for (const migration of allMigrations) {
      try {
        await db.$executeRawUnsafe(migration.sql);
        applied.push(migration.description);
        console.log(`[db-migrate] ✅ Applied: ${migration.description}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        // "already exists" errors are fine - column/table already present
        if (msg.includes('already exists')) {
          console.log(`[db-migrate] ⏭️ Already exists: ${migration.description}`);
        } else {
          errors.push(`${migration.description}: ${msg}`);
          console.error(`[db-migrate] ❌ Failed: ${migration.description} - ${msg}`);
        }
      }
    }

    _migrationDone = true;
    console.log(`[db-migrate] Migration complete. Applied: ${applied.length}, Errors: ${errors.length}`);

    return {
      ok: errors.length === 0,
      applied,
      errors,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Global: ${msg}`);
    console.error('[db-migrate] Migration failed:', msg);
    return { ok: false, applied, errors };
  } finally {
    _migrationInProgress = false;
  }
}

/**
 * Check if the schema has been migrated (quick check for critical columns).
 */
export function isSchemaMigrated(): boolean {
  return _migrationDone;
}
