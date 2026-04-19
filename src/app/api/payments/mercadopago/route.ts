import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { decryptCredentials } from '@/app/api/integrations/route';

/**
 * Mercado Pago Integration for PIX Payments
 * 
 * Uses TENANT-specific Mercado Pago credentials stored in the Integration table.
 * Each business connects their own Mercado Pago account via OAuth.
 */

interface MPConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  mpUserId?: string;
}

// Get Mercado Pago config for a specific account
async function getMPConfigForAccount(accountId: string): Promise<MPConfig | null> {
  const integration = await db.integration.findUnique({
    where: {
      accountId_type: {
        accountId,
        type: 'mercadopago'
      }
    }
  });

  if (!integration || integration.status !== 'connected') {
    return null;
  }

  const credentials = decryptCredentials(integration.credentials);

  if (!credentials.accessToken) {
    return null;
  }

  return {
    accessToken: credentials.accessToken as string,
    refreshToken: credentials.refreshToken as string,
    expiresAt: new Date(credentials.expiresAt as string),
    mpUserId: credentials.mpUserId as string | undefined,
  };
}

// Check if token needs refresh and refresh if necessary
async function ensureValidToken(accountId: string, config: MPConfig): Promise<string> {
  // If token expires in less than 5 minutes, refresh it
  const fiveMinutes = 5 * 60 * 1000;
  if (config.expiresAt.getTime() - Date.now() < fiveMinutes) {
    // In production, implement token refresh
    // For now, return existing token
    console.log('[Mercado Pago] Token may need refresh for account:', accountId);
  }
  return config.accessToken;
}

/**
 * Create a PIX payment
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      amount, 
      description, 
      clientName, 
      clientEmail, 
      clientCpf,
      externalReference,
      expiresInSeconds = 3600
    } = body;

    if (!amount || !description) {
      return NextResponse.json(
        { error: 'Amount and description are required' },
        { status: 400 }
      );
    }

    // Get Mercado Pago config for this account
    const config = await getMPConfigForAccount(authUser.accountId);

    // If not configured, return simulated response
    if (!config) {
      console.log('[Mercado Pago] Not configured for account, returning simulated response');
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'PIX created (simulated - Mercado Pago not connected)',
        data: {
          id: `sim_${Date.now()}`,
          status: 'pending',
          qrCode: '00020126580014br.gov.bcb.pix0136agendazap-simulated-pix',
          qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          ticketUrl: 'https://mpag.to/agendazap',
          deepLink: 'pix://agendazap-simulated',
          expiresIn: expiresInSeconds,
          amount,
          description,
        }
      });
    }

    const accessToken = await ensureValidToken(authUser.accountId, config);
    const expirationDate = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const apiBaseUrl = 'https://api.mercadopago.com';

    // Create payment using Mercado Pago API
    const response = await fetch(`${apiBaseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: 'pix',
        external_reference: externalReference,
        date_of_expiration: expirationDate,
        payer: {
          email: clientEmail || 'cliente@agendazap.com',
          first_name: clientName?.split(' ')[0] || 'Cliente',
          last_name: clientName?.split(' ').slice(1).join(' ') || '',
          identification: clientCpf ? {
            type: 'CPF',
            number: clientCpf.replace(/\D/g, ''),
          } : undefined,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Mercado Pago] Error:', error);
      return NextResponse.json(
        { 
          error: error.message || 'Failed to create PIX payment',
          details: error 
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        status: data.status,
        qrCode: data.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
        ticketUrl: data.point_of_interaction?.transaction_data?.ticket_url,
        deepLink: data.point_of_interaction?.transaction_data?.bank_info?.deep_link,
        expiresIn: expiresInSeconds,
        amount: data.transaction_amount,
        description: data.description,
      },
    });
  } catch (error) {
    console.error('[Mercado Pago] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Get payment status or list payments
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    const externalReference = searchParams.get('external_reference');

    // Get Mercado Pago config for this account
    const config = await getMPConfigForAccount(authUser.accountId);

    // If not configured, return simulated response
    if (!config) {
      return NextResponse.json({
        success: true,
        simulated: true,
        configured: false,
        status: 'pending',
        message: 'Mercado Pago não conectado. Acesse Configurações > Integrações.',
      });
    }

    const accessToken = await ensureValidToken(authUser.accountId, config);
    const apiBaseUrl = 'https://api.mercadopago.com';

    // Get specific payment by ID
    if (paymentId) {
      const response = await fetch(`${apiBaseUrl}/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Mercado Pago] Error getting payment:', error);
        return NextResponse.json(
          { error: 'Failed to get payment' },
          { status: 500 }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          status: data.status,
          statusDetail: data.status_detail,
          amount: data.transaction_amount,
          description: data.description,
          externalReference: data.external_reference,
          dateCreated: data.date_created,
          dateApproved: data.date_approved,
          payer: data.payer,
        },
      });
    }

    // Search payments by external reference
    if (externalReference) {
      const response = await fetch(
        `${apiBaseUrl}/v1/payments/search?external_reference=${externalReference}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[Mercado Pago] Error searching payments:', error);
        return NextResponse.json(
          { error: 'Failed to search payments' },
          { status: 500 }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        data: data.results?.map((payment: Record<string, unknown>) => ({
          id: payment.id,
          status: payment.status,
          statusDetail: payment.status_detail,
          amount: payment.transaction_amount,
          description: payment.description,
          externalReference: payment.external_reference,
          dateCreated: payment.date_created,
          dateApproved: payment.date_approved,
        })),
        total: data.paging?.total,
      });
    }

    return NextResponse.json(
      { error: 'Provide id or external_reference parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Mercado Pago] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Refund a payment
 */
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Get Mercado Pago config for this account
    const config = await getMPConfigForAccount(authUser.accountId);

    if (!config) {
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Payment refunded (simulated)',
      });
    }

    const accessToken = await ensureValidToken(authUser.accountId, config);
    const apiBaseUrl = 'https://api.mercadopago.com';

    const response = await fetch(`${apiBaseUrl}/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Mercado Pago] Error refunding payment:', error);
      return NextResponse.json(
        { error: 'Failed to refund payment' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Mercado Pago] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
