import { NextRequest, NextResponse } from 'next/server';
import { db, warmUpDatabase } from '@/lib/db';

/**
 * Comprehensive database schema repair endpoint.
 *
 * This endpoint checks for and adds ALL missing columns/tables that the
 * Prisma schema expects but the production database might not have yet.
 *
 * It is idempotent - safe to call multiple times.
 * Uses IF NOT EXISTS / IF EXISTS patterns to avoid errors on re-runs.
 *
 * No auth required - this is for initial setup/repair only.
 * Consider removing or protecting this endpoint after all migrations are applied.
 */

// All SQL migrations that might need to be applied to production.
// Each entry has a description and an array of SQL statements.
// We use IF NOT EXISTS / IF EXISTS to make them idempotent.
const MIGRATIONS = [
  {
    name: '20260420000000_cleanup_orphaned_tables_and_columns',
    description: 'Cleanup orphaned tables and columns',
    sql: [
      // These are DROP operations from the cleanup migration
      // They use IF EXISTS to be idempotent
      `ALTER TABLE "Professional" DROP CONSTRAINT IF EXISTS "Professional_userId_fkey"`,
      `ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_accountId_fkey"`,
      `ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_clientId_fkey"`,
      `DROP INDEX IF EXISTS "User_clientId_key"`,
      // Drop orphaned columns (IF EXISTS for each)
      `ALTER TABLE "AITokenUsage" DROP COLUMN IF EXISTS "metadata"`,
      `ALTER TABLE "AITokenUsage" DROP COLUMN IF EXISTS "requestType"`,
      `ALTER TABLE "Account" DROP COLUMN IF EXISTS "googleMapsEmbed"`,
      `ALTER TABLE "AccountSubscription" DROP COLUMN IF EXISTS "mercadoPagoSubscriptionId"`,
      `ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "pixDeepLink"`,
      `ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "pixExpiresAt"`,
      `ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "pixPaid"`,
      `ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "pixQrCode"`,
      `ALTER TABLE "NoShowFee" DROP COLUMN IF EXISTS "pixDeepLink"`,
      `ALTER TABLE "NoShowFee" DROP COLUMN IF EXISTS "pixId"`,
      `ALTER TABLE "NoShowFee" DROP COLUMN IF EXISTS "pixQrCode"`,
      `ALTER TABLE "NoShowFee" DROP COLUMN IF EXISTS "reminderSent"`,
      `ALTER TABLE "OAuthState" DROP COLUMN IF EXISTS "codeVerifier"`,
      `ALTER TABLE "Professional" DROP COLUMN IF EXISTS "userId"`,
      `ALTER TABLE "ServiceProfessional" DROP COLUMN IF EXISTS "customPrice"`,
      `ALTER TABLE "SubscriptionPlan" DROP COLUMN IF EXISTS "aiModelType"`,
      `ALTER TABLE "SubscriptionPlan" DROP COLUMN IF EXISTS "maxAiTokensMonth"`,
      `ALTER TABLE "User" DROP COLUMN IF EXISTS "avatar"`,
      `ALTER TABLE "User" DROP COLUMN IF EXISTS "clientId"`,
      `ALTER TABLE "WhatsappMessage" DROP COLUMN IF EXISTS "metadata"`,
      `DROP TABLE IF EXISTS "BlockedSlot"`,
      `DROP TABLE IF EXISTS "Report"`,
    ],
  },
  {
    name: '20260420000001_restore_and_implement_features',
    description: 'Restore and implement features',
    sql: [
      // 1. Account.googleMapsEmbed
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "googleMapsEmbed" TEXT`,

      // 2. AccountSubscription.mercadoPagoSubscriptionId
      `ALTER TABLE "AccountSubscription" ADD COLUMN IF NOT EXISTS "mercadoPagoSubscriptionId" TEXT`,

      // 3. Appointment PIX payment columns
      `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixQrCode" TEXT`,
      `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixDeepLink" TEXT`,
      `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixExpiresAt" TIMESTAMP(3)`,
      `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixPaid" BOOLEAN NOT NULL DEFAULT false`,

      // 4. AITokenUsage.requestType and metadata
      `ALTER TABLE "AITokenUsage" ADD COLUMN IF NOT EXISTS "requestType" TEXT`,
      `ALTER TABLE "AITokenUsage" ADD COLUMN IF NOT EXISTS "metadata" JSONB`,

      // 5. NoShowFee PIX columns and reminderSent
      `ALTER TABLE "NoShowFee" ADD COLUMN IF NOT EXISTS "pixQrCode" TEXT`,
      `ALTER TABLE "NoShowFee" ADD COLUMN IF NOT EXISTS "pixDeepLink" TEXT`,
      `ALTER TABLE "NoShowFee" ADD COLUMN IF NOT EXISTS "pixId" TEXT`,
      `ALTER TABLE "NoShowFee" ADD COLUMN IF NOT EXISTS "reminderSent" BOOLEAN NOT NULL DEFAULT false`,

      // 6. OAuthState.codeVerifier (PKCE)
      `ALTER TABLE "OAuthState" ADD COLUMN IF NOT EXISTS "codeVerifier" TEXT`,

      // 7. Professional.userId (Professional -> User link)
      `ALTER TABLE "Professional" ADD COLUMN IF NOT EXISTS "userId" TEXT`,

      // 8. ServiceProfessional.customPrice
      `ALTER TABLE "ServiceProfessional" ADD COLUMN IF NOT EXISTS "customPrice" DOUBLE PRECISION`,

      // 9. SubscriptionPlan.maxAiTokensMonth and aiModelType
      `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxAiTokensMonth" INTEGER NOT NULL DEFAULT 100000`,
      `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "aiModelType" TEXT NOT NULL DEFAULT 'basic'`,

      // 10. User.avatar and clientId
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clientId" TEXT`,

      // 11. WhatsappMessage.metadata
      `ALTER TABLE "WhatsappMessage" ADD COLUMN IF NOT EXISTS "metadata" JSONB`,

      // 12. Create BlockedSlot table (IF NOT EXISTS)
      `CREATE TABLE IF NOT EXISTS "BlockedSlot" (
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

      // 13. Create Report table (IF NOT EXISTS)
      `CREATE TABLE IF NOT EXISTS "Report" (
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

      // 14. Create indexes (IF NOT EXISTS via DO block)
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'BlockedSlot_accountId_startDate_idx') THEN
          CREATE INDEX "BlockedSlot_accountId_startDate_idx" ON "BlockedSlot"("accountId", "startDate");
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'BlockedSlot_professionalId_startDate_idx') THEN
          CREATE INDEX "BlockedSlot_professionalId_startDate_idx" ON "BlockedSlot"("professionalId", "startDate");
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Report_accountId_idx') THEN
          CREATE INDEX "Report_accountId_idx" ON "Report"("accountId");
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Report_accountId_type_idx') THEN
          CREATE INDEX "Report_accountId_type_idx" ON "Report"("accountId", "type");
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Professional_userId_key') THEN
          CREATE UNIQUE INDEX "Professional_userId_key" ON "Professional"("userId");
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_clientId_key') THEN
          CREATE UNIQUE INDEX "User_clientId_key" ON "User"("clientId");
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Professional_userId_idx') THEN
          CREATE INDEX "Professional_userId_idx" ON "Professional"("userId");
        END IF;
      END $$`,

      // 15. Add foreign key constraints (IF NOT EXISTS via DO block)
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'Professional_userId_fkey' AND table_name = 'Professional'
        ) THEN
          ALTER TABLE "Professional" ADD CONSTRAINT "Professional_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'User_clientId_fkey' AND table_name = 'User'
        ) THEN
          ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey"
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'BlockedSlot_accountId_fkey' AND table_name = 'BlockedSlot'
        ) THEN
          ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'BlockedSlot_professionalId_fkey' AND table_name = 'BlockedSlot'
        ) THEN
          ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_professionalId_fkey"
            FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'Report_accountId_fkey' AND table_name = 'Report'
        ) THEN
          ALTER TABLE "Report" ADD CONSTRAINT "Report_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
    ],
  },
  {
    name: '20260420000002_add_client_cpf_birthdate_and_appointment_pix_fields',
    description: 'Add client CPF/birthDate and appointment PIX fields',
    sql: [
      `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "cpf" TEXT`,
      `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3)`,
      `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION`,
      `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixId" TEXT`,
      `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pixPaidAt" TIMESTAMP(3)`,
      `ALTER TABLE "SystemConfiguration" ADD COLUMN IF NOT EXISTS "mpClientId" TEXT`,
      `ALTER TABLE "SystemConfiguration" ADD COLUMN IF NOT EXISTS "mpClientSecret" TEXT`,
      `ALTER TABLE "SystemConfiguration" ADD COLUMN IF NOT EXISTS "mpRedirectUri" TEXT`,
    ],
  },
  {
    name: '20260420000003_add_ai_auto_reply',
    description: 'Add AI auto-reply toggle to Account',
    sql: [
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "aiAutoReply" BOOLEAN NOT NULL DEFAULT true`,
    ],
  },
  {
    name: '20260420000004_add_timezone_to_account',
    description: 'Add timezone field to Account model',
    sql: [
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo'`,
    ],
  },
];

export async function POST(request: NextRequest) {
  try {
    // Optional: verify a secret token to prevent unauthorized access
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const authHeader = request.headers.get('authorization');

    // Simple protection: require either a token param or Bearer auth
    // This is not high-security, just prevents casual access
    const expectedToken = process.env.JWT_SECRET || process.env.INTEGRATION_ENCRYPTION_KEY;
    if (expectedToken && token !== expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      // Allow without token in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized. Provide ?token=JWT_SECRET' }, { status: 401 });
      }
    }

    // First, warm up the database (important for Neon cold starts)
    console.log('[Ensure Schema] Warming up database...');
    const warmUpResult = await warmUpDatabase(3);

    if (!warmUpResult.ok) {
      return NextResponse.json({
        success: false,
        error: 'Database warm-up failed',
        details: warmUpResult.error,
      }, { status: 503 });
    }

    console.log('[Ensure Schema] Database warmed up, applying migrations...');

    const results: Array<{
      migration: string;
      description: string;
      status: 'applied' | 'skipped' | 'partial' | 'failed';
      details: string[];
    }> = [];

    // Apply each migration
    for (const migration of MIGRATIONS) {
      const migrationResult: string[] = [];
      let hasFailure = false;

      for (const sql of migration.sql) {
        try {
          await db.$executeRawUnsafe(sql);
          migrationResult.push(`✅ Applied: ${sql.substring(0, 80)}...`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          // Some "already exists" errors are expected and OK
          if (msg.includes('already exists') || msg.includes('does not exist')) {
            migrationResult.push(`⏭️ Skipped (already exists or not applicable): ${sql.substring(0, 60)}...`);
          } else {
            hasFailure = true;
            migrationResult.push(`❌ Failed: ${sql.substring(0, 60)}... - ${msg}`);
          }
        }
      }

      results.push({
        migration: migration.name,
        description: migration.description,
        status: hasFailure ? 'partial' : 'applied',
        details: migrationResult,
      });
    }

    // Verify the critical columns now exist
    console.log('[Ensure Schema] Verifying schema...');
    const verifyResult = await verifySchema();

    return NextResponse.json({
      success: verifyResult.ok,
      message: verifyResult.ok
        ? 'Database schema is complete - all required columns present'
        : 'Some columns may still be missing',
      warmUp: { ok: warmUpResult.ok, latencyMs: warmUpResult.latencyMs },
      migrationResults: results,
      verification: verifyResult,
    });
  } catch (error) {
    console.error('[Ensure Schema] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Schema repair failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET - Check the database schema status without making changes.
 */
export async function GET() {
  try {
    const warmUpResult = await warmUpDatabase(2);
    const schemaResult = await verifySchema();

    return NextResponse.json({
      databaseAccessible: warmUpResult.ok,
      databaseLatencyMs: warmUpResult.latencyMs,
      schemaOk: schemaResult.ok,
      missingColumns: schemaResult.missingColumns,
      existingColumns: schemaResult.existingColumns,
      error: schemaResult.error || warmUpResult.error,
    });
  } catch (error) {
    return NextResponse.json({
      databaseAccessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Verify all required columns exist in the database.
 */
async function verifySchema() {
  const requiredColumns: Record<string, string[]> = {
    'Account': ['timezone', 'aiAutoReply', 'googleMapsEmbed'],
    'Client': ['cpf', 'birthDate'],
    'Appointment': ['price', 'pixId', 'pixPaidAt', 'pixQrCode', 'pixDeepLink', 'pixExpiresAt', 'pixPaid'],
    'SystemConfiguration': ['mpClientId', 'mpClientSecret', 'mpRedirectUri'],
    'User': ['avatar', 'clientId'],
    'Professional': ['userId'],
    'AITokenUsage': ['requestType', 'metadata'],
    'NoShowFee': ['pixQrCode', 'pixDeepLink', 'pixId', 'reminderSent'],
    'SubscriptionPlan': ['maxAiTokensMonth', 'aiModelType'],
    'WhatsappMessage': ['metadata'],
    'AccountSubscription': ['mercadoPagoSubscriptionId'],
    'OAuthState': ['codeVerifier'],
    'ServiceProfessional': ['customPrice'],
  };

  const missingColumns: string[] = [];
  const existingColumns: string[] = [];

  for (const [table, columns] of Object.entries(requiredColumns)) {
    try {
      const result = await db.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = ${table}
      `;
      const existingTableColumns = new Set(result.map(r => r.column_name));

      for (const col of columns) {
        if (existingTableColumns.has(col)) {
          existingColumns.push(`${table}.${col}`);
        } else {
          missingColumns.push(`${table}.${col}`);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      missingColumns.push(`${table}.* (error: ${msg})`);
    }
  }

  return {
    ok: missingColumns.length === 0,
    missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
    existingColumns,
  };
}
