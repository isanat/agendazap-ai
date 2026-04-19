import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

/**
 * Get Evolution API configuration from environment variables or database
 * Priority: Environment Variables > Database SystemConfiguration
 */
async function getEvolutionConfig() {
  // First, try environment variables (works in Vercel)
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

  // Fallback to database configuration
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

/**
 * Generate a unique instance name based on account info
 */
function generateInstanceName(accountId: string, businessName?: string): string {
  const timestamp = Date.now().toString(36);
  const shortAccountId = accountId.substring(0, 8);
  
  if (businessName) {
    const sanitized = businessName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20);
    return `${sanitized}-${shortAccountId}-${timestamp}`;
  }
  
  return `agendazap-${shortAccountId}-${timestamp}`;
}

// POST - Criar instância WhatsApp para o tenant (com auto-geração de nome)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      console.log('[create-instance] Auth failed - no user found');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check if user has an accountId (superadmin doesn't have one)
    if (!authUser.accountId) {
      console.log('[create-instance] User has no accountId:', authUser.email, 'role:', authUser.role);
      return NextResponse.json({ 
        error: 'Superadmin não pode criar instância WhatsApp. Acesse com uma conta de empresa.',
        needsAccount: true,
      }, { status: 400 });
    }

    // Get account info for business name
    const account = await db.account.findUnique({
      where: { id: authUser.accountId }
    });

    // Get Evolution API config (from env vars or database)
    const evolutionConfig = await getEvolutionConfig();
    
    if (!evolutionConfig) {
      return NextResponse.json({ 
        error: 'O servidor WhatsApp não está configurado. Configure as variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY no Vercel.',
        needsConfig: true,
      }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { instanceName: providedInstanceName } = body;

    // Auto-generate instance name if not provided
    const uniqueInstanceName = providedInstanceName 
      ? `${providedInstanceName.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 30)}-${authUser.accountId.substring(0, 8)}`
      : generateInstanceName(authUser.accountId, account?.businessName);

    // Verificar se já existe uma integração
    const existingIntegration = await db.integration.findUnique({
      where: {
        accountId_type: {
          accountId: authUser.accountId,
          type: 'whatsapp'
        }
      }
    });

    // Se já existe, tentar obter QR code da instância existente
    if (existingIntegration) {
      const existingCredentials = typeof existingIntegration.credentials === 'string'
        ? JSON.parse(existingIntegration.credentials)
        : existingIntegration.credentials;
      
      const existingInstanceName = existingCredentials.instanceName;
      
      // Tentar buscar QR code da instância existente
      try {
        const qrResponse = await fetch(
          `${evolutionConfig.apiUrl}/instance/connect/${existingInstanceName}`,
          {
            method: 'GET',
            headers: {
              'apikey': evolutionConfig.apiKey,
            },
          }
        );

        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          const qrCode = qrData.base64?.image || qrData.base64 || qrData.qrcode?.base64 || null;
          
          return NextResponse.json({
            success: true,
            instanceName: existingInstanceName,
            qrCode: qrCode,
            pairingCode: qrData.pairingCode,
            integrationId: existingIntegration.id,
            message: 'Instância existente encontrada',
          });
        }
      } catch {
        // Se falhar, criar nova instância
      }
    }

    // Criar nova instância no Evolution API
    console.log(`[Evolution API] Criando instância: ${uniqueInstanceName}`);
    
    // Evolution API espera webhook como string URL (não como objeto)
    // Referência: https://docs.evolution-api.com/v2/instance/create
    const createResponse = await fetch(`${evolutionConfig.apiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': evolutionConfig.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: uniqueInstanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        // Webhook deve ser string URL, não objeto
        webhook: evolutionConfig.webhookUrl || undefined,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Evolution API] Erro ao criar instância:', errorText);
      
      // Se a instância já existe, tentar conectar
      if (errorText.includes('already exists') || errorText.includes('ECONNFLICT')) {
        // Tentar obter QR code da instância existente
        const qrResponse = await fetch(
          `${evolutionConfig.apiUrl}/instance/connect/${uniqueInstanceName}`,
          {
            method: 'GET',
            headers: {
              'apikey': evolutionConfig.apiKey,
            },
          }
        );

        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          const qrCode = qrData.base64?.image || qrData.base64 || qrData.qrcode?.base64 || null;
          
          // Salvar integração
          await db.integration.upsert({
            where: {
              accountId_type: {
                accountId: authUser.accountId,
                type: 'whatsapp'
              }
            },
            update: {
              status: 'pending',
              credentials: JSON.stringify({
                instanceName: uniqueInstanceName,
              }),
              config: JSON.stringify({
                autoReplyEnabled: true, // Auto-reply ativado por padrão
              }),
              errorMessage: null,
            },
            create: {
              accountId: authUser.accountId,
              type: 'whatsapp',
              status: 'pending',
              credentials: JSON.stringify({
                instanceName: uniqueInstanceName,
              }),
              config: JSON.stringify({
                autoReplyEnabled: true, // Auto-reply ativado por padrão
              }),
            }
          });

          return NextResponse.json({
            success: true,
            instanceName: uniqueInstanceName,
            qrCode: qrCode,
            pairingCode: qrData.pairingCode,
            message: 'Instância existente conectada',
          });
        }
        
        return NextResponse.json({ 
          error: 'Esta instância já existe. Tente novamente.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Não foi possível criar a instância. Verifique a configuração do Evolution API.',
        details: errorText,
      }, { status: 500 });
    }

    const createData = await createResponse.json();
    console.log('[Evolution API] Instância criada:', createData);

    // Configurar webhook events separadamente (após criar instância)
    // Evolution API espera url no nível raiz, não dentro de webhook
    if (evolutionConfig.webhookUrl) {
      try {
        console.log('[Evolution API] Configurando webhook events...');
        const webhookResponse = await fetch(
          `${evolutionConfig.apiUrl}/webhook/set/${uniqueInstanceName}`,
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
          console.log('[Evolution API] Webhook configurado com sucesso');
        } else {
          const webhookError = await webhookResponse.text();
          console.warn('[Evolution API] Aviso ao configurar webhook:', webhookError);
          // Não falha a criação da instância se webhook falhar
        }
      } catch (webhookError) {
        console.warn('[Evolution API] Erro ao configurar webhook:', webhookError);
        // Continua mesmo se webhook falhar
      }
    }

    // Salvar integração no banco
    const integration = await db.integration.upsert({
      where: {
        accountId_type: {
          accountId: authUser.accountId,
          type: 'whatsapp'
        }
      },
      update: {
        status: 'pending',
        credentials: JSON.stringify({
          instanceName: uniqueInstanceName,
          apiKey: createData.apikey || createData.apiKey, // Evolution API pode retornar uma API key específica
        }),
        config: JSON.stringify({
          webhookUrl: evolutionConfig.webhookUrl,
          autoReplyEnabled: true, // Auto-reply ativado por padrão
        }),
        errorMessage: null,
      },
      create: {
        accountId: authUser.accountId,
        type: 'whatsapp',
        status: 'pending',
        credentials: JSON.stringify({
          instanceName: uniqueInstanceName,
          apiKey: createData.apikey || createData.apiKey,
        }),
        config: JSON.stringify({
          webhookUrl: evolutionConfig.webhookUrl,
          autoReplyEnabled: true, // Auto-reply ativado por padrão
        }),
      }
    });

    // Buscar QR Code
    let qrCode = null;
    let pairingCode = null;
    
    // O QR code pode vir na resposta da criação
    if (createData.qrcode?.base64 || createData.base64) {
      qrCode = createData.qrcode?.base64 || createData.base64;
      pairingCode = createData.pairingCode;
    } else {
      // Buscar QR code separadamente
      const qrResponse = await fetch(
        `${evolutionConfig.apiUrl}/instance/connect/${uniqueInstanceName}`,
        {
          method: 'GET',
          headers: {
            'apikey': evolutionConfig.apiKey,
          },
        }
      );

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        qrCode = qrData.base64?.image || qrData.base64 || qrData.qrcode?.base64 || null;
        pairingCode = qrData.pairingCode;
      }
    }

    return NextResponse.json({
      success: true,
      instanceName: uniqueInstanceName,
      qrCode: qrCode,
      pairingCode: pairingCode,
      integrationId: integration.id,
      message: 'Instância criada com sucesso',
    });
  } catch (error) {
    console.error('[Evolution API] Erro ao criar instância WhatsApp:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
