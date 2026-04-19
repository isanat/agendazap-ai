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

// POST - Desconectar instância WhatsApp
export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
    }

    // Buscar configuração do Evolution API
    const evolutionConfig = await getEvolutionConfig();
    
    if (evolutionConfig) {
      const credentials = JSON.parse(integration.credentials);
      const instanceName = credentials.instanceName;

      // Desconectar no Evolution API
      await fetch(
        `${evolutionConfig.apiUrl}/instance/logout/${instanceName}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': evolutionConfig.apiKey,
          },
        }
      );

      // Opcionalmente, deletar a instância
      await fetch(
        `${evolutionConfig.apiUrl}/instance/delete/${instanceName}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': evolutionConfig.apiKey,
          },
        }
      );
    }

    // Atualizar status no banco
    await db.integration.update({
      where: { id: integration.id },
      data: {
        status: 'disconnected',
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
