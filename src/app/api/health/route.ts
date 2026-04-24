import { NextResponse } from 'next/server';
import { runHealthCheck, getRecentErrors, getErrorCounts } from '@/lib/monitoring';
import { checkEvolutionApiHealth, getHealthStatus as getEvolutionHealth, getQueueStats } from '@/lib/evolution-health';

/**
 * GET - Health check endpoint
 * 
 * Returns comprehensive system health status including:
 * - Database connectivity
 * - Evolution API availability
 * - AI provider status
 * - Memory and CPU usage
 * - Recent error tracking
 * - Pending message queue stats
 */
export async function GET() {
  try {
    const health = await runHealthCheck();
    const recentErrors = getRecentErrors(5);
    const errorCounts = getErrorCounts();
    
    // Get Evolution API health status
    const evolutionHealth = getEvolutionHealth();
    const queueStats = getQueueStats();
    
    // Perform a fresh health check in background (non-blocking)
    checkEvolutionApiHealth().catch(() => {});

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json({
      ...health,
      evolutionApi: {
        isHealthy: evolutionHealth.isHealthy,
        lastCheck: evolutionHealth.lastCheck?.toISOString() || null,
        lastSuccess: evolutionHealth.lastSuccess?.toISOString() || null,
        lastFailure: evolutionHealth.lastFailure?.toISOString() || null,
        consecutiveFailures: evolutionHealth.consecutiveFailures,
        latencyMs: evolutionHealth.latencyMs,
        errorMessage: evolutionHealth.errorMessage,
      },
      messageQueue: queueStats,
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
