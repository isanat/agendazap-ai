'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseDataOptions {
  accountId?: string | null
  enabled?: boolean
}

// Wrapper for fetch that includes credentials for cookie-based auth
const authFetch = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
    },
  });
};

interface UseDataResult<T> {
  data: T | null
  isLoading: boolean
  isRefreshing: boolean
  isInitialLoad: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Generic hook for fetching data from API
export function useFetch<T>(
  url: string | null,
  options?: UseDataOptions
): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!url || options?.enabled === false) {
      setIsLoading(false)
      setIsInitialLoad(false)
      return
    }

    // If we already have data, this is a refresh (not initial load)
    const isInitialFetchRequest = isInitialLoad
    
    if (isInitialFetchRequest) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      const response = await authFetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      setIsInitialLoad(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching data:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [url, options?.enabled, isInitialLoad])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, isRefreshing, isInitialLoad, error, refetch: fetchData }
}

// Hook for account data
export function useAccount(accountId: string | null) {
  return useFetch<{ account: any }>(
    accountId ? `/api/account/me?accountId=${accountId}` : null,
    { enabled: !!accountId }
  )
}

// Hook for clients
export function useClients(accountId: string | null) {
  const { data, isLoading, error, refetch } = useFetch<{ clients: any[] }>(
    accountId ? `/api/clients?accountId=${accountId}` : null,
    { enabled: !!accountId }
  )

  const createClient = async (clientData: any) => {
    if (!accountId) return null
    
    const response = await authFetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, ...clientData })
    })
    
    if (!response.ok) throw new Error('Failed to create client')
    
    await refetch()
    return response.json()
  }

  const updateClient = async (id: string, clientData: any) => {
    const response = await authFetch('/api/clients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...clientData })
    })
    
    if (!response.ok) throw new Error('Failed to update client')
    
    await refetch()
    return response.json()
  }

  const deleteClient = async (id: string) => {
    const response = await authFetch(`/api/clients?id=${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) throw new Error('Failed to delete client')
    
    await refetch()
  }

  return {
    clients: data?.clients || [],
    isLoading,
    error,
    refetch,
    createClient,
    updateClient,
    deleteClient
  }
}

// Hook for services
export function useServices(accountId: string | null) {
  const { data, isLoading, error, refetch } = useFetch<{ services: any[] }>(
    accountId ? `/api/services?accountId=${accountId}` : null,
    { enabled: !!accountId }
  )

  const createService = async (serviceData: any) => {
    if (!accountId) return null
    
    const response = await authFetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, ...serviceData })
    })
    
    if (!response.ok) throw new Error('Failed to create service')
    
    await refetch()
    return response.json()
  }

  const updateService = async (id: string, serviceData: any) => {
    const response = await authFetch('/api/services', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...serviceData })
    })
    
    if (!response.ok) throw new Error('Failed to update service')
    
    await refetch()
    return response.json()
  }

  const deleteService = async (id: string) => {
    const response = await authFetch(`/api/services?id=${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) throw new Error('Failed to delete service')
    
    await refetch()
  }

  return {
    services: data?.services || [],
    isLoading,
    error,
    refetch,
    createService,
    updateService,
    deleteService
  }
}

// Hook for professionals
export function useProfessionals(accountId: string | null) {
  const { data, isLoading, error, refetch } = useFetch<{ professionals: any[] }>(
    accountId ? `/api/professionals?accountId=${accountId}` : null,
    { enabled: !!accountId }
  )

  const createProfessional = async (professionalData: any) => {
    if (!accountId) return null
    
    const response = await authFetch('/api/professionals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, ...professionalData })
    })
    
    if (!response.ok) throw new Error('Failed to create professional')
    
    await refetch()
    return response.json()
  }

  const updateProfessional = async (id: string, professionalData: any) => {
    const response = await authFetch('/api/professionals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...professionalData })
    })
    
    if (!response.ok) throw new Error('Failed to update professional')
    
    await refetch()
    return response.json()
  }

  const deleteProfessional = async (id: string) => {
    const response = await authFetch(`/api/professionals?id=${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) throw new Error('Failed to delete professional')
    
    await refetch()
  }

  return {
    professionals: data?.professionals || [],
    isLoading,
    error,
    refetch,
    createProfessional,
    updateProfessional,
    deleteProfessional
  }
}

// Hook for appointments
export function useAppointments(accountId: string | null, date?: string) {
  const url = accountId 
    ? `/api/appointments?accountId=${accountId}${date ? `&date=${date}` : ''}`
    : null

  const { data, isLoading, error, refetch } = useFetch<{ appointments: any[] }>(
    url,
    { enabled: !!accountId }
  )

  const createAppointment = async (appointmentData: any) => {
    if (!accountId) return null
    
    const response = await authFetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, ...appointmentData })
    })
    
    if (!response.ok) throw new Error('Failed to create appointment')
    
    await refetch()
    return response.json()
  }

  const updateAppointment = async (id: string, appointmentData: any) => {
    const response = await authFetch('/api/appointments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...appointmentData })
    })
    
    if (!response.ok) throw new Error('Failed to update appointment')
    
    await refetch()
    return response.json()
  }

  const deleteAppointment = async (id: string) => {
    const response = await authFetch(`/api/appointments?id=${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) throw new Error('Failed to delete appointment')
    
    await refetch()
  }

  return {
    appointments: data?.appointments || [],
    isLoading,
    error,
    refetch,
    createAppointment,
    updateAppointment,
    deleteAppointment
  }
}

// Hook for holidays
export function useHolidays(accountId: string | null) {
  const { data, isLoading, error, refetch } = useFetch<{ holidays: any[] }>(
    accountId ? `/api/holidays?accountId=${accountId}` : null,
    { enabled: !!accountId }
  )

  const createHoliday = async (holidayData: any) => {
    if (!accountId) return null
    
    const response = await authFetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, ...holidayData })
    })
    
    if (!response.ok) throw new Error('Failed to create holiday')
    
    await refetch()
    return response.json()
  }

  const deleteHoliday = async (id: string) => {
    const response = await authFetch(`/api/holidays?id=${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) throw new Error('Failed to delete holiday')
    
    await refetch()
  }

  return {
    holidays: data?.holidays || [],
    isLoading,
    error,
    refetch,
    createHoliday,
    deleteHoliday
  }
}

// Hook for no-show fees
export function useNoShowFees(accountId: string | null) {
  const { data, isLoading, error, refetch } = useFetch<{ fees: any[] }>(
    accountId ? `/api/noshow-fees?accountId=${accountId}` : null,
    { enabled: !!accountId }
  )

  return {
    fees: data?.fees || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for WhatsApp messages
export function useWhatsappMessages(accountId: string | null) {
  const { data, isLoading, error, refetch } = useFetch<{ messages: any[] }>(
    accountId ? `/api/whatsapp/messages?accountId=${accountId}` : null,
    { enabled: !!accountId }
  )

  return {
    messages: data?.messages || [],
    isLoading,
    error,
    refetch
  }
}

// Helper to get accountId from localStorage (for client-side usage)
export function getStoredAccountId(): string | null {
  if (typeof window === 'undefined') return null
  
  // Try the correct key first
  const accountId = localStorage.getItem('agendazap-account-id')
  if (accountId) return accountId
  
  // Fallback: try to get from Zustand persisted state
  const storageStr = localStorage.getItem('agendazap-storage')
  if (storageStr) {
    try {
      const storage = JSON.parse(storageStr)
      return storage?.state?.account?.id || null
    } catch {
      // Ignore parse errors
    }
  }
  
  // Legacy fallback
  return localStorage.getItem('accountId')
}

// Helper to set accountId in localStorage
export function setStoredAccountId(accountId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('agendazap-account-id', accountId)
}

// Helper to clear accountId from localStorage
export function clearStoredAccountId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('agendazap-account-id')
  localStorage.removeItem('accountId') // Also clear legacy key
}
