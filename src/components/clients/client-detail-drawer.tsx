'use client'

import { motion } from 'framer-motion'
import { X, Phone, Mail, Calendar, Clock, AlertTriangle, TrendingUp, MessageSquare, DollarSign, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface ClientDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: {
    id: string
    name: string
    email: string
    phone: string
    avatar?: string
    noShowCount: number
    totalAppointments: number
    riskScore: number
    lastVisit?: string
    nextAppointment?: string
    totalSpent: number
    preferredServices?: string[]
    notes?: string
  } | null
}

export function ClientDetailDrawer({ open, onOpenChange, client }: ClientDetailDrawerProps) {
  if (!client) return null

  const getRiskColor = (score: number) => {
    if (score <= 30) return { text: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Baixo Risco' }
    if (score <= 60) return { text: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Médio Risco' }
    return { text: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Alto Risco' }
  }

  const risk = getRiskColor(client.riskScore)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h2 className="text-xl font-bold">{client.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn('text-xs', risk.bg, risk.text)}>
                    {risk.label}
                  </Badge>
                </div>
              </div>
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Contato</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{client.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Risk Score */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Score de Risco de No-Show
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('text-2xl font-bold', risk.text)}>{client.riskScore}%</span>
                <span className="text-xs text-muted-foreground">Baseado em {client.totalAppointments} agendamentos</span>
              </div>
              <Progress 
                value={client.riskScore} 
                className={cn(
                  'h-2',
                  client.riskScore <= 30 && '[&>div]:bg-green-500',
                  client.riskScore > 30 && client.riskScore <= 60 && '[&>div]:bg-yellow-500',
                  client.riskScore > 60 && '[&>div]:bg-red-500'
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl bg-muted/50 space-y-2"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Total Agendamentos</span>
              </div>
              <p className="text-2xl font-bold">{client.totalAppointments}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl bg-muted/50 space-y-2"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <X className="w-4 h-4" />
                <span className="text-xs">No-Shows</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{client.noShowCount}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl bg-muted/50 space-y-2"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Total Gasto</span>
              </div>
              <p className="text-2xl font-bold text-green-500">R$ {client.totalSpent.toLocaleString('pt-BR')}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl bg-muted/50 space-y-2"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Última Visita</span>
              </div>
              <p className="text-sm font-medium">{client.lastVisit || 'N/A'}</p>
            </motion.div>
          </div>

          {/* Preferred Services */}
          {client.preferredServices && client.preferredServices.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Serviços Preferidos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {client.preferredServices.map((service, i) => (
                    <Badge key={i} variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Next Appointment */}
          {client.nextAppointment && (
            <>
              <Separator />
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Agendamento</p>
                    <p className="font-semibold">{client.nextAppointment}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {client.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Observações
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {client.notes}
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button className="flex-1 gap-2" variant="outline">
              <MessageSquare className="w-4 h-4" />
              Enviar WhatsApp
            </Button>
            <Button className="flex-1 gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              <Calendar className="w-4 h-4" />
              Agendar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
