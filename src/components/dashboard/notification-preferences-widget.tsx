'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Calendar,
  DollarSign,
  Users,
  Settings,
  Volume2,
  VolumeX,
  ToggleLeft,
  ToggleRight,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface NotificationCategory {
  id: string
  name: string
  description: string
  icon: typeof Bell
  channels: NotificationChannel[]
}

interface NotificationChannel {
  id: string
  name: string
  icon: typeof Mail
  enabled: boolean
  color: string
}

interface NotificationPreferencesWidgetProps {
  accountId?: string | null
}

const categories: NotificationCategory[] = [
  {
    id: 'appointments',
    name: 'Agendamentos',
    description: 'Novos, cancelamentos e alterações',
    icon: Calendar,
    channels: [
      { id: 'email', name: 'E-mail', icon: Mail, enabled: true, color: 'blue' },
      { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, enabled: true, color: 'green' },
      { id: 'push', name: 'Push', icon: Smartphone, enabled: false, color: 'purple' }
    ]
  },
  {
    id: 'payments',
    name: 'Pagamentos',
    description: 'PIX recebidos, reembolsos',
    icon: DollarSign,
    channels: [
      { id: 'email', name: 'E-mail', icon: Mail, enabled: true, color: 'blue' },
      { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, enabled: true, color: 'green' },
      { id: 'push', name: 'Push', icon: Smartphone, enabled: true, color: 'purple' }
    ]
  },
  {
    id: 'noshow',
    name: 'No-Show',
    description: 'Clientes não compareceram',
    icon: AlertTriangle,
    channels: [
      { id: 'email', name: 'E-mail', icon: Mail, enabled: true, color: 'blue' },
      { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, enabled: false, color: 'green' },
      { id: 'push', name: 'Push', icon: Smartphone, enabled: true, color: 'purple' }
    ]
  },
  {
    id: 'clients',
    name: 'Clientes',
    description: 'Novos cadastros, aniversários',
    icon: Users,
    channels: [
      { id: 'email', name: 'E-mail', icon: Mail, enabled: false, color: 'blue' },
      { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, enabled: false, color: 'green' },
      { id: 'push', name: 'Push', icon: Smartphone, enabled: true, color: 'purple' }
    ]
  }
]

const timeSlots = [
  { value: 'realtime', label: 'Tempo real' },
  { value: '15min', label: 'A cada 15 min' },
  { value: '1h', label: 'A cada 1 hora' },
  { value: 'daily', label: 'Resumo diário' }
]

const channelColors = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30'
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/30'
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30'
  }
}

export function NotificationPreferencesWidget({ accountId }: NotificationPreferencesWidgetProps) {
  const [preferences, setPreferences] = useState(categories)
  const [quietHours, setQuietHours] = useState({ enabled: false, start: '22:00', end: '08:00' })
  const [digest, setDigest] = useState('realtime')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleChannel = (categoryId: string, channelId: string) => {
    setPreferences(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          channels: cat.channels.map(ch => 
            ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch
          )
        }
      }
      return cat
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const enabledCount = preferences.reduce((acc, cat) => 
    acc + cat.channels.filter(ch => ch.enabled).length, 0
  )

  const totalChannels = preferences.reduce((acc, cat) => acc + cat.channels.length, 0)

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500">
              <Bell className="w-4 h-4 text-white" />
            </div>
            Preferências de Notificação
          </CardTitle>
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200">
            {enabledCount}/{totalChannels} ativas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-4">
        {/* Quiet Hours Toggle */}
        <motion.div 
          className="p-3 rounded-lg bg-gradient-to-r from-slate-500/10 to-gray-500/5 border border-slate-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {quietHours.enabled ? (
                <VolumeX className="w-5 h-5 text-slate-600" />
              ) : (
                <Volume2 className="w-5 h-5 text-slate-600" />
              )}
              <div>
                <p className="text-sm font-medium">Horário Silencioso</p>
                <p className="text-xs text-muted-foreground">
                  {quietHours.enabled 
                    ? `${quietHours.start} - ${quietHours.end}`
                    : 'Desativado'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={quietHours.enabled}
              onCheckedChange={(checked) => setQuietHours(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </motion.div>

        {/* Notification Categories */}
        <div className="space-y-3">
          {preferences.map((category, catIndex) => {
            const CategoryIcon = category.icon

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIndex * 0.05 }}
                className="p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-slate-500/20 to-gray-500/10">
                    <CategoryIcon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{category.name}</p>
                    <p className="text-[10px] text-muted-foreground">{category.description}</p>
                  </div>
                </div>

                {/* Channel Toggles */}
                <div className="flex flex-wrap gap-2">
                  {category.channels.map((channel) => {
                    const colors = channelColors[channel.color as keyof typeof channelColors]
                    const ChannelIcon = channel.icon

                    return (
                      <motion.button
                        key={channel.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleChannel(category.id, channel.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                          channel.enabled 
                            ? `${colors.bg} ${colors.text} ${colors.border}`
                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                        )}
                      >
                        <ChannelIcon className="w-3.5 h-3.5" />
                        {channel.name}
                        {channel.enabled ? (
                          <ToggleRight className="w-3.5 h-3.5" />
                        ) : (
                          <ToggleLeft className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Digest Frequency */}
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Frequência de Resumo
          </p>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map((slot) => (
              <Button
                key={slot.value}
                variant={digest === slot.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDigest(slot.value)}
              >
                {slot.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Salvo com sucesso!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Preferências
              </>
            )}
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  )
}

export function NotificationPreferencesMini({ accountId }: { accountId?: string | null }) {
  const enabledCount = categories.reduce((acc, cat) => 
    acc + cat.channels.filter(ch => ch.enabled).length, 0
  )

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Notificações</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {enabledCount} ativas
        </Badge>
      </div>
      <div className="flex gap-2 mt-2">
        {['email', 'whatsapp', 'push'].map((ch, i) => (
          <div key={ch} className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-[10px]',
            i < 2 ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
          )}>
            {i === 0 && <Mail className="w-3 h-3" />}
            {i === 1 && <MessageSquare className="w-3 h-3" />}
            {i === 2 && <Smartphone className="w-3 h-3" />}
            {ch}
          </div>
        ))}
      </div>
    </div>
  )
}
