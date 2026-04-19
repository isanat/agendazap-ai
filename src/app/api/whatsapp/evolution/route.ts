import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

/**
 * Evolution API Integration for WhatsApp
 * 
 * This endpoint uses the SYSTEM configuration (admin) for Evolution API server
 * and the TENANT configuration for the specific WhatsApp instance.
 * 
 * Architecture:
 * - Admin configures: Evolution API URL + Global API Key (Environment Variables or SystemConfiguration)
 * - Each tenant has: Their own WhatsApp instance name (Integration)
 */

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

/**
 * Get Evolution API configuration from environment variables or database
 * Priority: Environment Variables > Database SystemConfiguration
 */
async function getEvolutionApiConfig() {
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

// Get configuration for a specific account
async function getEvolutionConfigForAccount(accountId: string): Promise<EvolutionConfig | null> {
  // Get system config (admin settings)
  const systemConfig = await getEvolutionApiConfig();
  
  if (!systemConfig) {
    return null;
  }

  // Get tenant's WhatsApp integration
  const integration = await db.integration.findUnique({
    where: {
      accountId_type: {
        accountId,
        type: 'whatsapp'
      }
    }
  });

  if (!integration) {
    return null;
  }

  // Get instance name from credentials
  const credentials = typeof integration.credentials === 'string' 
    ? JSON.parse(integration.credentials) 
    : integration.credentials;

  return {
    apiUrl: systemConfig.apiUrl,
    apiKey: systemConfig.apiKey,
    instanceName: credentials.instanceName,
  };
}

/**
 * Send a text message via WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, message, options } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone and message are required' },
        { status: 400 }
      );
    }

    // Get configuration for this account
    const config = await getEvolutionConfigForAccount(authUser.accountId);

    // If not configured, return simulated response
    if (!config) {
      console.log('[Evolution API] Not configured for account, returning simulated response');
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Message sent (simulated - WhatsApp not connected)',
        data: {
          to: phone,
          message,
          timestamp: new Date().toISOString(),
        }
      });
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    // Send message via Evolution API
    const response = await fetch(`${config.apiUrl}/message/sendText/${config.instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        options: {
          delay: options?.delay || 1000,
          presence: 'composing',
          ...options,
        },
        textMessage: {
          text: message,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Evolution API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Log message in database
    await db.whatsappMessage.create({
      data: {
        accountId: authUser.accountId,
        clientPhone: formattedPhone,
        direction: 'outgoing',
        message,
        messageType: 'text',
        status: 'sent',
      }
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Evolution API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Get connection status and QR code
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get configuration for this account
    const config = await getEvolutionConfigForAccount(authUser.accountId);

    // If not configured, return simulated status
    if (!config) {
      return NextResponse.json({
        success: true,
        simulated: true,
        configured: false,
        status: 'not_configured',
        message: 'WhatsApp não configurado. Acesse Configurações > Integrações para conectar.',
      });
    }

    // Get instance connection state
    if (action === 'status' || !action) {
      const response = await fetch(`${config.apiUrl}/instance/connectionState/${config.instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': config.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Evolution API] Error getting status:', error);
        return NextResponse.json(
          { error: 'Failed to get connection status' },
          { status: 500 }
        );
      }

      const data = await response.json();
      const state = data.instance?.state || data.state || 'unknown';

      // Update integration status
      await db.integration.update({
        where: {
          accountId_type: {
            accountId: authUser.accountId,
            type: 'whatsapp'
          }
        },
        data: {
          status: state === 'open' || state === 'connected' ? 'connected' : 'disconnected',
          lastSync: new Date(),
        }
      });

      return NextResponse.json({
        success: true,
        configured: true,
        status: state,
        instanceName: config.instanceName,
        data,
      });
    }

    // Get QR code for connection
    if (action === 'qrcode') {
      const response = await fetch(`${config.apiUrl}/instance/connect/${config.instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': config.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Evolution API] Error getting QR code:', error);
        return NextResponse.json(
          { error: 'Failed to get QR code' },
          { status: 500 }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        configured: true,
        qrCode: data.base64?.image || data.qrcode?.base64 || data.base64,
        pairingCode: data.pairingCode,
        data,
      });
    }

    // Disconnect instance
    if (action === 'disconnect') {
      const response = await fetch(`${config.apiUrl}/instance/logout/${config.instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': config.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Evolution API] Error disconnecting:', error);
        return NextResponse.json(
          { error: 'Failed to disconnect' },
          { status: 500 }
        );
      }

      // Update integration status
      await db.integration.update({
        where: {
          accountId_type: {
            accountId: authUser.accountId,
            type: 'whatsapp'
          }
        },
        data: {
          status: 'disconnected',
        }
      });

      // Also update account WhatsApp status
      await db.account.update({
        where: { id: authUser.accountId },
        data: {
          whatsappConnected: false,
          whatsappSession: null,
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Disconnected successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Evolution API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect WhatsApp
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Get configuration for this account
    const config = await getEvolutionConfigForAccount(authUser.accountId);

    // If not configured, return success
    if (!config) {
      return NextResponse.json({
        success: true,
        message: 'No WhatsApp integration to disconnect',
      });
    }

    // Disconnect from Evolution API
    const response = await fetch(`${config.apiUrl}/instance/logout/${config.instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': config.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Evolution API] Error disconnecting:', error);
      // Don't fail if the instance doesn't exist
    }

    // Update integration status
    await db.integration.update({
      where: {
        accountId_type: {
          accountId: authUser.accountId,
          type: 'whatsapp'
        }
      },
      data: {
        status: 'disconnected',
      }
    }).catch(() => {});

    // Also update account WhatsApp status
    await db.account.update({
      where: { id: authUser.accountId },
      data: {
        whatsappConnected: false,
        whatsappSession: null,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp disconnected successfully',
    });
  } catch (error) {
    console.error('[Evolution API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
