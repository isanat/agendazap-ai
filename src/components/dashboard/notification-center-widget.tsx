'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  CheckCheck, 
  ChevronRight,
  Clock,
  RefreshCw,
  MoreVertical,
  Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { authGet, authPost, authPut } from '@/lib/auth-fetch'

export type NotificationType = 'info' | 'warning' | 'error' | 'success'

export interface SystemNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

interface NotificationCenterWidgetProps {
  accountId?: string | null
  variant?: 'default' | 'mini'
  maxItems?: number
}

const notificationConfig: Record<NotificationType, {
  icon: typeof Bell
  color: string
  bgColor: string
  borderColor: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
}> = {
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-l-blue-500',
    badgeVariant: 'default'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-l-amber-500',
    badgeVariant: 'secondary'
  },
  error: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-l-red-500',
    badgeVariant: 'destructive'
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-l-green-500',
    badgeVariant: 'outline'
  }
}

// Generate mock notifications for demo
function generateMockNotifications(): SystemNotification[] {
  const now = new Date()
  return [
    {
      id: '1',
      type: 'success',
      title: 'Agendamento Confirmado',
      message: 'Maria Silva confirmou seu agendamento para Corte Feminino às 14:00',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000),
      read: false,
      actionUrl: '/appointments',
      actionLabel: 'Ver agendamento'
    },
    {
      id: '2',
      type: 'warning',
      title: 'Pagamento Pendente',
      message: 'A assinatura do plano Premium vence em 3 dias',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000),
      read: false,
      actionUrl: '/settings',
      actionLabel: 'Renovar agora'
    },
    {
      id: '3',
      type: 'info',
      title: 'Novo Cliente',
      message: 'João Santos se cadastrou através do link de indicação',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '4',
      type: 'error',
      title: 'Falha na Integração',
      message: 'Não foi possível sincronizar seus agendamentos. Verifique as configurações.',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      read: false,
      actionUrl: '/settings/integrations',
      actionLabel: 'Corrigir'
    },
    {
      id: '5',
      type: 'success',
      title: 'Meta Atingida',
      message: 'Parabéns! Você atingiu a meta de 50 agendamentos este mês!',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      read: true
    }
  ]
}

function NotificationItem({ 
  notification, 
  onMarkAsRead,
  onDelete,
  variant = 'default'
}: { 
  notification: SystemNotification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  variant?: 'default' | 'mini'
}) {
  const config = notificationConfig[notification.type]
  const Icon = config.icon

  if (variant === 'mini') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group',
          !notification.read && 'bg-muted/30'
        )}
        onClick={() => !notification.read && onMarkAsRead(notification.id)}
      >
        <div className={cn('p-1.5 rounded-md', config.bgColor)}>
          <Icon className={cn('w-3.5 h-3.5', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs font-medium truncate',
            !notification.read && 'text-foreground'
          )}>
            {notification.title}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-green-500" />
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'relative p-4 rounded-lg border-l-4 transition-all hover:shadow-md',
        config.bgColor,
        config.borderColor,
        !notification.read && 'ring-1 ring-primary/10'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg bg-background/50', config.color)}>
          <Icon className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className={cn(
                'font-medium text-sm',
                !notification.read && 'text-foreground font-semibold'
              )}>
                {notification.title}
              </h4>
              <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
                {notification.type}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!notification.read && (
                  <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Marcar como lida
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => onDelete(notification.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
            </div>
            
            {notification.actionUrl && notification.actionLabel && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs gap-1"
                asChild
              >
                <a href={notification.actionUrl}>
                  {notification.actionLabel}
                  <ChevronRight className="w-3 h-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {!notification.read && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500"
        />
      )}
    </motion.div>
  )
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3 p-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationCenterWidget({ 
  accountId, 
  variant = 'default',
  maxItems = 5
}: NotificationCenterWidgetProps) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Try to fetch from API first
      const response = await authGet('/api/notifications')
      
      if (response.ok) {
        const data = await response.json()
        if (data.notifications && data.notifications.length > 0) {
          setNotifications(data.notifications.slice(0, maxItems))
        } else {
          // Use mock data if no real notifications
          setNotifications(generateMockNotifications().slice(0, maxItems))
        }
      } else {
        // Fallback to mock data
        setNotifications(generateMockNotifications().slice(0, maxItems))
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      // Fallback to mock data on error
      setNotifications(generateMockNotifications().slice(0, maxItems))
    } finally {
      setIsLoading(false)
    }
  }, [maxItems])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (id: string) => {
    try {
      await authPut('/api/notifications', { id, read: true })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = async () => {
    try {
      await authPut('/api/notifications', { markAll: true })
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
    
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const deleteNotification = async (id: string) => {
    try {
      await authPost('/api/notifications', { action: 'delete', id })
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
    
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Mini variant for sidebar
  if (variant === 'mini') {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              Notificações
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-2 p-2">
                  <Skeleton className="w-6 h-6 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Bell className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Sem notificações</p>
            </div>
          ) : (
            <ScrollArea className="h-48">
              <AnimatePresence mode="popLayout">
                {notifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                    variant="mini"
                  />
                ))}
              </AnimatePresence>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-500/5 to-gray-500/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600">
              <Bell className="w-4 h-4 text-white" />
            </div>
            Central de Notificações
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="default" className="gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {unreadCount} não lidas
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchNotifications}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {isLoading ? (
          <NotificationSkeleton />
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="p-4 rounded-full bg-muted/50 mb-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-medium">Você está em dia!</p>
              <p className="text-sm">Não há notificações pendentes</p>
            </motion.div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Últimas atualizações do sistema
              </p>
              
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Export mini variant as separate component for convenience
export function NotificationCenterMini({ accountId }: { accountId?: string | null }) {
  return (
    <NotificationCenterWidget accountId={accountId} variant="mini" />
  )
}
