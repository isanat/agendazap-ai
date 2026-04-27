'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, Clock, MessageSquare, CheckCircle, XCircle, 
  Send, Calendar, Users, Timer, Zap, Settings,
  ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface ReminderConfig {
  id: string
  name: string
  type: 'confirmation' | 'reminder_24h' | 'reminder_2h' | 'follow_up' | 'birthday'
  enabled: boolean
  channel: 'whatsapp' | 'sms' | 'email'
  timing: string
  message: string
  sentToday: number
  successRate: number
}

interface PendingReminder {
  id: string
  clientName: string
  appointmentTime: string
  appointmentDate: string
  service: string
  type: 'confirmation' | 'reminder' | 'follow_up'
  scheduledTime: string
  status: 'pending' | 'sent' | 'failed'
}

const mockReminderConfigs: ReminderConfig[] = [
  {
    id: '1',
    name: 'Confirmação de Agendamento',
    type: 'confirmation',
    enabled: true,
    channel: 'whatsapp',
    timing: 'Imediatamente',
    message: 'Olá {cliente}, seu agendamento foi confirmado!',
    sentToday: 12,
    successRate: 98
  },
  {
    id: '2',
    name: 'Lembrete 24h antes',
    type: 'reminder_24h',
    enabled: true,
    channel: 'whatsapp',
    timing: '24 horas antes',
    message: 'Olá {cliente}, lembramos do seu agendamento amanhã às {hora}.',
    sentToday: 8,
    successRate: 95
  },
  {
    id: '3',
    name: 'Lembrete 2h antes',
    type: 'reminder_2h',
    enabled: true,
    channel: 'whatsapp',
    timing: '2 horas antes',
    message: 'Olá {cliente}, seu agendamento é em 2 horas. Estamos te esperando!',
    sentToday: 5,
    successRate: 100
  },
  {
    id: '4',
    name: 'Follow-up pós-atendimento',
    type: 'follow_up',
    enabled: true,
    channel: 'whatsapp',
    timing: '1 dia depois',
    message: 'Olá {cliente}, como foi sua experiência? Avalie nosso serviço!',
    sentToday: 15,
    successRate: 87
  },
  {
    id: '5',
    name: 'Aniversário do Cliente',
    type: 'birthday',
    enabled: false,
    channel: 'whatsapp',
    timing: 'No dia do aniversário',
    message: 'Feliz aniversário, {cliente}! 🎂 Venha celebrar conosco!',
    sentToday: 0,
    successRate: 0
  },
]

const mockPendingReminders: PendingReminder[] = [
  {
    id: '1',
    clientName: 'Maria Silva',
    appointmentTime: '14:00',
    appointmentDate: 'Hoje',
    service: 'Corte Feminino',
    type: 'reminder',
    scheduledTime: '12:00',
    status: 'pending'
  },
  {
    id: '2',
    clientName: 'João Santos',
    appointmentTime: '16:30',
    appointmentDate: 'Hoje',
    service: 'Barba',
    type: 'reminder',
    scheduledTime: '14:30',
    status: 'pending'
  },
  {
    id: '3',
    clientName: 'Ana Costa',
    appointmentTime: '10:00',
    appointmentDate: 'Amanhã',
    service: 'Manicure',
    type: 'confirmation',
    scheduledTime: '10:00 (amanhã)',
    status: 'pending'
  },
]

interface AppointmentRemindersWidgetProps {
  accountId?: string | null
}

export function AppointmentRemindersWidget({ accountId }: AppointmentRemindersWidgetProps) {
  const [configs, setConfigs] = useState<ReminderConfig[]>(mockReminderConfigs)
  const [pendingReminders] = useState<PendingReminder[]>(mockPendingReminders)

  const totalSentToday = configs.reduce((acc, c) => acc + c.sentToday, 0)
  const enabledCount = configs.filter(c => c.enabled).length
  const pendingCount = pendingReminders.filter(r => r.status === 'pending').length
  const avgSuccessRate = configs
    .filter(c => c.enabled && c.successRate > 0)
    .reduce((acc, c, _, arr) => acc + c.successRate / arr.length, 0)

  const toggleConfig = (id: string) => {
    setConfigs(prev => prev.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'confirmation': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'reminder_24h': return <Clock className="h-4 w-4 text-blue-500" />
      case 'reminder_2h': return <Timer className="h-4 w-4 text-orange-500" />
      case 'follow_up': return <MessageSquare className="h-4 w-4 text-purple-500" />
      case 'birthday': return <Calendar className="h-4 w-4 text-pink-500" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Pendente</Badge>
      case 'sent':
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Enviado</Badge>
      case 'failed':
        return <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">Falhou</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Lembretes Automáticos</CardTitle>
              <CardDescription>{enabledCount} de {configs.length} ativos</CardDescription>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1">
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-blue-600">{totalSentToday}</p>
            <p className="text-xs text-muted-foreground">Enviados Hoje</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-orange-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-green-600">{avgSuccessRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
          </div>
        </div>

        {/* Reminder Configs */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Tipos de Lembretes</p>
          <ScrollArea className="h-[180px] pr-4">
            <div className="space-y-2">
              {configs.map((config) => (
                <div 
                  key={config.id} 
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border",
                    config.enabled ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {getTypeIcon(config.type)}
                    <div>
                      <p className="text-sm font-medium">{config.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{config.timing}</span>
                        {config.enabled && config.successRate > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-green-500">{config.successRate}% sucesso</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={() => toggleConfig(config.id)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Pending Reminders */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Próximos Envios</p>
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Auto
            </Badge>
          </div>
          <ScrollArea className="h-[120px] pr-4">
            <div className="space-y-2">
              {pendingReminders.map((reminder) => (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                      <MessageSquare className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{reminder.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {reminder.appointmentDate} às {reminder.appointmentTime} • {reminder.service}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(reminder.status)}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Envio: {reminder.scheduledTime}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1">
            <Send className="h-3 w-3" />
            Enviar Agora
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1">
            <Users className="h-3 w-3" />
            Em Massa
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AppointmentRemindersMini({ accountId }: AppointmentRemindersWidgetProps) {
  const totalSentToday = mockReminderConfigs.reduce((acc, c) => acc + c.sentToday, 0)
  const enabledCount = mockReminderConfigs.filter(c => c.enabled).length

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Lembretes</p>
              <p className="text-xs text-muted-foreground">
                {totalSentToday} enviados hoje
              </p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <Zap className="h-3 w-3 mr-1" />
            {enabledCount} ativos
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
