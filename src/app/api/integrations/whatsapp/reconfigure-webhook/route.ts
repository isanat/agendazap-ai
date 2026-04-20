import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

/**
 * Get Evolution API configuration from environment variables or database
 */
async function getEvolutionConfig() {
  const envApiUrl = process.env.EVOLUTION_API_URL;
  const envApiKey = process.env.EVOLUTION_API_KEY;
  const envWebhookUrl = process.env.EVOLUTION_WEBHOOK_URL;
  const envWebhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

  if (envApiUrl && envApiKey) {
    return {
      apiUrl: envApiUrl,
      apiKey: envApiKey,
      webhookUrl: envWebhookUrl || null,
      webhookSecret: envWebhookSecret || null,
    };
  }

  const systemConfig = await db.systemConfiguration.findFirst();

  if (systemConfig?.evolutionApiUrl && systemConfig?.evolutionApiKey) {
    return {
      apiUrl: systemConfig.evolutionApiUrl,
      apiKey: systemConfig.evolutionApiKey,
      webhookUrl: systemConfig.evolutionWebhookUrl || null,
      webhookSecret: envWebhookSecret || null,
    };
  }

  return null;
}

// POST - Reconfigure webhook on Evolution API for an existing instance
// This is used to update the webhook headers (e.g., add x-webhook-secret)
// without requiring the user to disconnect and reconnect their WhatsApp.
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!authUser.accountId) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 400 });
    }

    // Find WhatsApp integration
    const integration = await db.integration.findUnique({
      where: {
        accountId_type: {
          accountId: authUser.accountId,
          type: 'whatsapp'
        }
      }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integração WhatsApp não encontrada' }, { status: 404 });
    }

    const credentials = typeof integration.credentials === 'string'
      ? JSON.parse(integration.credentials)
      : integration.credentials;

    const instanceName = credentials.instanceName;

    if (!instanceName) {
      return NextResponse.json({ error: 'Nome da instância não encontrado' }, { status: 400 });
    }

    // Get Evolution API config
    const evolutionConfig = await getEvolutionConfig();

    if (!evolutionConfig) {
      return NextResponse.json({ error: 'Evolution API não configurado' }, { status: 400 });
    }

    if (!evolutionConfig.webhookUrl) {
      return NextResponse.json({ error: 'URL do webhook não configurada' }, { status: 400 });
    }

    // Reconfigure webhook on Evolution API with auth headers
    console.log(`[Reconfigure Webhook] Updating webhook for instance ${instanceName}...`);

    const webhookResponse = await fetch(
      `${evolutionConfig.apiUrl}/webhook/set/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'apikey': evolutionConfig.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: evolutionConfig.webhookUrl,
          enabled: true,
          byEvents: false,
          base64: true,
          headers: evolutionConfig.webhookSecret
            ? { 'x-webhook-secret': evolutionConfig.webhookSecret }
            : undefined,
          events: [
            'APPLICATION_STARTUP',
            'QRCODE_UPDATED',
            'CONNECTION_UPDATE',
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'SEND_MESSAGE',
          ]
        }),
      }
    );

    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      console.log(`[Reconfigure Webhook] Webhook reconfigured successfully for ${instanceName}`);

      // Update integration config
      const currentConfig = typeof integration.config === 'string'
        ? JSON.parse(integration.config || '{}')
        : integration.config || {};

      await db.integration.update({
        where: { id: integration.id },
        data: {
          config: JSON.stringify({
            ...currentConfig,
            webhookUrl: evolutionConfig.webhookUrl,
            webhookHeadersConfigured: true,
            lastWebhookReconfigure: new Date().toISOString(),
          }),
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Webhook reconfigurado com sucesso',
        instanceName,
        webhookUrl: evolutionConfig.webhookUrl,
        hasAuthHeaders: !!process.env.EVOLUTION_WEBHOOK_SECRET,
        webhookData,
      });
    } else {
      const webhookError = await webhookResponse.text();
      console.error(`[Reconfigure Webhook] Error reconfiguring webhook: ${webhookError}`);
      return NextResponse.json({
        error: 'Erro ao reconfigurar webhook no Evolution API',
        details: webhookError,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Reconfigure Webhook] Error:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Bulk reconfigure ALL webhook instances (useful for fixing auth after env var changes)
// This endpoint reconfigures webhooks for ALL WhatsApp integrations in the database
export async function GET() {
  try {
    const evolutionConfig = await getEvolutionConfig();

    if (!evolutionConfig) {
      return NextResponse.json({ error: 'Evolution API não configurado' }, { status: 400 });
    }

    if (!evolutionConfig.webhookUrl) {
      return NextResponse.json({ error: 'URL do webhook não configurada' }, { status: 400 });
    }

    // Find ALL WhatsApp integrations
    const integrations = await db.integration.findMany({
      where: { type: 'whatsapp' },
    });

    if (integrations.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhuma integração WhatsApp encontrada',
        reconfigured: 0,
      });
    }

    const results: { instanceName: string; success: boolean; error?: string }[] = [];

    for (const integration of integrations) {
      try {
        const credentials = typeof integration.credentials === 'string'
          ? JSON.parse(integration.credentials)
          : integration.credentials;

        const instanceName = credentials.instanceName;
        if (!instanceName) {
          results.push({ instanceName: 'unknown', success: false, error: 'No instance name' });
          continue;
        }

        console.log(`[Reconfigure All] Updating webhook for instance ${instanceName}...`);

        const webhookResponse = await fetch(
          `${evolutionConfig.apiUrl}/webhook/set/${instanceName}`,
          {
            method: 'POST',
            headers: {
              'apikey': evolutionConfig.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: evolutionConfig.webhookUrl,
              enabled: true,
              byEvents: false,
              base64: true,
              headers: evolutionConfig.webhookSecret
                ? { 'x-webhook-secret': evolutionConfig.webhookSecret }
                : undefined,
              events: [
                'APPLICATION_STARTUP',
                'QRCODE_UPDATED',
                'CONNECTION_UPDATE',
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'SEND_MESSAGE',
              ]
            }),
          }
        );

        if (webhookResponse.ok) {
          console.log(`[Reconfigure All] ✅ Webhook reconfigured for ${instanceName}`);
          
          // Update integration config
          const currentConfig = typeof integration.config === 'string'
            ? JSON.parse(integration.config || '{}')
            : integration.config || {};

          await db.integration.update({
            where: { id: integration.id },
            data: {
              config: JSON.stringify({
                ...currentConfig,
                webhookUrl: evolutionConfig.webhookUrl,
                webhookHeadersConfigured: true,
                lastWebhookReconfigure: new Date().toISOString(),
              }),
            }
          });

          results.push({ instanceName, success: true });
        } else {
          const errorText = await webhookResponse.text();
          console.error(`[Reconfigure All] ❌ Failed for ${instanceName}: ${errorText}`);
          results.push({ instanceName, success: false, error: errorText });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ instanceName: 'error', success: false, error: errorMsg });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Reconfigure All] Completed: ${successCount}/${results.length} instances reconfigured`);

    return NextResponse.json({
      success: true,
      message: `${successCount}/${results.length} instâncias reconfiguradas com sucesso`,
      reconfigured: successCount,
      total: results.length,
      hasAuthHeaders: !!evolutionConfig.webhookSecret,
      results,
    });
  } catch (error) {
    console.error('[Reconfigure All] Error:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
