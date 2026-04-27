'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cake,
  Gift,
  MessageSquare,
  Calendar,
  ChevronRight,
  Sparkles,
  Bell,
  Send,
  Star,
  Clock,
  Users,
  PartyPopper
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, isToday, isTomorrow, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface BirthdayClient {
  id: string
  name: string
  phone: string
  avatar?: string
  birthDate: string
  lastVisit?: string
  totalSpent: number
  preferredServices: string[]
  notified: boolean
}

const mockBirthdays: BirthdayClient[] = [
  {
    id: '1',
    name: 'Ana Carolina Silva',
    phone: '(11) 99999-1234',
    birthDate: new Date().toISOString().split('T')[0], // Today
    lastVisit: '2024-11-15',
    totalSpent: 450,
    preferredServices: ['Corte Feminino', 'Manicure'],
    notified: false
  },
  {
    id: '2',
    name: 'Maria Fernanda Costa',
    phone: '(11) 98888-5678',
    birthDate: addDays(new Date(), 1).toISOString().split('T')[0], // Tomorrow
    lastVisit: '2024-12-01',
    totalSpent: 780,
    preferredServices: ['Coloração', 'Hidratação'],
    notified: false
  },
  {
    id: '3',
    name: 'Juliana Santos',
    phone: '(11) 97777-9012',
    birthDate: addDays(new Date(), 3).toISOString().split('T')[0],
    lastVisit: '2024-10-20',
    totalSpent: 320,
    preferredServices: ['Corte Feminino'],
    notified: false
  },
  {
    id: '4',
    name: 'Camila Oliveira',
    phone: '(11) 96666-3456',
    birthDate: addDays(new Date(), 5).toISOString().split('T')[0],
    lastVisit: '2024-11-28',
    totalSpent: 1200,
    preferredServices: ['Spa', 'Massagem'],
    notified: true
  },
  {
    id: '5',
    name: 'Patricia Lima',
    phone: '(11) 95555-7890',
    birthDate: addDays(new Date(), 8).toISOString().split('T')[0],
    lastVisit: '2024-09-15',
    totalSpent: 180,
    preferredServices: ['Manicure', 'Pedicure'],
    notified: false
  }
]

function getBirthdayStatus(dateStr: string) {
  const date = parseISO(dateStr)
  const today = new Date()
  
  // Set year to current year for comparison
  const birthdayThisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate())
  
  if (isToday(birthdayThisYear)) {
    return { label: 'Hoje!', color: 'bg-pink-500', priority: 1 }
  }
  if (isTomorrow(birthdayThisYear)) {
    return { label: 'Amanhã', color: 'bg-amber-500', priority: 2 }
  }
  
  const days = differenceInDays(birthdayThisYear, today)
  if (days > 0 && days <= 7) {
    return { label: `Em ${days} dias`, color: 'bg-blue-500', priority: 3 }
  }
  
  return { label: format(birthdayThisYear, "dd 'de' MMMM", { locale: ptBR }), color: 'bg-slate-400', priority: 4 }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface ClientBirthdayTrackerProps {
  accountId?: string | null
}

export function ClientBirthdayTracker({ accountId }: ClientBirthdayTrackerProps) {
  const [birthdays, setBirthdays] = useState(mockBirthdays)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)

  // Sort by priority (closest birthdays first)
  const sortedBirthdays = [...birthdays].sort((a, b) => {
    const statusA = getBirthdayStatus(a.birthDate)
    const statusB = getBirthdayStatus(b.birthDate)
    return statusA.priority - statusB.priority
  })

  const todayBirthdays = sortedBirthdays.filter(b => {
    const status = getBirthdayStatus(b.birthDate)
    return status.priority === 1
  })

  const upcomingBirthdays = sortedBirthdays.filter(b => {
    const status = getBirthdayStatus(b.birthDate)
    return status.priority > 1
  })

  const handleNotify = (clientId: string) => {
    setBirthdays(prev => prev.map(b =>
      b.id === clientId ? { ...b, notified: true } : b
    ))
  }

  const handleSendWhatsApp = (client: BirthdayClient) => {
    const message = encodeURIComponent(
      `🎂 Parabéns, ${client.name.split(' ')[0]}! 🎉\n\n` +
      `Neste dia especial, a equipe do Salão Beleza Total preparou um presente exclusivo para você!\n\n` +
      `🎁 20% de desconto em qualquer serviço\n` +
      `🎁 Brinde especial na sua próxima visita\n\n` +
      `Agende já seu horário e venha celebrar conosco! 💖`
    )
    const whatsappUrl = `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Aniversariantes</CardTitle>
              <CardDescription>{sortedBirthdays.length} clientes este mês</CardDescription>
            </div>
          </div>
          {todayBirthdays.length > 0 && (
            <Badge className="bg-pink-500 animate-pulse">
              <PartyPopper className="w-3 h-3 mr-1" />
              {todayBirthdays.length} hoje!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Birthdays - Special Section */}
        {todayBirthdays.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-pink-600">
              <Sparkles className="w-4 h-4" />
              Aniversário hoje!
            </div>
            {todayBirthdays.map((client) => (
              <motion.div
                key={client.id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-3 rounded-lg bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border border-pink-200 dark:border-pink-800"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-pink-300">
                    <AvatarImage src={client.avatar} />
                    <AvatarFallback className="bg-pink-100 text-pink-700">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Cliente desde 2023 • R$ {client.totalSpent} em serviços
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleSendWhatsApp(client)}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Parabenizar
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Upcoming Birthdays */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Próximos aniversários
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {upcomingBirthdays.map((client, index) => {
                const status = getBirthdayStatus(client.birthDate)
                
                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors',
                      selectedClient === client.id && 'bg-muted'
                    )}
                    onClick={() => setSelectedClient(selectedClient === client.id ? null : client.id)}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={client.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', status.color, 'text-white')}>
                          {status.label}
                        </Badge>
                        {client.notified && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30">
                            <Bell className="w-2 h-2 mr-1" />
                            Notificado
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-600 hover:text-green-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSendWhatsApp(client)
                        handleNotify(client.id)
                      }}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-bold text-pink-600">{todayBirthdays.length}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{upcomingBirthdays.filter(b => getBirthdayStatus(b.birthDate).priority <= 2).length}</p>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{birthdays.filter(b => b.notified).length}</p>
            <p className="text-xs text-muted-foreground">Notificados</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ClientBirthdayMini({ accountId }: ClientBirthdayTrackerProps) {
  const todayCount = mockBirthdays.filter(b => {
    const status = getBirthdayStatus(b.birthDate)
    return status.priority === 1
  }).length

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white">
          <Cake className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Aniversariantes</p>
          <p className="text-xs text-muted-foreground">
            {todayCount > 0 ? `${todayCount} aniversário(s) hoje!` : 'Nenhum hoje'}
          </p>
        </div>
        <Button size="sm" variant="ghost">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
