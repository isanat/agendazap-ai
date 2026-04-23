'use client'

import { motion } from 'framer-motion'
import { 
  Phone, Mail, Calendar, Clock, AlertTriangle, MessageSquare, 
  User, Star, Cake, Hash, CreditCard, Bot, 
  History, Eye, Sparkles, ChevronRight 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  phone: string
  whatsappLid: string | null
  email: string | null
  cpf: string | null
  birthDate: string | null
  totalAppointments: number
  noShowCount: number
  noShowScore: number
  lastVisit: string | null
  notes: string | null
  paymentPreference: string | null
  whatsappPushName: string | null
  serviceHistory: any[] | null
  aiNotes: string | null
  loyaltyPoints: number
  lastAiInteraction: string | null
  createdAt: string
}

interface ClientDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
  onEdit?: () => void
  onWhatsApp?: () => void
}

// Helper: format CPF
function formatCpf(cpf: string | null): string {
  if (!cpf) return ''
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

// Helper: check if phone is a LID/JID identifier
function isLidPhone(phone: string): boolean {
  return phone.startsWith('lid:') || phone.startsWith('jid:')
}

// Helper: format phone
function formatPhone(phone: string): string {
  // Handle LID/JID identifiers - show user-friendly message
  if (isLidPhone(phone)) {
    return 'Telefone pendente'
  }
  const digits = phone.replace(/\D/g, '')
  // Handle numbers with country code (55 + 10-11 digits = 12-13 digits total)
  if (digits.length === 13 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9, 13)}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8, 12)}`
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`
  }
  return phone
}

// Helper: format date to dd/MM/yyyy
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

// Helper: format date and time
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

// Helper: calculate age from birthDate
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  try {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  } catch {
    return null
  }
}

// Helper: payment preference label
function getPaymentLabel(pref: string | null): string {
  switch (pref) {
    case 'PIX': return 'PIX'
    case 'Cartão de Crédito/Débito': return 'Cartão de Crédito/Débito'
    case 'Cartão de Débito': return 'Cartão de Débito'
    case 'Dinheiro': return 'Dinheiro'
    case 'Presencialmente': return 'Presencialmente'
    default: return pref || 'Não informado'
  }
}

// Helper: service status badge
function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'concluido':
    case 'concluído':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 text-xs">Concluído</Badge>
    case 'cancelled':
    case 'cancelado':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 text-xs">Cancelado</Badge>
    case 'noshow':
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800 text-xs">No-Show</Badge>
    case 'pending':
    case 'pendente':
      return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 text-xs">Pendente</Badge>
    case 'confirmed':
    case 'confirmado':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs">Confirmado</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{status || '—'}</Badge>
  }
}

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

export function ClientDetailDrawer({ open, onOpenChange, client, onEdit, onWhatsApp }: ClientDetailDrawerProps) {
  if (!client) return null

  const getRiskColor = (score: number) => {
    if (score <= 30) return { text: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Baixo Risco' }
    if (score <= 60) return { text: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Médio Risco' }
    return { text: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Alto Risco' }
  }

  const risk = getRiskColor(client.noShowScore)
  const age = calculateAge(client.birthDate)
  const serviceHistory = Array.isArray(client.serviceHistory) ? client.serviceHistory : []
  const recentServices = serviceHistory.slice(-5).reverse()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <SheetTitle className="flex items-center gap-3">
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg",
                client.noShowScore >= 70 ? "bg-gradient-to-br from-red-500 to-rose-600" :
                client.noShowScore >= 30 ? "bg-gradient-to-br from-yellow-500 to-amber-600" :
                "bg-gradient-to-br from-green-500 to-emerald-600"
              )}>
                {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h2 className="text-xl font-bold">{client.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className={cn('text-xs', risk.bg, risk.text)}>
                    {risk.label}
                  </Badge>
                  {client.loyaltyPoints > 0 && (
                    <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                      <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" />
                      {client.loyaltyPoints} pts
                    </Badge>
                  )}
                  {client.whatsappPushName && (
                    <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                      {client.whatsappPushName}
                    </Badge>
                  )}
                </div>
              </div>
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">

          {/* Contact Info Section */}
          <motion.div {...fadeInUp} transition={{ delay: 0.05 }} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contato
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-sm">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isLidPhone(client.phone) ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted/50"
                )}>
                  <Phone className={cn(
                    "w-4 h-4",
                    isLidPhone(client.phone) ? "text-amber-600" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  {isLidPhone(client.phone) ? (
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-amber-600">Telefone pendente</p>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800 px-1.5 py-0">
                        LID não resolvido
                      </Badge>
                    </div>
                  ) : (
                    <p className="font-medium">{formatPhone(client.phone)}</p>
                  )}
                </div>
              </div>
              {client.email && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
              )}
              {client.whatsappPushName && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nome no WhatsApp</p>
                    <p className="font-medium">{client.whatsappPushName}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <Separator />

          {/* Personal Info Section */}
          <motion.div {...fadeInUp} transition={{ delay: 0.1 }} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados Pessoais
            </h3>
            <div className="space-y-2.5">
              {client.cpf && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPF</p>
                    <p className="font-medium font-mono">{formatCpf(client.cpf)}</p>
                  </div>
                </div>
              )}
              {client.birthDate && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Cake className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                    <p className="font-medium">
                      {formatDate(client.birthDate)}
                      {age !== null && <span className="text-muted-foreground ml-1">({age} anos)</span>}
                    </p>
                  </div>
                </div>
              )}
              {!client.cpf && !client.birthDate && (
                <p className="text-sm text-muted-foreground italic">Nenhum dado pessoal cadastrado</p>
              )}
            </div>
          </motion.div>

          <Separator />

          {/* Preferences Section */}
          <motion.div {...fadeInUp} transition={{ delay: 0.15 }} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Preferências
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                  <p className="font-medium">{getPaymentLabel(client.paymentPreference)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Star className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pontos de Fidelidade</p>
                  <p className="font-medium text-amber-600">{client.loyaltyPoints} pontos</p>
                </div>
              </div>
            </div>
          </motion.div>

          <Separator />

          {/* Stats Section */}
          <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Score de Risco e Estatísticas
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={cn('text-2xl font-bold', risk.text)}>{client.noShowScore}%</span>
                <span className="text-xs text-muted-foreground">
                  {client.noShowCount} no-shows em {client.totalAppointments} agendamentos
                </span>
              </div>
              <Progress 
                value={client.noShowScore} 
                className={cn(
                  'h-2.5',
                  client.noShowScore <= 30 && '[&>div]:bg-green-500',
                  client.noShowScore > 30 && client.noShowScore <= 60 && '[&>div]:bg-yellow-500',
                  client.noShowScore > 60 && '[&>div]:bg-red-500'
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl bg-muted/50 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs">Total Agendamentos</span>
                </div>
                <p className="text-xl font-bold">{client.totalAppointments}</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl bg-muted/50 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-xs">No-Shows</span>
                </div>
                <p className="text-xl font-bold text-red-500">{client.noShowCount}</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl bg-muted/50 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs">Última Visita</span>
                </div>
                <p className="text-sm font-medium">{client.lastVisit ? formatDate(client.lastVisit) : 'Nunca'}</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl bg-muted/50 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <History className="w-3.5 h-3.5" />
                  <span className="text-xs">Cliente desde</span>
                </div>
                <p className="text-sm font-medium">{formatDate(client.createdAt)}</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Service History Section */}
          {recentServices.length > 0 && (
            <>
              <Separator />
              <motion.div {...fadeInUp} transition={{ delay: 0.25 }} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Histórico de Serviços
                  <Badge variant="outline" className="text-xs ml-auto">
                    {serviceHistory.length} total
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {recentServices.map((service: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-1 h-10 rounded-full bg-gradient-to-b from-green-500 to-emerald-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {service.serviceName || 'Serviço'}
                          </p>
                          {getStatusBadge(service.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {service.professionalName && (
                            <span>{service.professionalName}</span>
                          )}
                          {service.date && (
                            <>
                              <span>•</span>
                              <span>{formatDate(service.date)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {service.price !== undefined && service.price !== null && (
                        <span className="text-sm font-medium text-green-600">
                          R$ {Number(service.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
                {serviceHistory.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Mostrando os 5 serviços mais recentes de {serviceHistory.length} no total
                  </p>
                )}
              </motion.div>
            </>
          )}

          {/* AI Notes Section */}
          {client.aiNotes && (
            <>
              <Separator />
              <motion.div {...fadeInUp} transition={{ delay: 0.3 }} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Notas da IA (Luna)
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </h3>
                <div className="p-3 rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-200/50 dark:border-violet-800/50">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{client.aiNotes}</p>
                </div>
                {client.lastAiInteraction && (
                  <p className="text-xs text-muted-foreground">
                    Última interação: {formatDateTime(client.lastAiInteraction)}
                  </p>
                )}
              </motion.div>
            </>
          )}

          {/* Observations Section */}
          {client.notes && (
            <>
              <Separator />
              <motion.div {...fadeInUp} transition={{ delay: 0.35 }} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Observações
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                  {client.notes}
                </p>
              </motion.div>
            </>
          )}

          {/* Quick Actions */}
          <motion.div {...fadeInUp} transition={{ delay: 0.4 }} className="flex gap-3 pt-2 pb-4">
            {onWhatsApp && (
              <Button 
                className="flex-1 gap-2" 
                variant="outline"
                onClick={onWhatsApp}
                disabled={isLidPhone(client.phone)}
                title={isLidPhone(client.phone) ? 'Telefone ainda não identificado pelo WhatsApp' : 'Enviar mensagem no WhatsApp'}
              >
                <MessageSquare className="w-4 h-4 text-green-600" />
                {isLidPhone(client.phone) ? 'WhatsApp (pendente)' : 'WhatsApp'}
              </Button>
            )}
            <Button className="flex-1 gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              <Calendar className="w-4 h-4" />
              Agendar
            </Button>
            {onEdit && (
              <Button
                variant="outline"
                size="icon"
                onClick={onEdit}
                className="h-10 w-10"
              >
                <span className="text-xs">✏️</span>
              </Button>
            )}
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
