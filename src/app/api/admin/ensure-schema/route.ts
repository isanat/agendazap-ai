import { NextRequest, NextResponse } from 'next/server';
import { db, verifyDatabaseSchema, warmUpDatabase } from '@/lib/db';

/**
 * POST - Ensure the database schema has all required columns.
 * This endpoint can be called to add missing columns (like timezone) to the production database.
 * It uses raw SQL to add columns if they don't exist (idempotent).
 *
 * No auth required for this endpoint - it's only for initial setup/repair.
 * The endpoint is idempotent and safe to call multiple times.
 */
export async function POST() {
  try {
    // First, warm up the database (important for Neon cold starts)
    const warmUpResult = await warmUpDatabase(3);

    if (!warmUpResult.ok) {
      return NextResponse.json({
        success: false,
        error: 'Database warm-up failed',
        details: warmUpResult.error,
      }, { status: 503 });
    }

    // Check current schema state
    const schemaResult = await verifyDatabaseSchema();

    const results: string[] = [];

    // Fix: Add timezone column to Account if missing
    if (!schemaResult.timezoneFieldExists) {
      try {
        await db.$executeRawUnsafe(`
          ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
        `);
        results.push('Added Account.timezone column (default: America/Sao_Paulo)');
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.push(`Failed to add Account.timezone: ${msg}`);
      }
    } else {
      results.push('Account.timezone column already exists ✅');
    }

    // Verify the fix
    const verifyResult = await verifyDatabaseSchema();

    return NextResponse.json({
      success: verifyResult.ok,
      message: verifyResult.ok
        ? 'Database schema is complete - all required columns present'
        : 'Some columns could not be added',
      beforeFix: {
        timezoneFieldExists: schemaResult.timezoneFieldExists,
        missingColumns: schemaResult.missingColumns,
      },
      afterFix: {
        timezoneFieldExists: verifyResult.timezoneFieldExists,
        missingColumns: verifyResult.missingColumns,
      },
      actions: results,
      warmUp: warmUpResult,
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
    const schemaResult = await verifyDatabaseSchema();

    return NextResponse.json({
      databaseAccessible: warmUpResult.ok,
      databaseLatencyMs: warmUpResult.latencyMs,
      schemaOk: schemaResult.ok,
      timezoneFieldExists: schemaResult.timezoneFieldExists,
      missingColumns: schemaResult.missingColumns,
      error: schemaResult.error || warmUpResult.error,
    });
  } catch (error) {
    return NextResponse.json({
      databaseAccessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
