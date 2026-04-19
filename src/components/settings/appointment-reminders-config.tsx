'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Clock, MessageSquare, Smartphone, Mail, Save, Loader2, TestTube, Settings2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ReminderConfig {
  id: string
  type: '24h' | '2h' | '1h' | '30m'
  enabled: boolean
  channel: 'whatsapp' | 'email' | 'push'
  customMessage?: string
}

const defaultReminders: ReminderConfig[] = [
  {
    id: '1',
    type: '24h',
    enabled: true,
    channel: 'whatsapp',
    customMessage: 'Olá {cliente}! Lembrete: você tem um agendamento amanhã às {horario} com {profissional} para {servico}.'
  },
  {
    id: '2',
    type: '2h',
    enabled: true,
    channel: 'whatsapp',
    customMessage: 'Olá {cliente}! Seu agendamento é em 2 horas. {servico} com {profissional} às {horario}.'
  },
  {
    id: '3',
    type: '1h',
    enabled: false,
    channel: 'whatsapp',
    customMessage: ''
  },
  {
    id: '4',
    type: '30m',
    enabled: false,
    channel: 'push',
    customMessage: ''
  }
]

const typeLabels: Record<string, string> = {
  '24h': '24 horas antes',
  '2h': '2 horas antes',
  '1h': '1 hora antes',
  '30m': '30 minutos antes'
}

const channelLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4" />, color: 'text-green-500' },
  email: { label: 'E-mail', icon: <Mail className="w-4 h-4" />, color: 'text-blue-500' },
  push: { label: 'Push Notification', icon: <Smartphone className="w-4 h-4" />, color: 'text-purple-500' }
}

const variables = [
  { name: 'cliente', description: 'Nome do cliente' },
  { name: 'profissional', description: 'Nome do profissional' },
  { name: 'servico', description: 'Nome do serviço' },
  { name: 'horario', description: 'Horário do agendamento' },
  { name: 'data', description: 'Data do agendamento' },
  { name: 'valor', description: 'Valor do serviço' }
]

export function AppointmentRemindersConfig() {
  const [reminders, setReminders] = useState<ReminderConfig[]>(defaultReminders)
  const [isSaving, setIsSaving] = useState(false)
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleToggle = (id: string) => {
    setReminders(prev => 
      prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    )
  }

  const handleChannelChange = (id: string, channel: ReminderConfig['channel']) => {
    setReminders(prev =>
      prev.map(r => r.id === id ? { ...r, channel } : r)
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success('Configurações de lembretes salvas com sucesso!')
    setIsSaving(false)
  }

  const handleTestReminder = (reminder: ReminderConfig) => {
    toast.info(`Enviando lembrete de teste (${typeLabels[reminder.type]})...`)
    
    setTimeout(() => {
      toast.success(`Lembrete de teste enviado via ${channelLabels[reminder.channel].label}!`)
    }, 1500)
  }

  const handleEditMessage = (reminder: ReminderConfig) => {
    setEditingReminder(reminder)
    setIsDialogOpen(true)
  }

  const handleSaveMessage = () => {
    if (editingReminder) {
      setReminders(prev =>
        prev.map(r => r.id === editingReminder.id ? editingReminder : r)
      )
      toast.success('Mensagem personalizada salva!')
      setIsDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-500" />
            Lembretes Automáticos
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure quando e como seus clientes receberão lembretes
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>

      {/* Reminder Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {reminders.map((reminder, index) => (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              "transition-all duration-300 hover:shadow-lg",
              reminder.enabled ? "border-green-500/30 bg-green-500/5" : "opacity-70"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      reminder.enabled ? "bg-green-500/20" : "bg-muted"
                    )}>
                      <Clock className={cn(
                        "w-5 h-5",
                        reminder.enabled ? "text-green-500" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{typeLabels[reminder.type]}</CardTitle>
                      <CardDescription className="text-xs">
                        Enviar lembrete {typeLabels[reminder.type].toLowerCase()}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={reminder.enabled}
                    onCheckedChange={() => handleToggle(reminder.id)}
                  />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Channel Select */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-16">Canal:</Label>
                  <Select
                    value={reminder.channel}
                    onValueChange={(value) => handleChannelChange(reminder.id, value as ReminderConfig['channel'])}
                    disabled={!reminder.enabled}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(channelLabels).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span className={value.color}>{value.icon}</span>
                            {value.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      reminder.enabled 
                        ? "border-green-500/50 text-green-600 dark:text-green-400" 
                        : "text-muted-foreground"
                    )}
                  >
                    {reminder.enabled ? 'Ativo' : 'Inativo'}
                  </Badge>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditMessage(reminder)}
                      disabled={!reminder.enabled}
                    >
                      <Settings2 className="w-4 h-4 mr-1" />
                      Personalizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestReminder(reminder)}
                      disabled={!reminder.enabled}
                    >
                      <TestTube className="w-4 h-4 mr-1" />
                      Testar
                    </Button>
                  </div>
                </div>

                {/* Custom Message Preview */}
                {reminder.customMessage && reminder.enabled && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Mensagem:</p>
                    <p className="text-sm line-clamp-2">{reminder.customMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-blue-500/20">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Dica: Lembretes reduzem no-shows em até 70%
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Recomendamos ativar lembretes de 24h e 2h antes para melhores resultados.
              Mensagens personalizadas aumentam a taxa de confirmação.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Message Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Personalizar Mensagem</DialogTitle>
            <DialogDescription>
              Edite a mensagem de lembrete para {editingReminder && typeLabels[editingReminder.type]}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={editingReminder?.customMessage || ''}
                onChange={(e) => setEditingReminder(prev => prev ? { ...prev, customMessage: e.target.value } : null)}
                placeholder="Digite sua mensagem personalizada..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Variáveis disponíveis:</Label>
              <div className="flex flex-wrap gap-2">
                {variables.map((v) => (
                  <Badge key={v.name} variant="secondary" className="text-xs cursor-help" title={v.description}>
                    {'{' + v.name + '}'}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Clique nas variáveis para ver a descrição
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMessage}>
              Salvar Mensagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
