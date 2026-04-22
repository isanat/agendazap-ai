import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptCredentials } from '../../route';

/**
 * Mercado Pago OAuth Callback
 * Handles the callback from Mercado Pago OAuth
 */

// Get MP config from env vars or database
async function getMPConfig() {
  let clientId = process.env.MP_CLIENT_ID || '';
  let clientSecret = process.env.MP_CLIENT_SECRET || '';
  let redirectUri = process.env.MP_REDIRECT_URI || '';
  
  if (!clientId || !clientSecret || !redirectUri) {
    try {
      const config = await db.systemConfiguration.findFirst();
      if (config) {
        clientId = clientId || config.mpClientId || '';
        clientSecret = clientSecret || config.mpClientSecret || '';
        redirectUri = redirectUri || config.mpRedirectUri || '';
      }
    } catch (err) {
      console.error('[MP Callback] Error reading SystemConfiguration:', err);
    }
  }
  
  return {
    clientId,
    clientSecret,
    redirectUri,
    baseUrl: 'https://api.mercadopago.com',
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('Mercado Pago OAuth error:', error);
      return NextResponse.redirect(
        new URL('/?tab=settings&integration_error=' + error, request.url)
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/?tab=settings&integration_error=missing_params', request.url)
      );
    }

    // Find the OAuth state in database
    const oauthState = await db.oAuthState.findUnique({
      where: { state },
    });

    if (!oauthState || oauthState.provider !== 'mercadopago') {
      return NextResponse.redirect(
        new URL('/?tab=settings&integration_error=invalid_state', request.url)
      );
    }

    // Check if state is expired
    if (oauthState.expiresAt < new Date()) {
      await db.oAuthState.delete({ where: { id: oauthState.id } });
      return NextResponse.redirect(
        new URL('/?tab=settings&integration_error=expired_state', request.url)
      );
    }
    
    // Exchange code for tokens
    const MP_CONFIG = await getMPConfig();
    const tokenResponse = await fetch(`${MP_CONFIG.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: MP_CONFIG.clientId,
        client_secret: MP_CONFIG.clientSecret,
        code,
        redirect_uri: MP_CONFIG.redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/?tab=settings&integration_error=token_failed', request.url)
      );
    }
    
    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, user_id } = tokens;

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (expires_in || 21600) * 1000); // Default 6 hours

    // Encrypt and store tokens
    const encryptedCredentials = encryptCredentials({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expiresAt.toISOString(),
      mpUserId: user_id?.toString(),
    });

    // Create or update integration
    await db.integration.upsert({
      where: {
        accountId_type: {
          accountId: oauthState.accountId,
          type: 'mercadopago',
        },
      },
      create: {
        accountId: oauthState.accountId,
        type: 'mercadopago',
        status: 'connected',
        credentials: encryptedCredentials,
        lastSync: new Date(),
        metadata: JSON.stringify({
          connectedAt: new Date().toISOString(),
          mpUserId: user_id?.toString(),
        }),
      },
      update: {
        status: 'connected',
        credentials: encryptedCredentials,
        lastSync: new Date(),
        errorMessage: null,
        metadata: JSON.stringify({
          connectedAt: new Date().toISOString(),
          mpUserId: user_id?.toString(),
        }),
      },
    });

    // Clean up OAuth state
    await db.oAuthState.delete({ where: { id: oauthState.id } });
    
    // Redirect to success page
    return NextResponse.redirect(
      new URL('/?tab=settings&integration_success=mercadopago', request.url)
    );
  } catch (error) {
    console.error('Mercado Pago OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/?tab=settings&integration_error=unknown', request.url)
    );
  }
}
