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

  if (envApiUrl && envApiKey) {
    return {
      apiUrl: envApiUrl,
      apiKey: envApiKey,
    };
  }

  // Fallback to database configuration
  const systemConfig = await db.systemConfiguration.findFirst();
  
  if (systemConfig?.evolutionApiUrl && systemConfig?.evolutionApiKey) {
    return {
      apiUrl: systemConfig.evolutionApiUrl,
      apiKey: systemConfig.evolutionApiKey,
    };
  }

  return null;
}

// GET - Verificar status da conexão WhatsApp
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
      return NextResponse.json({ status: 'not_configured' });
    }

    // Buscar configuração do Evolution API
    const evolutionConfig = await getEvolutionConfig();
    
    if (!evolutionConfig) {
      return NextResponse.json({ status: 'error', error: 'Servidor não configurado' });
    }

    const credentials = JSON.parse(integration.credentials);
    const instanceName = credentials.instanceName;

    // Verificar status no Evolution API
    const statusResponse = await fetch(
      `${evolutionConfig.apiUrl}/instance/connectionState/${instanceName}`,
      {
        method: 'GET',
        headers: {
          'apikey': evolutionConfig.apiKey,
        },
      }
    );

    if (!statusResponse.ok) {
      return NextResponse.json({ status: 'error', error: 'Erro ao verificar status' });
    }

    const statusData = await statusResponse.json();
    const connectionState = statusData.instance?.state || statusData.state;

    let status = 'pending';
    if (connectionState === 'open' || connectionState === 'connected') {
      status = 'connected';
      
      // Atualizar no banco - Integration
      await db.integration.update({
        where: { id: integration.id },
        data: {
          status: 'connected',
          lastSync: new Date(),
        }
      });
      
      // Atualizar no banco - Account.whatsappConnected
      await db.account.update({
        where: { id: authUser.accountId },
        data: { whatsappConnected: true }
      });
    } else if (connectionState === 'close' || connectionState === 'disconnected') {
      status = 'disconnected';
      
      // Atualizar no banco - Integration
      await db.integration.update({
        where: { id: integration.id },
        data: { status: 'disconnected' }
      });
      
      // Atualizar no banco - Account.whatsappConnected
      await db.account.update({
        where: { id: authUser.accountId },
        data: { whatsappConnected: false }
      });
    }

    return NextResponse.json({
      status,
      instanceName,
      state: connectionState,
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
