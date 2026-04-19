import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  accountId: string | null;
}

/**
 * Parse session cookie from request
 */
function parseSessionCookie(request: NextRequest): { userId: string; email: string; name: string; role: string; accountId: string | null } | null {
  try {
    // Get the cookie from the request headers
    const cookieHeader = request.headers.get('cookie');

    if (!cookieHeader) {
      return null;
    }

    // Parse cookies - handle values that may contain '='
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

    const sessionCookie = cookies['agendazap_session'];

    if (!sessionCookie) {
      return null;
    }

    // Decode session data from base64
    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');

    // Validate decoded content before parsing
    if (!decoded || decoded.length === 0) {
      return null;
    }

    const sessionData = JSON.parse(decoded);

    // Validate required fields
    if (!sessionData?.userId) {
      return null;
    }

    return sessionData;
  } catch (error) {
    // Log only in development, not in production (avoids noise in logs)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Auth] Could not parse session cookie:', error instanceof Error ? error.message : 'Unknown');
    }
    return null;
  }
}

/**
 * Parse authorization header (fallback for localStorage-based auth)
 */
function parseAuthHeader(request: NextRequest): { userId: string; email: string; name: string; role: string; accountId: string | null } | null {
  try {
    // Check for X-User-Id header (sent from frontend localStorage)
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userName = request.headers.get('x-user-name');
    const userRole = request.headers.get('x-user-role');
    const accountId = request.headers.get('x-account-id');

    if (userId) {
      console.log('[Auth] Auth header found for user:', userEmail);
      return {
        userId,
        email: userEmail || '',
        name: userName || '',
        role: userRole || 'owner',
        accountId: accountId || null,
      };
    }

    return null;
  } catch (error) {
    console.error('[Auth] Error parsing auth header:', error);
    return null;
  }
}

/**
 * Unified authentication helper for API routes
 * Uses the custom session cookie (agendazap_session) or auth headers
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Try cookie-based auth first
    let sessionData = parseSessionCookie(request);
    
    // Fallback to header-based auth
    if (!sessionData) {
      sessionData = parseAuthHeader(request);
    }
    
    if (!sessionData?.userId) {
      return null;
    }

    // Verify user still exists and is active
    const user = await db.user.findUnique({
      where: { id: sessionData.userId },
      include: { Account: true }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      accountId: user.Account?.id || null,
    };
  } catch (error) {
    console.error('Auth helper error:', error);
    return null;
  }
}

/**
 * Check if user is a superadmin
 */
export async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const user = await getAuthUser(request);
  return user?.role === 'superadmin';
}

/**
 * Check if user has access to a specific account
 */
export async function hasAccountAccess(request: NextRequest, accountId: string): Promise<boolean> {
  const user = await getAuthUser(request);
  if (!user) return false;
  
  // Superadmin has access to all accounts
  if (user.role === 'superadmin') return true;
  
  // Check if user belongs to the account
  return user.accountId === accountId;
}

/**
 * Get user ID from session without database lookup
 * Faster when you just need the ID
 */
export function getUserIdFromSession(request: NextRequest): string | null {
  const sessionData = parseSessionCookie(request);
  return sessionData?.userId || null;
}

/**
 * Get session data from cookie without database lookup
 */
export function getSessionData(request: NextRequest): { userId: string; email: string; name: string; role: string; accountId: string | null } | null {
  return parseSessionCookie(request);
}
