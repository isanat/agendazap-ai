import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken, revokeAllRefreshTokens } from '@/lib/jwt';

/**
 * POST /api/auth/logout
 * Clear JWT cookies and revoke refresh tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Try to get user ID from JWT session to revoke refresh tokens
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

      // Revoke refresh tokens from JWT session
      const sessionCookie = cookies['agendazap_session'];
      if (sessionCookie) {
        try {
          const payload = await verifyAccessToken(sessionCookie);
          if (payload) {
            await revokeAllRefreshTokens(payload.userId);
          }
        } catch {
          // Token may be expired, try refresh token
        }
      }

      // Also try via refresh token directly
      const refreshToken = cookies['agendazap_refresh_token'];
      if (refreshToken && !sessionCookie) {
        try {
          const storedToken = await db.refreshToken.findUnique({
            where: { token: refreshToken }
          });
          if (storedToken) {
            await revokeAllRefreshTokens(storedToken.userId);
          }
        } catch {
          // Ignore errors during cleanup
        }
      }
    }
  } catch (error) {
    console.error('[Logout] Error revoking tokens:', error);
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });

  // Clear JWT cookies
  response.cookies.set('agendazap_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });

  response.cookies.set('agendazap_refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/api/auth',
  });

  // Also clear legacy NextAuth cookies
  response.cookies.set('next-auth.session-token', '', {
    expires: new Date(0),
    path: '/',
  });

  response.cookies.set('next-auth.csrf-token', '', {
    expires: new Date(0),
    path: '/',
  });

  response.cookies.set('next-auth.callback-url', '', {
    expires: new Date(0),
    path: '/',
  });

  return response;
}
