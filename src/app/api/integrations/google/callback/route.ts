import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptCredentials } from '../../route';

/**
 * Google Calendar OAuth Callback
 * Handles the callback from Google OAuth
 */

const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
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

    if (!oauthState || oauthState.provider !== 'google') {
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
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CONFIG.clientId,
        client_secret: GOOGLE_CONFIG.clientSecret,
        redirect_uri: GOOGLE_CONFIG.redirectUri,
        grant_type: 'authorization_code',
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
    const { access_token, refresh_token, expires_in } = tokens;

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    // Encrypt and store tokens
    const encryptedCredentials = encryptCredentials({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expiresAt.toISOString(),
    });

    // Create or update integration
    await db.integration.upsert({
      where: {
        accountId_type: {
          accountId: oauthState.accountId,
          type: 'google_calendar',
        },
      },
      create: {
        accountId: oauthState.accountId,
        type: 'google_calendar',
        status: 'connected',
        credentials: encryptedCredentials,
        lastSync: new Date(),
        metadata: JSON.stringify({
          connectedAt: new Date().toISOString(),
          hasRefreshToken: !!refresh_token,
        }),
      },
      update: {
        status: 'connected',
        credentials: encryptedCredentials,
        lastSync: new Date(),
        errorMessage: null,
        metadata: JSON.stringify({
          connectedAt: new Date().toISOString(),
          hasRefreshToken: !!refresh_token,
        }),
      },
    });

    // Clean up OAuth state
    await db.oAuthState.delete({ where: { id: oauthState.id } });
    
    // Redirect to success page
    return NextResponse.redirect(
      new URL('/?tab=settings&integration_success=google_calendar', request.url)
    );
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/?tab=settings&integration_error=unknown', request.url)
    );
  }
}
