import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

/**
 * Mercado Pago OAuth Integration
 * 
 * Documentation: https://www.mercadopago.com.br/developers/en/docs/authentication/oauth
 */

// Mercado Pago OAuth configuration
const MP_CONFIG = {
  clientId: process.env.MP_CLIENT_ID || '',
  clientSecret: process.env.MP_CLIENT_SECRET || '',
  redirectUri: process.env.MP_REDIRECT_URI || '',
  // Sandbox vs Production
  baseUrl: process.env.MP_SANDBOX === 'true' 
    ? 'https://auth.mercadopago.com.br' 
    : 'https://auth.mercadopago.com',
}

/**
 * Start OAuth flow - Generate authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!authUser.accountId) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 400 });
    }

    // Check if Mercado Pago is configured
    if (!MP_CONFIG.clientId || !MP_CONFIG.clientSecret || !MP_CONFIG.redirectUri) {
      return NextResponse.json({
        error: 'Mercado Pago OAuth não configurado pelo administrador do sistema',
        setupRequired: true,
      }, { status: 400 });
    }
    
    // Generate random state for CSRF protection
    const state = randomBytes(32).toString('hex');
    
    // Store state in database
    await db.oAuthState.create({
      data: {
        accountId: authUser.accountId,
        provider: 'mercadopago',
        state,
        redirectUri: MP_CONFIG.redirectUri,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      }
    });
    
    // Build authorization URL
    const authUrl = new URL(`${MP_CONFIG.baseUrl}/authorization`);
    authUrl.searchParams.set('client_id', MP_CONFIG.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('platform_id', 'mp');
    authUrl.searchParams.set('redirect_uri', MP_CONFIG.redirectUri);
    authUrl.searchParams.set('state', state);
    
    return NextResponse.json({
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('Error starting Mercado Pago OAuth:', error);
    return NextResponse.json(
      { error: 'Falha ao iniciar OAuth' },
      { status: 500 }
    );
  }
}
