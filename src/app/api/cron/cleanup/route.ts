import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredTokens } from '@/lib/jwt';
import { db } from '@/lib/db';

/**
 * POST /api/cron/cleanup
 * Cleanup expired refresh tokens and processed messages
 *
 * This endpoint should be called by a cron job (e.g., daily)
 * It requires a CRON_SECRET header for authentication
 */
export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const cronSecret = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');
  // Vercel cron sends "Authorization: Bearer <CRON_SECRET>"
  const bearerToken = authHeader?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET && bearerToken !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = {
      expiredTokens: 0,
      processedMessages: 0,
    };

    // Cleanup expired refresh tokens
    try {
      results.expiredTokens = await cleanupExpiredTokens();
    } catch (error) {
      console.error('[Cleanup] Error cleaning up expired tokens:', error);
    }

    // Cleanup expired processed messages (older than 7 days)
    try {
      const deletedMessages = await db.processedMessage.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });
      results.processedMessages = deletedMessages.count;
    } catch (error) {
      console.error('[Cleanup] Error cleaning up processed messages:', error);
    }

    console.log('[Cleanup] Completed:', results);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also allow GET for health-check style invocations
export async function GET(request: NextRequest) {
  return POST(request);
}
