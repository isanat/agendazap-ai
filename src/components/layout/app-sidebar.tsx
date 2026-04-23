'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  Settings,
  MessageSquare,
  BarChart3,
  CreditCard,
  LogOut,
  ChevronLeft,
  Zap,
  Shield,
  AlertCircle,
  Package,
  Star,
  Puzzle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useState } from 'react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', tab: 'dashboard' },
  { icon: Calendar, label: 'Agendamentos', href: '/?tab=appointments', tab: 'appointments' },
  { icon: Users, label: 'Clientes', href: '/?tab=clients', tab: 'clients' },
  { icon: Scissors, label: 'Serviços', href: '/?tab=services', tab: 'services' },
  { icon: Package, label: 'Pacotes', href: '/?tab=packages', tab: 'packages' },
  { icon: Users, label: 'Profissionais', href: '/?tab=professionals', tab: 'professionals' },
  { icon: Star, label: 'Fidelidade', href: '/?tab=loyalty', tab: 'loyalty' },
  { icon: MessageSquare, label: 'WhatsApp', href: '/?tab=whatsapp', tab: 'whatsapp' },
  { icon: BarChart3, label: 'Relatórios', href: '/?tab=reports', tab: 'reports' },
  { icon: CreditCard, label: 'No-Show', href: '/?tab=noshow', tab: 'noshow' },
  { icon: Settings, label: 'Configurações', href: '/?tab=settings', tab: 'settings' },
  { icon: Puzzle, label: 'UI Kit', href: '/?tab=ui-kit', tab: 'ui-kit' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, account, user, logout } = useAppStore()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  
  // Check if user is superadmin (can access system admin panel)
  const isSuperAdmin = user?.role === 'superadmin'
  
  // Get current tab from URL
  const currentTab = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('tab') || 'dashboard'
    : 'dashboard'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {sidebarOpen && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              AgendaZap
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="ml-auto"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', !sidebarOpen && 'rotate-180')} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item, index) => {
            const isActive = item.tab === currentTab
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium',
                    !sidebarOpen && 'justify-center'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn(
                    'w-5 h-5 flex-shrink-0 transition-transform',
                    isActive && 'scale-110'
                  )} />
                  {sidebarOpen && (
                    <span className="transition-all duration-200">
                      {item.label}
                    </span>
                  )}
                  {isActive && sidebarOpen && (
                    <motion.div 
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-border p-4">
        {sidebarOpen ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{account?.businessName || 'Minha Empresa'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {/* Admin Settings Link */}
              {isSuperAdmin && (
                <Link
                  href="/?tab=admin"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Admin do Sistema
                </Link>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => setShowLogoutDialog(true)}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {isSuperAdmin && (
              <Link
                href="/?tab=admin"
                className="flex items-center justify-center w-full p-2 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
              >
                <Shield className="w-5 h-5" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </Button>
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirmar Saída
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLogoutDialog(false)
                logout()
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
