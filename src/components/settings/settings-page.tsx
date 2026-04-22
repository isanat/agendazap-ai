'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Save, 
  Clock, 
  CreditCard, 
  MessageSquare, 
  Globe, 
  PartyPopper, 
  MapPin, 
  Settings,
  Check,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { HolidaysManager } from './holidays-manager'
import { IntegrationsSettings } from './integrations-settings'
import { BusinessInfoSettings } from './business-info-settings'
import { ReminderSettings } from './reminder-settings'
import { ServicePackages } from '../services/service-packages'
import { LoyaltyProgram } from '../loyalty/loyalty-program'
import { AppointmentRemindersConfig } from './appointment-reminders-config'
import { cn } from '@/lib/utils'

// Common timezones for Brazil
const brazilTimezones = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)', city: 'São Paulo, Rio de Janeiro, Brasília' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)', city: 'Manaus, Porto Velho, Rio Branco' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)', city: 'Fortaleza, Recife, Salvador' },
  { value: 'America/Belem', label: 'Belém (GMT-3)', city: 'Belém, Macapá' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)', city: 'Cuiabá, Campo Grande' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)', city: 'Fernando de Noronha' },
]

// Section icon with gradient background
function SectionIcon({ 
  icon: Icon, 
  gradient,
  className 
}: { 
  icon: typeof Globe
  gradient: string
  className?: string
}) {
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'p-2 rounded-xl bg-gradient-to-br shadow-lg',
        gradient,
        className
      )}
    >
      <Icon className="w-5 h-5 text-white" />
    </motion.div>
  )
}

// Animated setting card wrapper
function AnimatedCard({ 
  children, 
  delay = 0,
  className 
}: { 
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className={cn(
        'transition-all duration-300 hover:shadow-lg hover:border-primary/20 group',
        className
      )}>
        {children}
      </Card>
    </motion.div>
  )
}

// Animated input with focus effects
function AnimatedInput({ 
  className, 
  ...props 
}: React.ComponentProps<typeof Input>) {
  return (
    <Input 
      className={cn(
        'transition-all duration-200',
        'focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'hover:border-primary/50',
        className
      )} 
      {...props} 
    />
  )
}

// Animated switch with custom styling
function AnimatedSwitch({ 
  checked, 
  onCheckedChange,
  className 
}: { 
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-emerald-600"
      />
      {checked && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute -right-1 -top-1 w-3 h-3 bg-white rounded-full shadow-sm"
        >
          <Check className="w-2 h-2 text-green-600" />
        </motion.div>
      )}
    </div>
  )
}

// Animated badge for working days
function DayBadge({ 
  day, 
  isSelected, 
  onClick 
}: { 
  day: { value: string; label: string }
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Badge
        variant={isSelected ? 'default' : 'outline'}
        className={cn(
          'cursor-pointer transition-all duration-200 px-4 py-1.5',
          isSelected 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
            : 'hover:bg-muted hover:border-primary/50'
        )}
        onClick={onClick}
      >
        {day.label}
      </Badge>
    </motion.div>
  )
}

// Animated textarea with focus effects
function AnimatedTextarea({ 
  className, 
  ...props 
}: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea 
      className={cn(
        'transition-all duration-200 resize-none',
        'focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'hover:border-primary/50',
        className
      )} 
      {...props} 
    />
  )
}

// Setting row with hover effect
function SettingRow({ 
  label, 
  description, 
  children,
  className 
}: { 
  label: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'flex items-center justify-between p-4 rounded-lg transition-all duration-200',
      'hover:bg-muted/50 group',
      className
    )}>
      <div className="space-y-0.5">
        <Label className="font-medium group-hover:text-foreground transition-colors">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

interface SettingsState {
  businessName: string
  businessType: string
  whatsappNumber: string
  timezone: string
  openingTime: string
  closingTime: string
  workingDays: string[]
  noShowFeeEnabled: boolean
  noShowFeeAmount: number
  noShowFeeDeadline: number
  reminder24h: boolean
  reminder2h: boolean
  welcomeMessage: string
  confirmationMessage: string
  reminderMessage: string
  noShowMessage: string
}

const defaultSettings: SettingsState = {
  businessName: '',
  businessType: 'salon',
  whatsappNumber: '',
  timezone: 'America/Sao_Paulo',
  openingTime: '09:00',
  closingTime: '18:00',
  workingDays: ['1', '2', '3', '4', '5'],
  noShowFeeEnabled: false,
  noShowFeeAmount: 50,
  noShowFeeDeadline: 24,
  reminder24h: true,
  reminder2h: true,
  welcomeMessage: 'Olá! Bem-vindo ao {business_name}. Como posso ajudar?',
  confirmationMessage: 'Perfeito! Seu agendamento está confirmado para {date} às {time}. Te esperamos!',
  reminderMessage: 'Olá {client_name}! Lembrete: você tem um agendamento em 2h às {time}.',
  noShowMessage: 'Infelizmente você não compareceu ao seu agendamento. Uma taxa de R$ {fee} foi gerada.',
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadSettings = async () => {
    try {
      const response = await authFetch('/api/account/me')
      if (response.ok) {
        const data = await response.json()
        const account = data.account || data.Account
        if (account) {
          setSettings({
            businessName: account.businessName || defaultSettings.businessName,
            businessType: account.businessType || defaultSettings.businessType,
            whatsappNumber: account.whatsappNumber || defaultSettings.whatsappNumber,
            timezone: account.timezone || defaultSettings.timezone,
            openingTime: account.openingTime || defaultSettings.openingTime,
            closingTime: account.closingTime || defaultSettings.closingTime,
            workingDays: account.workingDays || defaultSettings.workingDays,
            noShowFeeEnabled: account.noShowFeeEnabled ?? defaultSettings.noShowFeeEnabled,
            noShowFeeAmount: account.noShowFeeAmount ?? defaultSettings.noShowFeeAmount,
            noShowFeeDeadline: account.noShowFeeDeadline ?? defaultSettings.noShowFeeDeadline,
            reminder24h: account.reminder24h ?? defaultSettings.reminder24h,
            reminder2h: account.reminder2h ?? defaultSettings.reminder2h,
            welcomeMessage: account.welcomeMessage || defaultSettings.welcomeMessage,
            confirmationMessage: account.confirmationMessage || defaultSettings.confirmationMessage,
            reminderMessage: account.reminderMessage || defaultSettings.reminderMessage,
            noShowMessage: account.noShowMessage || defaultSettings.noShowMessage,
          })
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setIsLoading(false)
    }
  }

  // Load settings from the API on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await authFetch('/api/account/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  const weekDays = [
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Segunda' },
    { value: '2', label: 'Terça' },
    { value: '3', label: 'Quarta' },
    { value: '4', label: 'Quinta' },
    { value: '5', label: 'Sexta' },
    { value: '6', label: 'Sábado' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <SectionIcon 
            icon={Settings} 
            gradient="from-slate-600 to-gray-700"
          />
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Configurações
            </h2>
            <p className="text-muted-foreground">Personalize seu AgendaZap</p>
          </div>
        </div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </motion.div>
      </motion.div>

      <Tabs defaultValue="general" className="space-y-4">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex sm:grid sm:grid-cols-9 w-full sm:w-auto min-w-max sm:min-w-0 h-auto gap-1 p-1 bg-muted/50">
            <TabsTrigger value="general" className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">Geral</TabsTrigger>
            <TabsTrigger value="business" className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">Negócio</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">Horários</TabsTrigger>
            <TabsTrigger value="holidays" className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">Feriados</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">Mensagens</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">Pagamentos</TabsTrigger>
            <TabsTrigger value="packages" className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">Pacotes</TabsTrigger>
            <TabsTrigger value="loyalty" className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">Fidelidade</TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">Integrações</TabsTrigger>
          </TabsList>
        </div>

        {/* General Settings */}
        <TabsContent value="general">
          <AnimatedCard delay={0.1}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <SectionIcon icon={Globe} gradient="from-blue-500 to-cyan-600" />
                Informações do Negócio
              </CardTitle>
              <CardDescription>
                Configure as informações básicas do seu estabelecimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label htmlFor="businessName" className="font-medium">Nome do Negócio</Label>
                  <AnimatedInput
                    id="businessName"
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  />
                </motion.div>
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label htmlFor="businessType" className="font-medium">Tipo de Negócio</Label>
                  <Select
                    value={settings.businessType}
                    onValueChange={(value) => setSettings({ ...settings, businessType: value })}
                  >
                    <SelectTrigger className="transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salon">Salão de Beleza</SelectItem>
                      <SelectItem value="clinic">Clínica de Estética</SelectItem>
                      <SelectItem value="dentist">Consultório Dentário</SelectItem>
                      <SelectItem value="personal">Personal Trainer</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              </div>
              
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label htmlFor="whatsappNumber" className="font-medium">Número do WhatsApp</Label>
                <AnimatedInput
                  id="whatsappNumber"
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
                <p className="text-sm text-muted-foreground">
                  Este número será usado para receber agendamentos via WhatsApp
                </p>
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor="timezone" className="flex items-center gap-2 font-medium">
                  <MapPin className="w-4 h-4 text-primary" />
                  Fuso Horário
                </Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                >
                  <SelectTrigger className="transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilTimezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{tz.label}</span>
                          <span className="text-xs text-muted-foreground">{tz.city}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Usado para exibir horários corretos em agendamentos e lembretes
                </p>
              </motion.div>
            </CardContent>
          </AnimatedCard>
        </TabsContent>

        {/* Business Info Settings */}
        <TabsContent value="business">
          <BusinessInfoSettings />
        </TabsContent>

        {/* Schedule Settings */}
        <TabsContent value="schedule">
          <div className="space-y-6">
            <AnimatedCard delay={0.1}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <SectionIcon icon={Clock} gradient="from-purple-500 to-violet-600" />
                  Horário de Funcionamento
                </CardTitle>
                <CardDescription>
                  Configure os horários de atendimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <motion.div 
                    className="space-y-2"
                    whileHover={{ scale: 1.01 }}
                  >
                    <Label className="font-medium">Abertura</Label>
                    <AnimatedInput
                      type="time"
                      value={settings.openingTime}
                      onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })}
                    />
                  </motion.div>
                  <motion.div 
                    className="space-y-2"
                    whileHover={{ scale: 1.01 }}
                  >
                    <Label className="font-medium">Fechamento</Label>
                    <AnimatedInput
                      type="time"
                      value={settings.closingTime}
                      onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })}
                    />
                  </motion.div>
                </div>

                <Separator className="my-4" />

                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Label className="font-medium">Dias de Funcionamento</Label>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map((day, index) => (
                      <motion.div
                        key={day.value}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <DayBadge
                          day={day}
                          isSelected={settings.workingDays.includes(day.value)}
                          onClick={() => {
                            const newDays = settings.workingDays.includes(day.value)
                              ? settings.workingDays.filter(d => d !== day.value)
                              : [...settings.workingDays, day.value]
                            setSettings({ ...settings, workingDays: newDays })
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </CardContent>
            </AnimatedCard>

            {/* Enhanced Reminders Configuration */}
            <AppointmentRemindersConfig />
          </div>
        </TabsContent>

        {/* Holidays Settings */}
        <TabsContent value="holidays">
          <AnimatedCard delay={0.1} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <SectionIcon icon={PartyPopper} gradient="from-pink-500 to-rose-600" />
                Dias Especiais
              </CardTitle>
              <CardDescription>
                Configure feriados, férias e bloqueios no calendário
              </CardDescription>
            </CardHeader>
          </AnimatedCard>
          <HolidaysManager />
        </TabsContent>

        {/* Messages Settings */}
        <TabsContent value="messages">
          <AnimatedCard delay={0.1}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <SectionIcon icon={MessageSquare} gradient="from-teal-500 to-cyan-600" />
                Mensagens Personalizadas
              </CardTitle>
              <CardDescription>
                Personalize as mensagens enviadas automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label className="font-medium">Mensagem de Boas-vindas</Label>
                <AnimatedTextarea
                  value={settings.welcomeMessage}
                  onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {'{business_name}'}
                </p>
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label className="font-medium">Mensagem de Confirmação</Label>
                <AnimatedTextarea
                  value={settings.confirmationMessage}
                  onChange={(e) => setSettings({ ...settings, confirmationMessage: e.target.value })}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {'{date}'}, {'{time}'}, {'{service}'}, {'{professional}'}
                </p>
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label className="font-medium">Mensagem de Lembrete</Label>
                <AnimatedTextarea
                  value={settings.reminderMessage}
                  onChange={(e) => setSettings({ ...settings, reminderMessage: e.target.value })}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {'{client_name}'}, {'{time}'}, {'{service}'}
                </p>
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label className="font-medium">Mensagem de No-Show</Label>
                <AnimatedTextarea
                  value={settings.noShowMessage}
                  onChange={(e) => setSettings({ ...settings, noShowMessage: e.target.value })}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {'{fee}'}, {'{service}'}, {'{date}'}
                </p>
              </motion.div>
            </CardContent>
          </AnimatedCard>
          
          {/* Reminder Templates */}
          <ReminderSettings />
        </TabsContent>

        {/* Payments Settings */}
        <TabsContent value="payments">
          <div className="space-y-6">
            <AnimatedCard delay={0.1}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <SectionIcon icon={CreditCard} gradient="from-amber-500 to-orange-600" />
                  Taxa de No-Show
                </CardTitle>
                <CardDescription>
                  Configure a cobrança automática de taxas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <SettingRow 
                  label="Ativar cobrança de no-show"
                  description="Cobra automaticamente clientes que não comparecem"
                >
                  <AnimatedSwitch
                    checked={settings.noShowFeeEnabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, noShowFeeEnabled: checked })}
                  />
                </SettingRow>

                {settings.noShowFeeEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 pt-4"
                  >
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <motion.div 
                        className="space-y-2"
                        whileHover={{ scale: 1.01 }}
                      >
                        <Label className="font-medium">Valor da Taxa (R$)</Label>
                        <AnimatedInput
                          type="number"
                          value={settings.noShowFeeAmount}
                          onChange={(e) => setSettings({ ...settings, noShowFeeAmount: parseFloat(e.target.value) || 0 })}
                        />
                      </motion.div>
                      <motion.div 
                        className="space-y-2"
                        whileHover={{ scale: 1.01 }}
                      >
                        <Label className="font-medium">Prazo para Cancelamento (horas)</Label>
                        <AnimatedInput
                          type="number"
                          value={settings.noShowFeeDeadline}
                          onChange={(e) => setSettings({ ...settings, noShowFeeDeadline: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Cancelamentos com menos antecedência incorrem na taxa
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </AnimatedCard>

            <AnimatedCard delay={0.2} className="border-dashed">
              <CardContent className="p-6">
                <motion.div 
                  className="flex items-center gap-4 text-muted-foreground"
                  whileHover={{ x: 5 }}
                >
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                    <CreditCard className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Configure integrações na aba "Integrações"</p>
                    <p className="text-sm">Conecte Mercado Pago e WhatsApp</p>
                  </div>
                </motion.div>
              </CardContent>
            </AnimatedCard>
          </div>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations">
          <IntegrationsSettings />
        </TabsContent>

        {/* Service Packages */}
        <TabsContent value="packages">
          <ServicePackages 
            services={[
              { id: '1', name: 'Corte Feminino', price: 80, durationMinutes: 45 },
              { id: '2', name: 'Hidratação', price: 120, durationMinutes: 60 },
              { id: '3', name: 'Escova', price: 70, durationMinutes: 45 },
              { id: '4', name: 'Maquiagem', price: 150, durationMinutes: 60 },
              { id: '5', name: 'Barba Completa', price: 45, durationMinutes: 30 },
              { id: '6', name: 'Toalha Quente', price: 25, durationMinutes: 15 },
              { id: '7', name: 'Manicure', price: 40, durationMinutes: 30 },
              { id: '8', name: 'Pedicure', price: 45, durationMinutes: 30 },
            ]}
          />
        </TabsContent>

        {/* Loyalty Program */}
        <TabsContent value="loyalty">
          <LoyaltyProgram />
        </TabsContent>
      </Tabs>
    </div>
  )
}
