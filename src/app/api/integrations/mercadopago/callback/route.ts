import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptCredentials } from '../../route';

/**
 * Mercado Pago OAuth Callback
 * Handles the callback from Mercado Pago OAuth
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agendazap-ai.vercel.app';

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
    const errorDescription = searchParams.get('error_description');
    
    // Handle OAuth errors from Mercado Pago
    if (error) {
      console.error('[MP Callback] OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${APP_URL}/?tab=settings&integration_error=${encodeURIComponent(error)}&error_desc=${encodeURIComponent(errorDescription || '')}`
      );
    }
    
    if (!code || !state) {
      console.error('[MP Callback] Missing code or state');
      return NextResponse.redirect(
        `${APP_URL}/?tab=settings&integration_error=missing_params`
      );
    }

    // Find the OAuth state in database
    const oauthState = await db.oAuthState.findUnique({
      where: { state },
    });

    if (!oauthState || oauthState.provider !== 'mercadopago') {
      console.error('[MP Callback] Invalid OAuth state:', state);
      return NextResponse.redirect(
        `${APP_URL}/?tab=settings&integration_error=invalid_state`
      );
    }

    // Check if state is expired
    if (oauthState.expiresAt < new Date()) {
      await db.oAuthState.delete({ where: { id: oauthState.id } });
      console.error('[MP Callback] Expired OAuth state');
      return NextResponse.redirect(
        `${APP_URL}/?tab=settings&integration_error=expired_state`
      );
    }
    
    // Exchange code for tokens
    const MP_CONFIG = await getMPConfig();
    console.log('[MP Callback] Exchanging code for tokens, redirect_uri:', MP_CONFIG.redirectUri);
    
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
      console.error('[MP Callback] Token exchange failed:', tokenResponse.status, errorText);
      return NextResponse.redirect(
        `${APP_URL}/?tab=settings&integration_error=token_failed&error_detail=${encodeURIComponent(errorText.substring(0, 200))}`
      );
    }
    
    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, user_id } = tokens;

    console.log('[MP Callback] Token exchange successful, MP user_id:', user_id);

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
    
    console.log('[MP Callback] Integration saved successfully for account:', oauthState.accountId);
    
    // Redirect to success page
    return NextResponse.redirect(
      `${APP_URL}/?tab=settings&integration_success=mercadopago`
    );
  } catch (error) {
    console.error('[MP Callback] Error:', error);
    return NextResponse.redirect(
      `${APP_URL}/?tab=settings&integration_error=unknown`
    );
  }
}
