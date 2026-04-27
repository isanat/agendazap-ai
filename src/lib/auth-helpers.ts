import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/jwt';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  accountId: string | null;
}

/**
 * Parse JWT session cookie from request
 */
async function parseJwtSession(request: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

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
    if (!sessionCookie) return null;

    // Try JWT verification first
    const payload = await verifyAccessToken(sessionCookie);
    if (payload) {
      // Map TokenPayload to AuthUser (TokenPayload uses userId, AuthUser uses id)
      return {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        accountId: payload.accountId,
      };
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Auth] Could not verify JWT session:', error instanceof Error ? error.message : 'Unknown');
    }
    return null;
  }
}

/**
 * Parse authorization header (fallback for localStorage-based auth)
 */
function parseAuthHeader(request: NextRequest): AuthUser | null {
  try {
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userName = request.headers.get('x-user-name');
    const userRole = request.headers.get('x-user-role');
    const accountId = request.headers.get('x-account-id');

    if (userId) {
      return {
        id: userId,
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
 * Uses JWT session cookie or auth headers
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Try JWT cookie-based auth first
    const jwtUser = await parseJwtSession(request);
    if (jwtUser) {
      // Verify user still exists and is active
      // Use select instead of include to avoid querying columns that may not exist yet
      const user = await db.user.findUnique({
        where: { id: jwtUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          Account: { select: { id: true } },
          Professional: { select: { id: true, accountId: true } }
        }
      });

      if (user && user.isActive) {
        // For professional users, get accountId from their Professional relation
        let accountId = user.Account?.id || null;
        if (!accountId && user.Professional?.accountId) {
          accountId = user.Professional.accountId;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountId,
        };
      }
    }

    // Fallback to header-based auth
    const headerUser = parseAuthHeader(request);
    if (headerUser) {
      const user = await db.user.findUnique({
        where: { id: headerUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          Account: { select: { id: true } },
          Professional: { select: { id: true, accountId: true } }
        }
      });

      if (user && user.isActive) {
        // For professional users, get accountId from their Professional relation
        let accountId = user.Account?.id || null;
        if (!accountId && user.Professional?.accountId) {
          accountId = user.Professional.accountId;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountId,
        };
      }
    }

    return null;
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
  
  if (user.role === 'superadmin') return true;
  
  return user.accountId === accountId;
}

/**
 * Get user ID from session without database lookup
 */
export async function getUserIdFromSession(request: NextRequest): Promise<string | null> {
  const jwtUser = await parseJwtSession(request);
  return jwtUser?.id || null;
}

/**
 * Get session data from cookie without database lookup
 */
export async function getSessionData(request: NextRequest): Promise<AuthUser | null> {
  return parseJwtSession(request);
}

/**
 * Get the Professional record linked to a user (for professional-role users)
 * Returns the professional ID and account ID, or null if not a professional
 */
export async function getProfessionalForUser(userId: string): Promise<{
  professionalId: string;
  accountId: string;
  professional: {
    id: string;
    name: string;
    accountId: string;
  };
} | null> {
  const professional = await db.professional.findUnique({
    where: { userId },
    select: { id: true, name: true, accountId: true }
  });

  if (!professional) return null;

  return {
    professionalId: professional.id,
    accountId: professional.accountId,
    professional
  };
}

/**
 * Check if a user is a professional (not owner or superadmin)
 * and return their professional-specific data
 */
export async function getProfessionalContext(request: NextRequest): Promise<{
  userId: string;
  professionalId: string;
  accountId: string;
  isProfessional: boolean;
} | null> {
  const user = await getAuthUser(request);
  if (!user) return null;

  if (user.role !== 'professional') return null;

  const proData = await getProfessionalForUser(user.id);
  if (!proData) return null;

  return {
    userId: user.id,
    professionalId: proData.professionalId,
    accountId: proData.accountId,
    isProfessional: true
  };
}
