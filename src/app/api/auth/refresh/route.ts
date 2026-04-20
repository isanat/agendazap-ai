import { NextRequest, NextResponse } from 'next/server';
import { rotateRefreshToken, generateAccessToken, verifyAccessToken } from '@/lib/jwt';
import { db } from '@/lib/db';
import { serialize } from 'cookie';

/**
 * POST - Refresh access token using refresh token
 * 
 * Flow:
 * 1. Client sends refresh token in cookie or body
 * 2. Server validates refresh token
 * 3. If valid, rotate: issue new access token + new refresh token
 * 4. Revoke old refresh token
 * 5. Return new tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    let refreshToken: string | null = null;

    // Try cookie first
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach(cookie => {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex);
          const value = trimmed.substring(equalIndex + 1);
          cookies[key] = value;
        }
      });
      refreshToken = cookies['agendazap_refresh_token'] || null;
    }

    // Fallback to body
    if (!refreshToken) {
      try {
        const body = await request.json();
        refreshToken = body.refreshToken || null;
      } catch {
        // No body
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token não fornecido' },
        { status: 401 }
      );
    }

    // Rotate the refresh token
    const result = await rotateRefreshToken(refreshToken);

    if (!result) {
      return NextResponse.json(
        { error: 'Refresh token inválido ou expirado. Faça login novamente.' },
        { status: 401 }
      );
    }

    // Set new cookies
    const isProduction = process.env.NODE_ENV === 'production';

    // Access token cookie (short-lived, 15 minutes)
    const accessTokenCookie = serialize('agendazap_session', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: result.expiresIn,
      path: '/',
    });

    // Refresh token cookie (long-lived, 7 days)
    const refreshTokenCookie = serialize('agendazap_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/api/auth', // Only accessible by auth routes
    });

    // Get user info for response
    const accessTokenPayload = await verifyAccessToken(result.accessToken);

    return NextResponse.json(
      {
        success: true,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: accessTokenPayload ? {
          id: accessTokenPayload.userId,
          email: accessTokenPayload.email,
          name: accessTokenPayload.name,
          role: accessTokenPayload.role,
          accountId: accessTokenPayload.accountId,
        } : null,
      },
      {
        headers: {
          'Set-Cookie': `${accessTokenCookie}, ${refreshTokenCookie}`,
        },
      }
    );
  } catch (error) {
    console.error('[Refresh] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao renovar sessão' },
      { status: 500 }
    );
  }
}
