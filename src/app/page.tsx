'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SuperAdminSidebar } from '@/components/layout/superadmin-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { StatsCards, TodaySchedule, QuickStats } from '@/components/dashboard/stats-cards'
import { NoShowAlerts, RecentNoShows } from '@/components/dashboard/no-show-alerts'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { PersonalizedWelcome, DashboardQuickInfo } from '@/components/dashboard/personalized-welcome'
import { PerformanceWidget } from '@/components/dashboard/performance-widget'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { TipOfTheDay } from '@/components/dashboard/tip-of-the-day'
import { BusinessAnalyticsWidget } from '@/components/dashboard/business-analytics-widget'
import { QuickStatsWidget } from '@/components/dashboard/quick-stats-widget'
import { AnnouncementBanner } from '@/components/dashboard/announcement-banner'
import { WhatsAppStatusWidget } from '@/components/dashboard/whatsapp-status-widget'
import { UiKitPage } from '@/components/dashboard/ui-kit-page'
import { PWAInstallPrompt, OfflineIndicator, UpdatePrompt, NotificationPermissionPrompt } from '@/components/pwa/pwa-components'
import { KeyboardShortcutsHelp, useKeyboardShortcuts } from '@/components/keyboard-shortcuts-help'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { ServicesPage } from '@/components/services/services-page'
import { ProfessionalsPage } from '@/components/professionals/professionals-page'
import { ClientsPage } from '@/components/clients/clients-page'
import { AppointmentsPage } from '@/components/appointments/appointments-page'
import { WhatsappPage } from '@/components/whatsapp/whatsapp-page'
import { ReportsPage } from '@/components/reports/reports-page'
import { NoshowPage } from '@/components/noshow/noshow-page'
import { SettingsPage } from '@/components/settings/settings-page'
import { PackagesPage } from '@/components/packages/packages-page'
import { LoyaltyPage } from '@/components/loyalty/loyalty-page'
import { AuthPage } from '@/components/auth/auth-page'
import { OnboardingTutorial } from '@/components/onboarding/onboarding-tutorial'
import { AdminSettingsPage } from '@/components/admin/admin-settings-page'
import { SuperAdminDashboard } from '@/components/superadmin/superadmin-dashboard'
import { AccountsManager } from '@/components/superadmin/accounts-manager'
import { AuditLogs } from '@/components/superadmin/audit-logs'
import { SystemNotifications } from '@/components/superadmin/system-notifications'
import { UsersManager } from '@/components/superadmin/users-manager'
import { SubscriptionsManager } from '@/components/superadmin/subscriptions-manager'
import { ClientPortal } from '@/components/client/client-portal'
import { MetricsPage } from '@/components/superadmin/metrics-page'
import { AIProvidersManager } from '@/components/superadmin/ai-providers-manager'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast, Toaster } from 'sonner'

function DashboardContent({ accountId }: { accountId?: string | null }) {
  const router = useRouter()
  const [period, setPeriod] = useState('week')
  
  const handleNavigate = useCallback((page: string) => {
    router.push(`/?tab=${page}`)
  }, [router])
  
  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Welcome & Quick Info */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <PersonalizedWelcome accountId={accountId} />
          <DashboardQuickInfo />
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <StatsCards accountId={accountId} onNavigate={handleNavigate} />
      </motion.div>

      {/* Tip of the Day */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <TipOfTheDay />
      </motion.div>

      {/* Announcement Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
      >
        <AnnouncementBanner />
      </motion.div>

      {/* Main Content Grid */}
      <motion.div 
        className="grid gap-6 lg:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <TodaySchedule accountId={accountId} />
        </div>
        
        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          <QuickStatsWidget accountId={accountId} />
          <QuickActions />
          <QuickStats accountId={accountId} />
        </div>
      </motion.div>

      {/* Charts Row - REAL DATA */}
      <motion.div
        className="grid gap-6 lg:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <RevenueChart accountId={accountId} />
        <RecentNoShows accountId={accountId} />
        <RecentActivity accountId={accountId} />
      </motion.div>

      {/* Performance & Alerts Row - REAL DATA */}
      <motion.div
        className="grid gap-6 lg:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <PerformanceWidget />
        <NoShowAlerts accountId={accountId} />
      </motion.div>

      {/* Business Analytics Row - REAL DATA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <BusinessAnalyticsWidget accountId={accountId} />
      </motion.div>

      {/* WhatsApp Status - REAL DATA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <WhatsAppStatusWidget accountId={accountId} />
      </motion.div>
    </motion.div>
  )
}

function MainPageContent() {
  const searchParams = useSearchParams()
  const { sidebarOpen, setAuthenticated, setUser, setAccount, user, account } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const { showHelp, setShowHelp } = useKeyboardShortcuts()
  
  const tab = searchParams.get('tab') || 'dashboard'
  
  // Get accountId from store or localStorage
  const accountId = account?.id || (typeof window !== 'undefined' ? localStorage.getItem('agendazap-account-id') : null)

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if already logged in from Zustand persisted state
        const { isAuthenticated, user } = useAppStore.getState()
        if (isAuthenticated && user) {
          setIsLoading(false)
          return
        }
        
        // Check if we have auth data in localStorage (header-based fallback)
        const savedUser = localStorage.getItem('agendazap-user')
        const savedAccountId = localStorage.getItem('agendazap-account-id')
        
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser)
            
            // Verify session with server using headers
            const response = await fetch('/api/auth/login', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'x-user-id': userData.id,
                'x-user-email': userData.email,
                'x-user-role': userData.role || 'owner',
                'x-account-id': savedAccountId || '',
              },
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.user) {
                // Restore user state
                setUser({
                  id: data.user.id,
                  email: data.user.email,
                  name: data.user.name,
                  role: data.user.role,
                })
                
                // Skip account data fetch for superadmin - they don't have an accountId
                const isSuperAdmin = data.user.role === 'superadmin'
                
                let accountData = {
                  id: data.user.accountId || savedAccountId || '1',
                  businessName: isSuperAdmin ? 'AgendaZap Admin' : 'Salão Beleza Total',
                  businessType: 'salon',
                  whatsappNumber: '(11) 99999-0000',
                  whatsappConnected: false,
                  plan: 'pro',
                  noShowFeeEnabled: true,
                  noShowFeeAmount: 50,
                }
                
                // Only fetch account data for non-superadmin users with an accountId
                if (!isSuperAdmin && (data.user.accountId || savedAccountId)) {
                  const accountResponse = await fetch(`/api/account/me?accountId=${data.user.accountId || savedAccountId}`, {
                    credentials: 'include',
                    headers: {
                      'x-user-id': userData.id,
                      'x-user-email': userData.email,
                      'x-user-role': userData.role || 'owner',
                      'x-account-id': savedAccountId || '',
                    },
                  })
                  
                  if (accountResponse.ok) {
                    const accData = await accountResponse.json()
                    if (accData.account) {
                      accountData = {
                        id: accData.account.id,
                        businessName: accData.account.businessName || accountData.businessName,
                        businessType: accData.account.businessType || 'salon',
                        whatsappNumber: accData.account.whatsappNumber || accountData.whatsappNumber,
                        whatsappConnected: accData.account.whatsappConnected || false,
                        plan: accData.account.plan || 'pro',
                        noShowFeeEnabled: accData.account.noShowFeeEnabled ?? true,
                        noShowFeeAmount: accData.account.noShowFeeAmount || 50,
                      }
                    }
                  }
                }
                
                setAccount(accountData)
                setAuthenticated(true)
                setIsLoading(false)
                return
              }
            }
          } catch (e) {
            console.error('Failed to verify session:', e)
          }
        }
        
        // Try cookie-based session verification
        const sessionResponse = await fetch('/api/auth/login', {
          method: 'GET',
          credentials: 'include',
        })
        
        if (sessionResponse.ok) {
          const data = await sessionResponse.json()
          if (data.user) {
            setUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
            })
            
            // Skip account data fetch for superadmin - they don't have an accountId
            const isSuperAdmin = data.user.role === 'superadmin'
            
            let accountData = {
              id: data.user.accountId || '1',
              businessName: isSuperAdmin ? 'AgendaZap Admin' : 'Salão Beleza Total',
              businessType: 'salon',
              whatsappNumber: '(11) 99999-0000',
              whatsappConnected: false,
              plan: 'pro',
              noShowFeeEnabled: true,
              noShowFeeAmount: 50,
            }
            
            // Only fetch account data for non-superadmin users with an accountId
            if (!isSuperAdmin && data.user.accountId) {
              const accountResponse = await fetch(`/api/account/me?accountId=${data.user.accountId}`, {
                credentials: 'include',
              })
              
              if (accountResponse.ok) {
                const accData = await accountResponse.json()
                if (accData.account) {
                  accountData = {
                    id: accData.account.id,
                    businessName: accData.account.businessName || accountData.businessName,
                    businessType: accData.account.businessType || 'salon',
                    whatsappNumber: accData.account.whatsappNumber || accountData.whatsappNumber,
                    whatsappConnected: accData.account.whatsappConnected || false,
                    plan: accData.account.plan || 'pro',
                    noShowFeeEnabled: accData.account.noShowFeeEnabled ?? true,
                    noShowFeeAmount: accData.account.noShowFeeAmount || 50,
                  }
                }
              }
            }
            
            setAccount(accountData)
            setAuthenticated(true)
            
            // Also save to localStorage for header-based fallback
            localStorage.setItem('agendazap-user', JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
            }))
            if (data.user.accountId) {
              localStorage.setItem('agendazap-account-id', data.user.accountId)
            }
            
            setIsLoading(false)
            return
          }
        }
        
        // No valid session found, show auth page
        setIsLoading(false)
      } catch (error) {
        console.error('Auth error:', error)
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [setAuthenticated, setUser, setAccount])

  const handleLogin = async (user: { id?: string; name: string; email: string; role?: string; accountId?: string | null }) => {
    // Use the role from the database, not hardcoded email check
    const userRole = user.role || 'owner'
    const isSuperAdmin = userRole === 'superadmin'
    
    // Use actual user ID from login response, or generate a fallback
    const userId = user.id || `user-${Date.now()}`
    const userAccountId = user.accountId || null
    
    const userData = {
      id: userId,
      email: user.email,
      name: user.name,
      role: userRole,
      accountId: userAccountId
    }
    
    console.log('[handleLogin] Saving user data:', userData)
    
    setUser(userData)
    
    // Also save to localStorage for API authentication fallback
    // This is CRITICAL for authFetch to work
    if (typeof window !== 'undefined') {
      localStorage.setItem('agendazap-user', JSON.stringify(userData))
      if (userAccountId) {
        localStorage.setItem('agendazap-account-id', userAccountId)
      }
      console.log('[handleLogin] Saved to localStorage:', {
        user: localStorage.getItem('agendazap-user'),
        accountId: localStorage.getItem('agendazap-account-id')
      })
    }
    
    // Fetch real account data including whatsappConnected
    let accountData = {
      id: userAccountId || '1',
      businessName: isSuperAdmin ? 'AgendaZap Admin' : 'Salão Beleza Total',
      businessType: 'salon',
      whatsappNumber: '(11) 99999-0000',
      whatsappConnected: false,
      plan: 'pro',
      noShowFeeEnabled: true,
      noShowFeeAmount: 50
    }
    
    // Try to fetch real account data
    if (userAccountId && !isSuperAdmin) {
      try {
        const response = await fetch(`/api/account/me?accountId=${userAccountId}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.account) {
            accountData = {
              id: data.account.id,
              businessName: data.account.businessName || accountData.businessName,
              businessType: data.account.businessType || 'salon',
              whatsappNumber: data.account.whatsappNumber || accountData.whatsappNumber,
              whatsappConnected: data.account.whatsappConnected || false,
              plan: data.account.plan || 'pro',
              noShowFeeEnabled: data.account.noShowFeeEnabled ?? true,
              noShowFeeAmount: data.account.noShowFeeAmount || 50,
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch account data:', e)
      }
    }
    
    setAccount(accountData)
    setAuthenticated(true)
    toast.success(isSuperAdmin ? 'Bem-vindo, SuperAdmin! 🛡️' : 'Bem-vindo ao AgendaZap! 🎉')
  }

  // Check if user is SuperAdmin
  const isSuperAdmin = useAppStore((state) => state.user?.role === 'superadmin')
  
  // Check if user is a Client
  const isClient = useAppStore((state) => state.user?.role === 'client')

  const renderContent = () => {
    // Client Portal
    if (isClient) {
      return <ClientPortal />
    }
    
    // SuperAdmin content
    if (isSuperAdmin) {
      switch (tab) {
        case 'accounts':
          return <AccountsManager />
        case 'users':
          return <UsersManager />
        case 'plans':
          return <AdminSettingsPage />
        case 'subscriptions':
          return <SubscriptionsManager />
        case 'metrics':
          return <MetricsPage />
        case 'evolution':
          return <AdminSettingsPage />
        case 'audit-logs':
          return <AuditLogs />
        case 'notifications':
          return <SystemNotifications />
        case 'ai-providers':
          return <AIProvidersManager />
        case 'admin':
          return <AdminSettingsPage />
        case 'dashboard':
        default:
          return <SuperAdminDashboard />
      }
    }

    // Regular user content
    switch (tab) {
      case 'appointments':
        return <AppointmentsPage />
      case 'clients':
        return <ClientsPage />
      case 'services':
        return <ServicesPage />
      case 'packages':
        return <PackagesPage />
      case 'professionals':
        return <ProfessionalsPage />
      case 'loyalty':
        return <LoyaltyPage />
      case 'whatsapp':
        return <WhatsappPage />
      case 'reports':
        return <ReportsPage />
      case 'noshow':
        return <NoshowPage />
      case 'settings':
        return <SettingsPage />
      case 'admin':
        return <AdminSettingsPage />
      case 'ui-kit':
        return <UiKitPage />
      default:
        return <DashboardContent accountId={accountId} />
    }
  }

  const { isAuthenticated } = useAppStore()

  // Show auth page if not logged in
  if (!isLoading && !isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Client Portal - Full screen without sidebar */}
      {isClient ? (
        renderContent()
      ) : (
        <>
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden md:block">
            {isSuperAdmin ? <SuperAdminSidebar /> : <AppSidebar />}
          </div>
          
          <div className={cn(
            'transition-all duration-300',
            'md:ml-64', // Always show sidebar margin on desktop
            sidebarOpen ? 'md:ml-64' : 'md:ml-16',
            'ml-0' // No margin on mobile
          )}>
            <AppHeader 
              title={tab === 'dashboard' ? 'Dashboard' : undefined}
              showAddButton={tab === 'appointments' || tab === 'services' || tab === 'clients' || tab === 'professionals'}
              addButtonText={
                tab === 'appointments' ? 'Novo Agendamento' :
                tab === 'services' ? 'Novo Serviço' :
                tab === 'clients' ? 'Novo Cliente' :
                tab === 'professionals' ? 'Novo Profissional' : 'Novo'
              }
            />
            
            <main className="p-4 lg:p-6 pb-24 md:pb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
          
          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />
          
          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />
          
          {/* Onboarding Tutorial */}
          <OnboardingTutorial />
          
          {/* PWA Components */}
          <PWAInstallPrompt />
          <OfflineIndicator />
          <UpdatePrompt />
          <NotificationPermissionPrompt />
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    }>
      <MainPageContent />
    </Suspense>
  )
}
