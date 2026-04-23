'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  Zap,
  Shield,
  AlertCircle,
  Server,
  Package,
  BarChart3,
  Users,
  FileText,
  Bell,
  Cpu
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
import { Badge } from '@/components/ui/badge'

const superAdminMenuItems = [
  { 
    icon: LayoutDashboard, 
    label: 'Dashboard', 
    href: '/?tab=dashboard', 
    tab: 'dashboard',
    description: 'Visão geral do sistema'
  },
  { 
    icon: Building2, 
    label: 'Empresas', 
    href: '/?tab=accounts', 
    tab: 'accounts',
    description: 'Gerenciar contas'
  },
  { 
    icon: Users, 
    label: 'Usuários', 
    href: '/?tab=users', 
    tab: 'users',
    description: 'Todos os usuários'
  },
  { 
    icon: Package, 
    label: 'Planos', 
    href: '/?tab=plans', 
    tab: 'plans',
    description: 'Planos de assinatura'
  },
  { 
    icon: CreditCard, 
    label: 'Assinaturas', 
    href: '/?tab=subscriptions', 
    tab: 'subscriptions',
    description: 'Assinaturas ativas'
  },
  { 
    icon: BarChart3, 
    label: 'Métricas', 
    href: '/?tab=metrics', 
    tab: 'metrics',
    description: 'Estatísticas do sistema'
  },
  { 
    icon: Server, 
    label: 'Evolution API', 
    href: '/?tab=evolution', 
    tab: 'evolution',
    description: 'Configurar WhatsApp'
  },
  { 
    icon: Cpu, 
    label: 'AI Providers', 
    href: '/?tab=ai-providers', 
    tab: 'ai-providers',
    description: 'Gerenciar provedores de IA'
  },
  { 
    icon: FileText, 
    label: 'Logs', 
    href: '/?tab=audit-logs', 
    tab: 'audit-logs',
    description: 'Logs de auditoria'
  },
  { 
    icon: Bell, 
    label: 'Notificações', 
    href: '/?tab=notifications', 
    tab: 'notifications',
    description: 'Notificações do sistema'
  },
  { 
    icon: Settings, 
    label: 'Configurações', 
    href: '/?tab=admin', 
    tab: 'admin',
    description: 'Configurações globais'
  },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, user, logout } = useAppStore()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  
  // Get current tab from URL (reactive via useSearchParams)
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'dashboard'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
        {sidebarOpen && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white">AgendaZap</span>
              <span className="text-[10px] text-purple-300 -mt-1">SuperAdmin</span>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="ml-auto text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', !sidebarOpen && 'rotate-180')} />
        </Button>
      </div>

      {/* Admin Badge */}
      {sidebarOpen && (
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Modo Administrador</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {superAdminMenuItems.map((item) => {
            const isActive = item.tab === currentTab
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  scroll={false}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-slate-700/50',
                    isActive 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'text-slate-400 hover:text-white',
                    !sidebarOpen && 'justify-center'
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="superAdminActiveIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-violet-600 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn(
                    'w-5 h-5 flex-shrink-0 transition-transform',
                    isActive && 'scale-110'
                  )} />
                  {sidebarOpen && (
                    <span className="transition-all duration-200 text-sm">
                      {item.label}
                    </span>
                  )}
                  {isActive && sidebarOpen && (
                    <motion.div 
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400"
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
      <div className="border-t border-slate-700 p-4">
        {sidebarOpen ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-semibold ring-2 ring-purple-500/50">
                {user?.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'SuperAdmin'}</p>
                <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Administrador Global
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/50"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full text-red-400 hover:bg-red-950/30"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="w-5 h-5" />
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
              Tem certeza que deseja sair do painel de administrador? Você precisará fazer login novamente.
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
