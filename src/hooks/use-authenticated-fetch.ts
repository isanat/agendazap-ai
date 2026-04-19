'use client'

import { useCallback } from 'react'

interface UseAuthenticatedFetchOptions {
  baseUrl?: string
}

interface UserData {
  id: string
  email: string
  name: string
  role: string
}

interface AccountData {
  id: string
  businessName: string
}

/**
 * Hook para fazer requisições autenticadas à API
 * Envia automaticamente headers de autenticação baseados no localStorage
 */
export function useAuthenticatedFetch(options: UseAuthenticatedFetchOptions = {}) {
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Get user data from localStorage
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('agendazap-user')
      const accountId = localStorage.getItem('agendazap-account-id')

      if (userStr) {
        try {
          const user: UserData = JSON.parse(userStr)
          headers['x-user-id'] = user.id
          headers['x-user-email'] = user.email
          headers['x-user-name'] = encodeURIComponent(user.name)
          headers['x-user-role'] = user.role
        } catch (e) {
          console.error('Error parsing user from localStorage:', e)
        }
      }

      if (accountId) {
        headers['x-account-id'] = accountId
      }
    }

    return headers
  }, [])

  const fetchWithAuth = useCallback(async (
    url: string,
    fetchOptions: RequestInit = {}
  ): Promise<Response> => {
    const authHeaders = getAuthHeaders()
    
    const mergedOptions: RequestInit = {
      ...fetchOptions,
      headers: {
        ...authHeaders,
        ...fetchOptions.headers,
      },
    }

    // Handle body serialization if it's an object
    if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
      mergedOptions.body = JSON.stringify(fetchOptions.body)
    }

    const fullUrl = options.baseUrl ? `${options.baseUrl}${url}` : url
    
    return fetch(fullUrl, mergedOptions)
  }, [getAuthHeaders, options.baseUrl])

  const get = useCallback(async (url: string): Promise<Response> => {
    return fetchWithAuth(url, { method: 'GET' })
  }, [fetchWithAuth])

  const post = useCallback(async (url: string, body?: unknown): Promise<Response> => {
    return fetchWithAuth(url, {
      method: 'POST',
      body: body as BodyInit,
    })
  }, [fetchWithAuth])

  const put = useCallback(async (url: string, body?: unknown): Promise<Response> => {
    return fetchWithAuth(url, {
      method: 'PUT',
      body: body as BodyInit,
    })
  }, [fetchWithAuth])

  const del = useCallback(async (url: string): Promise<Response> => {
    return fetchWithAuth(url, { method: 'DELETE' })
  }, [fetchWithAuth])

  return {
    fetchWithAuth,
    getAuthHeaders,
    get,
    post,
    put,
    del,
  }
}

/**
 * Helper function to add auth headers to any fetch call
 */
export function addAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  const authHeaders: Record<string, string> = {}

  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('agendazap-user')
    const accountId = localStorage.getItem('agendazap-account-id')

    if (userStr) {
      try {
        const user: UserData = JSON.parse(userStr)
        authHeaders['x-user-id'] = user.id
        authHeaders['x-user-email'] = user.email
        authHeaders['x-user-name'] = encodeURIComponent(user.name)
        authHeaders['x-user-role'] = user.role
      } catch (e) {
        console.error('Error parsing user from localStorage:', e)
      }
    }

    if (accountId) {
      authHeaders['x-account-id'] = accountId
    }
  }

  return {
    ...headers,
    ...authHeaders,
  }
}
