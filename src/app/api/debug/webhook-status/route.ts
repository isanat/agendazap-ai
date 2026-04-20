import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Debug endpoint to check recent webhook message processing status
 * This helps diagnose why messages might not be getting responses
 * 
 * Query params:
 * - limit: number of messages to return (default 20)
 * - direction: 'incoming' | 'outgoing' | 'all' (default 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const direction = searchParams.get('direction') || 'all';
    
    // Get recent WhatsApp messages
    const where: any = {};
    if (direction !== 'all') {
      where.direction = direction;
    }
    
    const messages = await db.whatsappMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        accountId: true,
        clientPhone: true,
        direction: true,
        message: true,
        messageType: true,
        status: true,
        metadata: true,
        createdAt: true,
      }
    });
    
    // Get message counts by status
    const statusCounts = await db.whatsappMessage.groupBy({
      by: ['status', 'direction'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    
    // Get recent AI provider health
    const providers = await db.aIProvider.findMany({
      select: {
        name: true,
        displayName: true,
        isEnabled: true,
        healthStatus: true,
        priority: true,
        model: true,
        lastHealthCheck: true,
      },
      orderBy: { priority: 'asc' }
    });
    
    // Get WhatsApp integration status
    const integrations = await db.integration.findMany({
      where: { type: 'whatsapp' },
      select: {
        id: true,
        accountId: true,
        status: true,
        lastSync: true,
        config: true,
        credentials: true,
      }
    });
    
    // Get Evolution API config (without exposing API keys)
    const envApiUrl = process.env.EVOLUTION_API_URL;
    const envWebhookUrl = process.env.EVOLUTION_WEBHOOK_URL;
    const hasApiKey = !!process.env.EVOLUTION_API_KEY;
    const hasWebhookSecret = !!process.env.EVOLUTION_WEBHOOK_SECRET;
    const hasZaiBaseUrl = !!process.env.ZAI_BASE_URL;
    const hasZaiApiKey = !!process.env.ZAI_API_KEY;
    const hasZhipuApiKey = !!process.env.ZHIPU_API_KEY;
    
    // Get processed message stats (dedup)
    const processedCount = await db.processedMessage.count();
    const recentProcessed = await db.processedMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        messageId: true,
        accountId: true,
        createdAt: true,
        expiresAt: true,
      }
    });
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        EVOLUTION_API_URL: envApiUrl || 'not set',
        EVOLUTION_WEBHOOK_URL: envWebhookUrl || 'not set',
        EVOLUTION_API_KEY: hasApiKey ? '✅ set' : '❌ not set',
        EVOLUTION_WEBHOOK_SECRET: hasWebhookSecret ? '✅ set' : '❌ not set',
        ZAI_BASE_URL: hasZaiBaseUrl ? '✅ set' : '❌ not set',
        ZAI_API_KEY: hasZaiApiKey ? '✅ set' : '❌ not set',
        ZHIPU_API_KEY: hasZhipuApiKey ? '✅ set' : '❌ not set',
      },
      messages: {
        recent: messages.map(m => ({
          ...m,
          message: m.message?.substring(0, 100), // Truncate for readability
          metadata: typeof m.metadata === 'object' ? m.metadata : 
            (() => { try { return JSON.parse(String(m.metadata)); } catch { return m.metadata; } })(),
        })),
        statusCounts: statusCounts.map(s => ({
          status: s.status,
          direction: s.direction,
          count: s._count.id,
        })),
      },
      aiProviders: providers,
      integrations: integrations.map(i => ({
        ...i,
        config: (() => { 
          try { 
            const c = typeof i.config === 'string' ? JSON.parse(i.config) : i.config;
            // Don't expose sensitive data
            return { 
              autoReplyEnabled: c?.autoReplyEnabled, 
              webhookUrl: c?.webhookUrl, 
              webhookHeadersConfigured: c?.webhookHeadersConfigured,
              lastWebhookReconfigure: c?.lastWebhookReconfigure,
            }; 
          } catch { return i.config; }
        })(),
        credentials: (() => { 
          try { 
            const cr = typeof i.credentials === 'string' ? JSON.parse(i.credentials) : i.credentials;
            return { instanceName: cr?.instanceName, hasApiKey: !!cr?.apiKey }; 
          } catch { return { instanceName: 'parse_error' }; }
        })(),
      })),
      deduplication: {
        totalProcessed: processedCount,
        recent: recentProcessed,
      },
    });
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({
      error: 'Failed to get debug info',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
