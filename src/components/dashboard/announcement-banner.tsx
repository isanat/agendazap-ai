'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Gift,
  Sparkles,
  Bell,
  Zap,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Announcement {
  id: string
  type: 'promo' | 'update' | 'alert' | 'success'
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  dismissible?: boolean
  icon?: typeof Gift
}

interface AnnouncementBannerProps {
  announcements?: Announcement[]
  onDismiss?: (id: string) => void
}

const defaultAnnouncements: Announcement[] = [
  {
    id: '1',
    type: 'promo',
    title: '🎉 Experimente a IA Luna!',
    description: 'Nova funcionalidade: Assistente virtual inteligente para atendimento automático via WhatsApp.',
    action: { label: 'Conhecer', href: '/?tab=whatsapp' },
    dismissible: true,
  },
  {
    id: '2',
    type: 'update',
    title: 'Novo: Relatórios avançados',
    description: 'Agora você pode exportar relatórios detalhados em PDF e Excel.',
    action: { label: 'Ver relatórios', href: '/?tab=reports' },
    dismissible: true,
  },
]

const typeStyles = {
  promo: {
    bg: 'bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-700 dark:text-purple-300',
    icon: Sparkles,
    iconBg: 'bg-purple-500/20',
  },
  update: {
    bg: 'bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-700 dark:text-blue-300',
    icon: Bell,
    iconBg: 'bg-blue-500/20',
  },
  alert: {
    bg: 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-300',
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/20',
  },
  success: {
    bg: 'bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-700 dark:text-green-300',
    icon: CheckCircle,
    iconBg: 'bg-green-500/20',
  },
}

export function AnnouncementBanner({ 
  announcements = defaultAnnouncements, 
  onDismiss 
}: AnnouncementBannerProps) {
  const [visibleAnnouncements, setVisibleAnnouncements] = useState(announcements)
  const router = useRouter()

  const handleDismiss = (id: string) => {
    setVisibleAnnouncements(prev => prev.filter(a => a.id !== id))
    onDismiss?.(id)
  }

  if (visibleAnnouncements.length === 0) return null

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {visibleAnnouncements.map((announcement, index) => {
          const styles = typeStyles[announcement.type]
          const Icon = announcement.icon || styles.icon

          return (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className={cn(
                'relative flex items-center gap-4 p-4 rounded-xl border backdrop-blur-sm',
                styles.bg,
                styles.border
              )}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              <motion.div
                className={cn('relative p-2.5 rounded-lg shrink-0', styles.iconBg)}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Icon className={cn('w-5 h-5', styles.text)} />
              </motion.div>

              <div className="flex-1 min-w-0 relative">
                <p className={cn('text-sm font-semibold', styles.text)}>
                  {announcement.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {announcement.description}
                </p>
              </div>

              {announcement.action && (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    'shrink-0 h-8 text-xs',
                    'border-current/20 hover:bg-current/10'
                  )}
                  onClick={() => {
                    if (announcement.action?.onClick) {
                      announcement.action.onClick()
                    } else if (announcement.action?.href) {
                      router.push(announcement.action.href)
                    }
                  }}
                >
                  {announcement.action.label}
                </Button>
              )}

              {announcement.dismissible && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'shrink-0 h-8 w-8 rounded-full',
                    'hover:bg-current/10'
                  )}
                  onClick={() => handleDismiss(announcement.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export function MiniAnnouncementBanner() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20"
    >
      <div className="p-1.5 rounded-md bg-green-500/20">
        <Zap className="w-4 h-4 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-green-700 dark:text-green-400">
          WhatsApp conectado!
        </p>
        <p className="text-[10px] text-muted-foreground">
          Recebendo mensagens automaticamente
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setVisible(false)}
      >
        <X className="w-3 h-3" />
      </Button>
    </motion.div>
  )
}

export function QuickStatusBanner() {
  const [visible, setVisible] = useState(true)
  const [whatsappStatus, setWhatsappStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [aiStatus, setAiStatus] = useState<'loading' | 'active' | 'inactive'>('loading')
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'active' | 'inactive'>('loading')

  useEffect(() => {
    const checkStatuses = async () => {
      try {
        // Check WhatsApp status
        const waRes = await fetch('/api/whatsapp/status')
        if (waRes.ok) {
          const waData = await waRes.json()
          setWhatsappStatus(waData.connected ? 'connected' : 'disconnected')
        } else {
          setWhatsappStatus('disconnected')
        }
      } catch {
        setWhatsappStatus('disconnected')
      }

      try {
        // Check AI status
        const aiRes = await fetch('/api/ai/status')
        if (aiRes.ok) {
          const aiData = await aiRes.json()
          setAiStatus(aiData.configured ? 'active' : 'inactive')
        } else {
          setAiStatus('inactive')
        }
      } catch {
        setAiStatus('inactive')
      }

      try {
        // Check payment integration status
        const payRes = await fetch('/api/integrations/mercadopago/status')
        if (payRes.ok) {
          const payData = await payRes.json()
          setPaymentStatus(payData.connected ? 'active' : 'inactive')
        } else {
          setPaymentStatus('inactive')
        }
      } catch {
        setPaymentStatus('inactive')
      }
    }

    checkStatuses()
  }, [])

  if (!visible) return null

  const statusIcon = (status: string) => {
    if (status === 'loading') return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
    if (status === 'connected' || status === 'active') return <CheckCircle className="w-4 h-4 text-green-600" />
    return <XCircle className="w-4 h-4 text-red-500" />
  }

  const statusBadge = (status: string, activeText: string = 'Ativo') => {
    if (status === 'loading') return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted">{('Verificando...')}</Badge>
    if (status === 'connected' || status === 'active') return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">{activeText}</Badge>
    return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-200">Inativo</Badge>
  }

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
            <Zap className="w-4 h-4 text-white" />
          </div>
          Status do Sistema
          <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => setVisible(false)}>
            <X className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* WhatsApp Status */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${whatsappStatus === 'connected' ? 'bg-green-500/5 border-green-500/10' : whatsappStatus === 'disconnected' ? 'bg-red-500/5 border-red-500/10' : 'bg-muted/30 border-muted'}`}>
          <div className={`p-2 rounded-lg ${whatsappStatus === 'connected' ? 'bg-green-500/10' : whatsappStatus === 'disconnected' ? 'bg-red-500/10' : 'bg-muted/30'}`}>
            {statusIcon(whatsappStatus)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">WhatsApp API</p>
            <p className="text-xs text-muted-foreground">{whatsappStatus === 'connected' ? 'Conectado e funcionando' : whatsappStatus === 'disconnected' ? 'Desconectado' : 'Verificando...'}</p>
          </div>
          {statusBadge(whatsappStatus, 'Online')}
        </div>

        {/* AI Status */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${aiStatus === 'active' ? 'bg-purple-500/5 border-purple-500/10' : aiStatus === 'inactive' ? 'bg-red-500/5 border-red-500/10' : 'bg-muted/30 border-muted'}`}>
          <div className={`p-2 rounded-lg ${aiStatus === 'active' ? 'bg-purple-500/10' : aiStatus === 'inactive' ? 'bg-red-500/10' : 'bg-muted/30'}`}>
            {statusIcon(aiStatus)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Luna IA</p>
            <p className="text-xs text-muted-foreground">{aiStatus === 'active' ? 'Assistente virtual ativo' : aiStatus === 'inactive' ? 'Não configurado' : 'Verificando...'}</p>
          </div>
          {statusBadge(aiStatus, 'Ativo')}
        </div>

        {/* Payment Status */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${paymentStatus === 'active' ? 'bg-blue-500/5 border-blue-500/10' : paymentStatus === 'inactive' ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-muted/30 border-muted'}`}>
          <div className={`p-2 rounded-lg ${paymentStatus === 'active' ? 'bg-blue-500/10' : paymentStatus === 'inactive' ? 'bg-yellow-500/10' : 'bg-muted/30'}`}>
            {statusIcon(paymentStatus)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Mercado Pago</p>
            <p className="text-xs text-muted-foreground">{paymentStatus === 'active' ? 'Pagamentos PIX ativos' : paymentStatus === 'inactive' ? 'Não conectado' : 'Verificando...'}</p>
          </div>
          {statusBadge(paymentStatus, 'Ativo')}
        </div>

        {/* Calendar Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <CheckCircle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Agenda Interna</p>
            <p className="text-xs text-muted-foreground">Sincronização em dia</p>
          </div>
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
            Sync
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatusBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      <span className="text-xs font-medium text-green-700 dark:text-green-400">
        Sistema Online
      </span>
    </motion.div>
  )
}
