import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  avatar?: string
  role: string
}

interface Account {
  id: string
  businessName: string
  businessType: string
  whatsappNumber: string
  whatsappConnected: boolean
  plan: string
  noShowFeeEnabled: boolean
  noShowFeeAmount: number
}

interface AppState {
  user: User | null
  account: Account | null
  isAuthenticated: boolean
  isLoading: boolean
  sidebarOpen: boolean
  addCallback: (() => void) | null
  
  // Actions
  setUser: (user: User | null) => void
  setAccount: (account: Account | null) => void
  setAuthenticated: (value: boolean) => void
  setLoading: (value: boolean) => void
  toggleSidebar: () => void
  setAddCallback: (callback: (() => void) | null) => void
  triggerAdd: () => void
  logout: () => Promise<void>
  _resetAll: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      account: null,
      isAuthenticated: false,
      isLoading: true,
      sidebarOpen: true,
      addCallback: null,
      
      setUser: (user) => set({ user }),
      setAccount: (account) => set({ account }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setLoading: (isLoading) => set({ isLoading }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setAddCallback: (callback) => set({ addCallback: callback }),
      triggerAdd: () => {
        const { addCallback } = get()
        if (addCallback) addCallback()
      },
      
      // Reset all state to initial values
      _resetAll: () => set({
        user: null,
        account: null,
        isAuthenticated: false,
        isLoading: false,
        sidebarOpen: true,
        addCallback: null,
      }),
      
      // Logout function that clears everything
      logout: async () => {
        // First reset state
        set({
          user: null,
          account: null,
          isAuthenticated: false,
          isLoading: false,
          addCallback: null,
        })
        
        // Clear localStorage completely
        if (typeof window !== 'undefined') {
          // Call logout API to clear server-side session
          try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
          } catch (e) {
            console.error('Logout API error:', e)
          }
          
          // Clear all agendazap-related storage
          localStorage.removeItem('agendazap-storage')
          localStorage.removeItem('agendazap-user')
          localStorage.removeItem('agendazap-account-id')
          
          // Clear session storage as well
          sessionStorage.clear()
          
          // Redirect to root which will show login page
          // Use replace to avoid back button issues
          window.location.replace('/')
        }
      },
    }),
    {
      name: 'agendazap-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        account: state.account, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)
