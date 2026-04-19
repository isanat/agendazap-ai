/**
 * Centralized API helper with automatic credentials inclusion
 * This ensures cookies are sent with all API requests for authentication
 */

type ApiOptions = RequestInit;

/**
 * Wrapper around fetch that automatically includes credentials: 'include'
 * This ensures cookies (like session cookies) are sent with every request
 */
export async function apiFetch(url: string, options: ApiOptions = {}): Promise<Response> {
  const defaultOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers: {
      ...options.headers,
    },
  };

  return fetch(url, defaultOptions);
}

/**
 * GET request helper
 */
export async function apiGet(url: string, options: ApiOptions = {}): Promise<Response> {
  return apiFetch(url, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost(url: string, data?: unknown, options: ApiOptions = {}): Promise<Response> {
  return apiFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut(url: string, data?: unknown, options: ApiOptions = {}): Promise<Response> {
  return apiFetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete(url: string, options: ApiOptions = {}): Promise<Response> {
  return apiFetch(url, { ...options, method: 'DELETE' });
}

/**
 * Helper to check if response is OK and parse JSON
 */
export async function parseApiResponse<T>(response: Response): Promise<{ data: T | null; error: string | null }> {
  try {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { data: null, error: errorData.error || `HTTP error: ${response.status}` };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
