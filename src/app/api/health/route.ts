import { NextResponse } from 'next/server';
import { checkDatabaseHealth, verifyDatabaseSchema } from '@/lib/db';

/**
 * GET - Health check endpoint
 *
 * Returns comprehensive system health status including:
 * - Database connectivity (with Neon cold start warm-up)
 * - Database schema verification
 * - Environment configuration check
 * - JWT configuration
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { ok: boolean; error?: string; latencyMs?: number; details?: string }> = {};

  // Check database connectivity (also warms up Neon)
  try {
    const dbHealth = await checkDatabaseHealth();
    checks.database = dbHealth;
  } catch (error) {
    checks.database = {
      ok: false,
      error: error instanceof Error ? error.message : 'Database check failed',
    };
  }

  // Check database schema if database is accessible
  if (checks.database.ok) {
    try {
      const schemaResult = await verifyDatabaseSchema();
      checks.schema = {
        ok: schemaResult.ok,
        error: schemaResult.error,
        details: schemaResult.missingColumns
          ? `Missing columns: ${schemaResult.missingColumns.join(', ')}`
          : schemaResult.timezoneFieldExists
            ? 'All required columns present (including Account.timezone)'
            : undefined,
      };
    } catch (error) {
      checks.schema = {
        ok: false,
        error: error instanceof Error ? error.message : 'Schema check failed',
      };
    }
  } else {
    checks.schema = {
      ok: false,
      error: 'Skipped - database not accessible',
    };
  }

  // Check environment configuration
  const envChecks: Record<string, boolean> = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    INTEGRATION_ENCRYPTION_KEY: !!process.env.INTEGRATION_ENCRYPTION_KEY,
    NODE_ENV: !!process.env.NODE_ENV,
  };

  const hasJwtSecret = !!process.env.JWT_SECRET || !!process.env.INTEGRATION_ENCRYPTION_KEY;
  checks.jwtConfig = {
    ok: hasJwtSecret || process.env.NODE_ENV !== 'production',
    error: !hasJwtSecret && process.env.NODE_ENV === 'production'
      ? 'JWT_SECRET or INTEGRATION_ENCRYPTION_KEY must be set in production'
      : undefined,
  };

  // Check database URL format
  const dbUrl = process.env.DATABASE_URL;
  checks.databaseUrlFormat = {
    ok: !!dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')),
    error: !dbUrl
      ? 'DATABASE_URL is not set'
      : !dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')
        ? `DATABASE_URL is not PostgreSQL (starts with: ${dbUrl.substring(0, 15)})`
        : undefined,
  };

  const allOk = Object.values(checks).every(c => c.ok);
  const totalTime = Date.now() - startTime;

  return NextResponse.json({
    status: allOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    responseTimeMs: totalTime,
    checks,
    environment: envChecks,
    vercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || 'unknown',
  }, { status: allOk ? 200 : 503 });
}
