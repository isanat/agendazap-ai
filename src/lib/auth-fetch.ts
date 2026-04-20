/**
 * Auth Fetch Utility
 * Provides authenticated fetch with both cookie and header-based auth
 */

interface AuthHeaders {
  'x-user-id'?: string;
  'x-user-email'?: string;
  'x-user-name'?: string;
  'x-user-role'?: string;
  'x-account-id'?: string;
}

/**
 * Validate and fix user data format for backward compatibility
 */
function validateUserData(user: unknown): { id: string; email?: string; name?: string; role?: string; accountId?: string | null } | null {
  if (!user || typeof user !== 'object') return null;

  const u = user as Record<string, unknown>;

  // Must have at least an id
  if (typeof u.id !== 'string' || !u.id) {
    console.warn('[auth-fetch] Invalid user data: missing or invalid id');
    return null;
  }

  return {
    id: u.id,
    email: typeof u.email === 'string' ? u.email : undefined,
    name: typeof u.name === 'string' ? u.name : undefined,
    role: typeof u.role === 'string' ? u.role : 'owner',
    accountId: typeof u.accountId === 'string' ? u.accountId : null,
  };
}

/**
 * Get auth headers from localStorage (for fallback when cookies don't work)
 * Priority: agendazap-user > agendazap-storage (Zustand)
 */
export function getAuthHeaders(): AuthHeaders {
  if (typeof window === 'undefined') return {};

  try {
    // PRIORITY 1: Check agendazap-user first (more reliable for auth)
    const userData = localStorage.getItem('agendazap-user');
    if (userData) {
      try {
        const rawUser = JSON.parse(userData);
        const user = validateUserData(rawUser);

        if (user) {
          // Get accountId from separate storage or from user object
          const accountId = localStorage.getItem('agendazap-account-id') || user.accountId || '';

          console.log('[auth-fetch] ✅ Using auth headers from agendazap-user:', {
            id: user.id,
            email: user.email,
            role: user.role,
            accountId: accountId || 'not set'
          });

          return {
            'x-user-id': user.id,
            'x-user-email': user.email || '',
            'x-user-name': user.name || '',
            'x-user-role': user.role || 'owner',
            'x-account-id': accountId,
          };
        } else {
          console.warn('[auth-fetch] ⚠️ agendazap-user data is invalid, clearing...');
          localStorage.removeItem('agendazap-user');
        }
      } catch (e) {
        console.error('[auth-fetch] ❌ Error parsing agendazap-user:', e);
        localStorage.removeItem('agendazap-user');
      }
    }

    // PRIORITY 2: Fallback to Zustand persisted state
    const storageData = localStorage.getItem('agendazap-storage');
    if (storageData) {
      try {
        const parsed = JSON.parse(storageData);
        const rawUser = parsed?.state?.user;
        const account = parsed?.state?.account;
        const user = validateUserData(rawUser);

        if (user) {
          console.log('[auth-fetch] ✅ Using auth headers from Zustand storage:', {
            id: user.id,
            email: user.email,
            role: user.role,
            accountId: account?.id || 'not set'
          });

          return {
            'x-user-id': user.id,
            'x-user-email': user.email || '',
            'x-user-name': user.name || '',
            'x-user-role': user.role || 'owner',
            'x-account-id': account?.id || '',
          };
        }
      } catch (e) {
        console.error('[auth-fetch] ❌ Error parsing Zustand storage:', e);
      }
    }

    console.log('[auth-fetch] ℹ️ No auth data found in localStorage');
  } catch (error) {
    console.error('[auth-fetch] ❌ Error getting auth headers:', error);
  }

  return {};
}

/**
 * Fetch with authentication (cookies + headers fallback)
 * Automatically refreshes expired JWT tokens on 401 responses
 */
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update stored user data if returned
          if (data.user) {
            localStorage.setItem('agendazap-user', JSON.stringify(data.user));
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

interface AuthFetchOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | BodyInit | null;
}

export async function authFetch(
  url: string,
  options: AuthFetchOptions = {}
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  
  const headers = new Headers(options.headers || {});
  
  // Add auth headers
  Object.entries(authHeaders).forEach(([key, value]) => {
    if (value) {
      headers.set(key, value);
    }
  });
  
  // Serialize body if it's a plain object (not FormData, Blob, etc.)
  let body: BodyInit | null | undefined = options.body as BodyInit | null | undefined;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData) && !(options.body instanceof Blob) && !(options.body instanceof ArrayBuffer) && !(options.body instanceof ReadableStream) && !(options.body instanceof URLSearchParams)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    body = JSON.stringify(options.body);
  }
  
  const fetchOptions: RequestInit = {
    ...options,
    body,
    headers,
    credentials: 'include', // Always include cookies
  };
  
  let response = await fetch(url, fetchOptions);
  
  // If 401, try to refresh the token and retry once
  if (response.status === 401 && !url.includes('/api/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry the original request with updated cookies
      response = await fetch(url, fetchOptions);
    } else {
      // Refresh failed - redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('agendazap-user');
        localStorage.removeItem('agendazap-account-id');
        window.location.replace('/');
      }
    }
  }
  
  return response;
}

/**
 * Convenience methods
 */
export const authGet = (url: string) => authFetch(url, { method: 'GET' });
export const authPost = (url: string, body?: Record<string, unknown> | BodyInit | null) => 
  authFetch(url, { method: 'POST', body });
export const authPut = (url: string, body?: Record<string, unknown> | BodyInit | null) => 
  authFetch(url, { method: 'PUT', body });
export const authDelete = (url: string) => 
  authFetch(url, { method: 'DELETE' });

/**
 * Add auth headers to existing headers object
 */
export function withAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  const authHeaders = getAuthHeaders();
  return {
    ...headers,
    ...authHeaders,
  };
}
