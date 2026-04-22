import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

/**
 * Mercado Pago OAuth Integration
 * 
 * Documentation: https://www.mercadopago.com.br/developers/en/docs/authentication/oauth
 * 
 * Supports credentials from:
 * 1. Environment variables (MP_CLIENT_ID, MP_CLIENT_SECRET, MP_REDIRECT_URI)
 * 2. SystemConfiguration table (mpClientId, mpClientSecret, mpRedirectUri)
 */

// Get Mercado Pago OAuth configuration from env vars or database
async function getMPConfig() {
  // First check environment variables
  let clientId = process.env.MP_CLIENT_ID || '';
  let clientSecret = process.env.MP_CLIENT_SECRET || '';
  let redirectUri = process.env.MP_REDIRECT_URI || '';
  
  // If env vars are not set, check SystemConfiguration in database
  if (!clientId || !clientSecret || !redirectUri) {
    try {
      const config = await db.systemConfiguration.findFirst();
      if (config) {
        clientId = clientId || config.mpClientId || '';
        clientSecret = clientSecret || config.mpClientSecret || '';
        redirectUri = redirectUri || config.mpRedirectUri || '';
      }
    } catch (err) {
      console.error('[MP OAuth] Error reading SystemConfiguration:', err);
    }
  }
  
  return {
    clientId,
    clientSecret,
    redirectUri,
    // Mercado Pago OAuth base URL
    // Use .com for production (global), .com.br for Brazil sandbox
    baseUrl: process.env.MP_SANDBOX === 'true'
      ? 'https://auth.mercadopago.com.br'
      : 'https://auth.mercadopago.com',
  };
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

    const MP_CONFIG = await getMPConfig();

    // Check if Mercado Pago is configured
    if (!MP_CONFIG.clientId || !MP_CONFIG.clientSecret || !MP_CONFIG.redirectUri) {
      return NextResponse.json({
        error: 'Mercado Pago OAuth não configurado pelo administrador do sistema',
        setupRequired: true,
        setupInstructions: 'O administrador precisa configurar as credenciais do Mercado Pago em Configurações do Sistema ou nas variáveis de ambiente (MP_CLIENT_ID, MP_CLIENT_SECRET, MP_REDIRECT_URI).',
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
    
    console.log(`[MP OAuth] Generated auth URL for account ${authUser.accountId}, redirect URI: ${MP_CONFIG.redirectUri}`);
    
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
