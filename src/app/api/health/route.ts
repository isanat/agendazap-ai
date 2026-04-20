import { NextResponse } from 'next/server';
import { runHealthCheck, getRecentErrors, getErrorCounts } from '@/lib/monitoring';

/**
 * GET - Health check endpoint
 * 
 * Returns comprehensive system health status including:
 * - Database connectivity
 * - Evolution API availability
 * - AI provider status
 * - Memory and CPU usage
 * - Recent error tracking
 */
export async function GET() {
  try {
    const health = await runHealthCheck();
    const recentErrors = getRecentErrors(5);
    const errorCounts = getErrorCounts();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json({
      ...health,
      errors: {
        recent: recentErrors,
        countsByService: errorCounts,
      },
    }, { status: statusCode });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    }, { status: 503 });
  }
}
