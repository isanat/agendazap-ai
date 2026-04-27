import { NextResponse } from 'next/server';
import { checkProvidersHealth } from '@/lib/ai-provider-service';

/**
 * GET /api/admin/ai-health
 * Check health of all AI providers
 */
export async function GET() {
  try {
    const health = await checkProvidersHealth();
    
    const summary = {
      total: Object.keys(health).length,
      healthy: Object.values(health).filter(h => h.status === 'healthy').length,
      degraded: Object.values(health).filter(h => h.status === 'degraded').length,
      down: Object.values(health).filter(h => h.status === 'down').length
    };

    return NextResponse.json({
      success: true,
      summary,
      providers: health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI Health API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check AI providers health' },
      { status: 500 }
    );
  }
}
