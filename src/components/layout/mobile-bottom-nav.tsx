'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  Settings
} from 'lucide-react'
import { motion } from 'framer-motion'

const mobileMenuItems = [
  { icon: LayoutDashboard, label: 'Home', tab: 'dashboard' },
  { icon: Calendar, label: 'Agenda', tab: 'appointments' },
  { icon: Users, label: 'Clientes', tab: 'clients' },
  { icon: MessageSquare, label: 'WhatsApp', tab: 'whatsapp' },
  { icon: Settings, label: 'Mais', tab: 'settings' },
]

export function MobileBottomNav() {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'dashboard'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileMenuItems.map((item) => {
          const isActive = item.tab === currentTab
          const href = item.tab === 'dashboard' ? '/' : `/?tab=${item.tab}`
          
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all min-w-[60px]',
                isActive 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute -top-0.5 w-12 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                initial={false}
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isActive && 'bg-green-100 dark:bg-green-900/30'
                )}
              >
                <item.icon className="w-5 h-5" />
              </motion.div>
              <span className="text-[10px] font-medium">{item.label}</span>
              
              {/* WhatsApp notification badge */}
              {item.tab === 'whatsapp' && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </Link>
          )
        })}
      </div>
      
      {/* Safe area padding for iOS devices */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  )
}
