import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

/**
 * Get Evolution API configuration
 */
async function getEvolutionConfig() {
  const envApiUrl = process.env.EVOLUTION_API_URL;
  const envApiKey = process.env.EVOLUTION_API_KEY;
  const envWebhookUrl = process.env.EVOLUTION_WEBHOOK_URL;

  if (envApiUrl && envApiKey) {
    return {
      apiUrl: envApiUrl,
      apiKey: envApiKey,
      webhookUrl: envWebhookUrl || null,
    };
  }

  const systemConfig = await db.systemConfiguration.findFirst();

  if (systemConfig?.evolutionApiUrl && systemConfig?.evolutionApiKey) {
    return {
      apiUrl: systemConfig.evolutionApiUrl,
      apiKey: systemConfig.evolutionApiKey,
      webhookUrl: systemConfig.evolutionWebhookUrl || null,
    };
  }

  return null;
}

// POST - Configurar webhook e auto-reply
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!authUser.accountId) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 400 });
    }

    const body = await request.json();
    const { autoReplyEnabled = true } = body;

    // Buscar integração WhatsApp
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

    // Buscar configuração do Evolution API
    const evolutionConfig = await getEvolutionConfig();

    if (!evolutionConfig) {
      return NextResponse.json({ error: 'Evolution API não configurado' }, { status: 400 });
    }

    // Configurar webhook na instância
    // Evolution API espera url no nível raiz, não dentro de webhook
    if (evolutionConfig.webhookUrl) {
      console.log(`[WhatsApp Config] Configurando webhook para instância ${instanceName}...`);

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
            headers: process.env.EVOLUTION_WEBHOOK_SECRET
              ? { 'x-webhook-secret': process.env.EVOLUTION_WEBHOOK_SECRET }
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
        console.log(`[WhatsApp Config] Webhook configurado com sucesso!`);
      } else {
        const webhookError = await webhookResponse.text();
        console.warn(`[WhatsApp Config] Erro ao configurar webhook: ${webhookError}`);
      }
    }

    // Atualizar config da integração com autoReplyEnabled
    const currentConfig = typeof integration.config === 'string'
      ? JSON.parse(integration.config || '{}')
      : integration.config || {};

    const updatedConfig = {
      ...currentConfig,
      autoReplyEnabled,
      webhookUrl: evolutionConfig.webhookUrl,
    };

    await db.integration.update({
      where: { id: integration.id },
      data: {
        config: JSON.stringify(updatedConfig),
      }
    });

    console.log(`[WhatsApp Config] Auto-reply ${autoReplyEnabled ? 'ativado' : 'desativado'} para conta ${authUser.accountId}`);

    return NextResponse.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      config: updatedConfig,
    });
  } catch (error) {
    console.error('[WhatsApp Config] Erro:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Verificar configuração atual
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!authUser.accountId) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 400 });
    }

    // Buscar integração WhatsApp
    const integration = await db.integration.findUnique({
      where: {
        accountId_type: {
          accountId: authUser.accountId,
          type: 'whatsapp'
        }
      }
    });

    if (!integration) {
      return NextResponse.json({ configured: false });
    }

    const config = typeof integration.config === 'string'
      ? JSON.parse(integration.config || '{}')
      : integration.config || {};

    return NextResponse.json({
      configured: true,
      status: integration.status,
      autoReplyEnabled: config.autoReplyEnabled !== false, // Default to true
      webhookUrl: config.webhookUrl || null,
    });
  } catch (error) {
    console.error('[WhatsApp Config] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
