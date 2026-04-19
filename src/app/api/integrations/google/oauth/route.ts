import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

/**
 * Google Calendar OAuth Integration
 * 
 * This handles the OAuth 2.0 flow for Google Calendar API
 */

// Google OAuth configuration
const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
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

    // Check if Google is configured
    if (!GOOGLE_CONFIG.clientId || !GOOGLE_CONFIG.clientSecret || !GOOGLE_CONFIG.redirectUri) {
      return NextResponse.json({
        error: 'Google OAuth não configurado pelo administrador do sistema',
        setupRequired: true,
      }, { status: 400 });
    }

    // Generate random state for CSRF protection
    const state = randomBytes(32).toString('hex');
    
    // Store state in database
    await db.oAuthState.create({
      data: {
        accountId: authUser.accountId,
        provider: 'google',
        state,
        redirectUri: GOOGLE_CONFIG.redirectUri,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      }
    });
    
    // Build authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', GOOGLE_CONFIG.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_CONFIG.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    
    return NextResponse.json({
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('Error starting Google OAuth:', error);
    return NextResponse.json(
      { error: 'Falha ao iniciar OAuth' },
      { status: 500 }
    );
  }
}
