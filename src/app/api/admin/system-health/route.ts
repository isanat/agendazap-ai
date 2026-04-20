import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, isSuperAdmin } from '@/lib/auth-helpers';

// GET - Check system health and configuration (superadmin only)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const isSuper = await isSuperAdmin(request);
    if (!isSuper) {
      return NextResponse.json({ error: 'Apenas superadmin pode verificar a saúde do sistema' }, { status: 403 });
    }

    // Check environment variables
    const envVars = {
      EVOLUTION_API_URL: !!process.env.EVOLUTION_API_URL,
      EVOLUTION_API_KEY: !!process.env.EVOLUTION_API_KEY,
      EVOLUTION_WEBHOOK_URL: !!process.env.EVOLUTION_WEBHOOK_URL,
      EVOLUTION_WEBHOOK_SECRET: !!process.env.EVOLUTION_WEBHOOK_SECRET,
      JWT_SECRET: !!process.env.JWT_SECRET,
      DATABASE_URL: !!process.env.DATABASE_URL,
      DIRECT_URL: !!process.env.DIRECT_URL,
    };

    // Check database configuration
    const systemConfig = await db.systemConfiguration.findFirst();
    const dbConfig = {
      evolutionApiUrl: !!systemConfig?.evolutionApiUrl,
      evolutionApiKey: !!systemConfig?.evolutionApiKey,
      evolutionWebhookUrl: !!systemConfig?.evolutionWebhookUrl,
    };

    // Check WhatsApp integrations
    const integrations = await db.integration.findMany({
      where: { type: 'whatsapp' },
      select: {
        id: true,
        accountId: true,
        status: true,
        credentials: true,
        config: true,
        lastSync: true,
        errorMessage: true,
      }
    });

    const integrationDetails = integrations.map(int => {
      let parsedCredentials: Record<string, unknown> = {};
      let parsedConfig: Record<string, unknown> = {};
      try {
        parsedCredentials = typeof int.credentials === 'string'
          ? JSON.parse(int.credentials) : int.credentials;
      } catch { /* ignore */ }
      try {
        parsedConfig = typeof int.config === 'string'
          ? JSON.parse(int.config || '{}') : int.config || {};
      } catch { /* ignore */ }

      return {
        id: int.id,
        accountId: int.accountId,
        status: int.status,
        instanceName: parsedCredentials.instanceName || 'unknown',
        hasApiKey: !!parsedCredentials.apiKey,
        webhookHeadersConfigured: !!parsedConfig.webhookHeadersConfigured,
        autoReplyEnabled: parsedConfig.autoReplyEnabled !== false,
        lastSync: int.lastSync,
        errorMessage: int.errorMessage,
      };
    });

    // Check users
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    // Check AI providers
    const aiProviders = await db.aIProvider.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        isEnabled: true,
        healthStatus: true,
        model: true,
      }
    });

    // Test Evolution API connectivity if configured
    let evolutionApiStatus = 'not_configured';
    const apiUrl = process.env.EVOLUTION_API_URL || systemConfig?.evolutionApiUrl;
    const apiKey = process.env.EVOLUTION_API_KEY || systemConfig?.evolutionApiKey;

    if (apiUrl && apiKey) {
      try {
        const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: { 'apikey': apiKey },
          signal: AbortSignal.timeout(5000),
        });
        evolutionApiStatus = response.ok ? 'connected' : `error_${response.status}`;
      } catch (err) {
        evolutionApiStatus = `connection_failed: ${err instanceof Error ? err.message : 'unknown'}`;
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      envVars,
      dbConfig,
      evolutionApiStatus,
      integrations: integrationDetails,
      users: users.map(u => ({
        ...u,
        hasBcryptPassword: true, // We don't expose the actual hash
      })),
      aiProviders,
      webhookAuthNote: envVars.EVOLUTION_WEBHOOK_SECRET
        ? 'EVOLUTION_WEBHOOK_SECRET is set. Webhook requests must include x-webhook-secret or apikey header. Use /api/integrations/whatsapp/reconfigure-webhook to add the header to existing webhooks.'
        : 'EVOLUTION_WEBHOOK_SECRET is NOT set. Webhook verification is skipped (backward compatible).',
    });
  } catch (error) {
    console.error('[System Health] Error:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
