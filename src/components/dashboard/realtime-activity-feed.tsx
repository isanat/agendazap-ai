'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Calendar,
  DollarSign,
  MessageSquare,
  Star,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Sparkles,
  Zap,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface ActivityEvent {
  id: string
  type: 'appointment' | 'payment' | 'message' | 'client' | 'noshow' | 'success' | 'warning' | 'info'
  title: string
  description: string
  timestamp: Date
  metadata?: Record<string, unknown>
  isNew?: boolean
}

interface RealtimeActivityFeedProps {
  accountId?: string | null
  maxItems?: number
}

const eventIcons = {
  appointment: Calendar,
  payment: DollarSign,
  message: MessageSquare,
  client: Users,
  noshow: AlertCircle,
  success: CheckCircle,
  warning: AlertCircle,
  info: Bell,
}

const eventColors = {
  appointment: 'text-blue-500 bg-blue-500/10',
  payment: 'text-green-500 bg-green-500/10',
  message: 'text-purple-500 bg-purple-500/10',
  client: 'text-cyan-500 bg-cyan-500/10',
  noshow: 'text-red-500 bg-red-500/10',
  success: 'text-green-500 bg-green-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  info: 'text-gray-500 bg-gray-500/10',
}

const eventBorderColors = {
  appointment: 'border-l-blue-500',
  payment: 'border-l-green-500',
  message: 'border-l-purple-500',
  client: 'border-l-cyan-500',
  noshow: 'border-l-red-500',
  success: 'border-l-green-500',
  warning: 'border-l-amber-500',
  info: 'border-l-gray-500',
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  return `${diffDays}d`
}

// Simulated events for demo
const simulatedEvents: ActivityEvent[] = [
  {
    id: '1',
    type: 'appointment',
    title: 'Novo Agendamento',
    description: 'Maria Silva agendou Corte + Hidratação',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    isNew: true
  },
  {
    id: '2',
    type: 'payment',
    title: 'Pagamento Recebido',
    description: 'Taxa de no-show cobrada: R$ 50,00',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    isNew: true
  },
  {
    id: '3',
    type: 'message',
    title: 'Mensagem do WhatsApp',
    description: 'João Pedro confirmou presença para amanhã',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '4',
    type: 'client',
    title: 'Novo Cliente',
    description: 'Ana Beatriz se cadastrou via WhatsApp',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: '5',
    type: 'noshow',
    title: 'No-Show Detectado',
    description: 'Carlos Eduardo não compareceu',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '6',
    type: 'success',
    title: 'Lembrete Enviado',
    description: '15 lembretes enviados com sucesso',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
]

/**
 * Check if the app is running in production/Vercel environment
 */
function isProductionEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  
  const hostname = window.location.hostname
  const isVercel = hostname.includes('vercel.app') || 
                   hostname.includes('.vercel.app') ||
                   hostname.endsWith('.vercel.app')
  
  const isProductionDomain = !hostname.includes('localhost') && 
                             !hostname.includes('127.0.0.1') &&
                             !hostname.includes('[::1]')
  
  return isVercel || isProductionDomain
}

export function RealtimeActivityFeed({ accountId, maxItems = 10 }: RealtimeActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>(simulatedEvents)
  const [isConnected, setIsConnected] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Check if running in production (Vercel) - WebSocket disabled
  const isProduction = isProductionEnvironment()

  // Simulate real-time events for demo (works in both production and development)
  useEffect(() => {
    if (!accountId) return

    // In production, skip WebSocket and use simulated events only
    if (isProduction) {
      console.log('WebSocket disabled in production environment - using simulated events')
      return
    }

    // Only connect to WebSocket in development
    const connectSocket = async () => {
      const { io } = await import('socket.io-client')
      
      const socketInstance = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socketInstance.on('connect', () => {
        console.log('Connected to realtime service')
        setIsConnected(true)
        socketInstance.emit('join-account', { accountId, userId: 'dashboard' })
      })

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from realtime service')
        setIsConnected(false)
      })

      socketInstance.on('realtime-event', (event: { type: string; data: Record<string, unknown>; timestamp: string }) => {
        if (isPaused) return

        const getEventTitle = (type: string): string => {
          switch (type) {
            case 'points_update': return 'Atualização de Pontos'
            case 'package_update': return 'Atualização de Pacote'
            case 'notification': return 'Notificação'
            case 'appointment_update': return 'Atualização de Agendamento'
            default: return 'Atividade'
          }
        }

        const getEventDescription = (type: string, data: Record<string, unknown>): string => {
          switch (type) {
            case 'points_update': return `${data.operation} ${data.points} pontos`
            case 'package_update': return `Pacote ${data.action}`
            case 'notification': return (data.message as string) || ''
            case 'appointment_update': return `Agendamento ${data.action}`
            default: return ''
          }
        }

        const newEvent: ActivityEvent = {
          id: Date.now().toString(),
          type: event.type as ActivityEvent['type'],
          title: getEventTitle(event.type),
          description: getEventDescription(event.type, event.data),
          timestamp: new Date(event.timestamp),
          isNew: true,
        }

        setEvents(prev => [newEvent, ...prev].slice(0, maxItems))
      })
    }

    connectSocket()
  }, [accountId, isPaused, maxItems, isProduction])

  // Simulate real-time events for demo
  useEffect(() => {
    if (!accountId || isPaused) return

    const interval = setInterval(() => {
      const randomEvents = [
        { type: 'appointment' as const, title: 'Novo Agendamento', desc: 'Cliente agendou via WhatsApp' },
        { type: 'message' as const, title: 'Nova Mensagem', desc: 'Resposta recebida do cliente' },
        { type: 'payment' as const, title: 'Pagamento', desc: 'PIX confirmado automaticamente' },
        { type: 'success' as const, title: 'Sucesso', desc: 'Lembrete entregue com sucesso' },
      ]

      const random = randomEvents[Math.floor(Math.random() * randomEvents.length)]
      const newEvent: ActivityEvent = {
        id: Date.now().toString(),
        type: random.type,
        title: random.title,
        description: random.desc,
        timestamp: new Date(),
        isNew: true,
      }

      setEvents(prev => [newEvent, ...prev].slice(0, maxItems))
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [accountId, isPaused, maxItems])

  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const clearAll = () => {
    setEvents([])
  }

  const newEventsCount = events.filter(e => e.isNew).length

  return (
    <Card className="border-0 shadow-md h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <Zap className="w-5 h-5 text-green-600" />
              {isConnected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            Atividade em Tempo Real
          </CardTitle>
          <div className="flex items-center gap-2">
            {newEventsCount > 0 && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200">
                {newEventsCount} novos
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8 w-8 p-0"
            >
              {isPaused ? <RefreshCw className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <AnimatePresence mode="popLayout">
            {events.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
              >
                <Bell className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm font-medium">Nenhuma atividade</p>
                <p className="text-xs">As atividades aparecerão aqui em tempo real</p>
              </motion.div>
            ) : (
              <div className="space-y-1 px-4 pb-4">
                {events.map((event, index) => {
                  const Icon = eventIcons[event.type]
                  const colorClass = eventColors[event.type]
                  const borderClass = eventBorderColors[event.type]

                  return (
                    <motion.div
                      key={event.id}
                      layout
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.95 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                      className={cn(
                        'group relative flex items-start gap-3 p-3 rounded-lg border-l-4 transition-all',
                        'hover:bg-muted/50 cursor-pointer',
                        borderClass,
                        event.isNew && 'bg-muted/30'
                      )}
                    >
                      <motion.div
                        className={cn('p-2 rounded-lg', colorClass)}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.02 + 0.1 }}
                      >
                        <Icon className="w-4 h-4" />
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          {event.isNew && (
                            <Sparkles className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {event.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeEvent(event.id)
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {events.length > 0 && (
          <div className="border-t px-4 py-2 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={clearAll}
            >
              Limpar todas as atividades
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MiniActivityFeed({ accountId }: { accountId?: string | null }) {
  const [events] = useState<ActivityEvent[]>(simulatedEvents.slice(0, 3))

  return (
    <div className="space-y-2">
      {events.map((event, index) => {
        const Icon = eventIcons[event.type]
        const colorClass = eventColors[event.type]

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
          >
            <div className={cn('p-1.5 rounded-md', colorClass)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{event.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{event.description}</p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        )
      })}
    </div>
  )
}
