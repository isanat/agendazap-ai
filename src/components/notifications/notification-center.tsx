'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, X, Calendar, AlertTriangle, DollarSign, MessageSquare, Clock, CheckCheck, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getStoredAccountId } from '@/hooks/use-data'

interface Notification {
  id: string
  type: 'appointment' | 'noshow' | 'payment' | 'message' | 'reminder' | 'system'
  title: string
  description: string
  timestamp: Date
  read: boolean
}

const notificationIcons: Record<string, typeof Bell> = {
  appointment: Calendar,
  noshow: AlertTriangle,
  payment: DollarSign,
  message: MessageSquare,
  reminder: Clock,
  system: Check,
}

const notificationColors: Record<string, string> = {
  appointment: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  noshow: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  payment: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  message: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  reminder: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  system: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = getStoredAccountId()
    setAccountId(id)
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!accountId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      // Fetch appointments and generate notifications from them
      const [appointmentsRes, noshowFeesRes] = await Promise.all([
        fetch(`/api/appointments?accountId=${accountId}`),
        fetch(`/api/noshow-fees?accountId=${accountId}`)
      ])

      const generatedNotifications: Notification[] = []

      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json()
        const now = new Date()
        
        // Generate notifications from recent appointments
        ;(data.appointments || [])
          .filter((apt: any) => {
            const aptDate = new Date(apt.datetime)
            // Only show notifications for recent and upcoming appointments
            return aptDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
          })
          .slice(0, 10)
          .forEach((apt: any) => {
            const isUpcoming = new Date(apt.datetime) >= now
            
            generatedNotifications.push({
              id: `apt-${apt.id}`,
              type: 'appointment',
              title: isUpcoming ? 'Próximo Agendamento' : 'Agendamento Realizado',
              description: `${apt.client?.name || 'Cliente'} - ${apt.service?.name || 'Serviço'}${isUpcoming ? ` às ${new Date(apt.datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}`,
              timestamp: new Date(apt.createdAt || apt.datetime),
              read: apt.status === 'confirmed' || apt.status === 'completed'
            })

            if (apt.status === 'no_show') {
              generatedNotifications.push({
                id: `noshow-${apt.id}`,
                type: 'noshow',
                title: 'No-Show Detectado',
                description: `${apt.client?.name || 'Cliente'} não compareceu ao agendamento`,
                timestamp: new Date(apt.datetime),
                read: false
              })
            }
          })
      }

      if (noshowFeesRes.ok) {
        const data = await noshowFeesRes.json()
        ;(data.fees || [])
          .filter((fee: any) => fee.status === 'paid')
          .slice(0, 5)
          .forEach((fee: any) => {
            generatedNotifications.push({
              id: `payment-${fee.id}`,
              type: 'payment',
              title: 'Pagamento Recebido',
              description: `Taxa de no-show de R$ ${fee.amount.toFixed(2)} paga por ${fee.clientName}`,
              timestamp: new Date(fee.paidAt || fee.createdAt),
              read: true
            })
          })
      }

      // Sort by timestamp
      generatedNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      setNotifications(generatedNotifications.slice(0, 20))
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])
  
  const unreadCount = notifications.filter(n => !n.read).length
  
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
  }
  
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }
  
  const removeNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id))
  }
  
  const clearAll = () => setNotifications([])

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                >
                  {unreadCount}
                </motion.span>
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{unreadCount > 0 ? `${unreadCount} notificações não lidas` : 'Nenhuma notificação'}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={markAllAsRead}>
              <CheckCheck className="w-3 h-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="py-8 px-4">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type]
              return (
                <div
                  key={notification.id}
                  className={cn(
                    'px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group relative',
                    !notification.read && 'bg-muted/30'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className={cn('p-2 rounded-lg', notificationColors[notification.type])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-medium', !notification.read && 'text-foreground')}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); removeNotification(notification.id) }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500" />
                  )}
                </div>
              )
            })}
          </ScrollArea>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={clearAll}>
                <Trash2 className="w-3 h-3 mr-1" />
                Limpar todas
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
