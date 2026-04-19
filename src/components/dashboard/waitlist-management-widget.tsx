'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, Users, Phone, MessageSquare, CheckCircle, XCircle, 
  Bell, UserPlus, Timer, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface WaitlistEntry {
  id: string
  clientName: string
  phone: string
  service: string
  professional: string
  waitTime: number // minutes
  priority: 'normal' | 'high' | 'urgent'
  status: 'waiting' | 'notified' | 'seated' | 'completed'
  notes?: string
  estimatedWait: number
}

const mockWaitlist: WaitlistEntry[] = [
  {
    id: '1',
    clientName: 'Maria Silva',
    phone: '(11) 99999-1111',
    service: 'Corte Feminino',
    professional: 'Ana',
    waitTime: 45,
    priority: 'high',
    status: 'waiting',
    estimatedWait: 15,
    notes: 'Cliente com pressa'
  },
  {
    id: '2',
    clientName: 'João Santos',
    phone: '(11) 99999-2222',
    service: 'Barba',
    professional: 'Pedro',
    waitTime: 30,
    priority: 'normal',
    status: 'notified',
    estimatedWait: 5
  },
  {
    id: '3',
    clientName: 'Ana Costa',
    phone: '(11) 99999-3333',
    service: 'Manicure',
    professional: 'Luísa',
    waitTime: 15,
    priority: 'normal',
    status: 'waiting',
    estimatedWait: 20
  },
  {
    id: '4',
    clientName: 'Carlos Oliveira',
    phone: '(11) 99999-4444',
    service: 'Corte Masculino',
    professional: 'Pedro',
    waitTime: 60,
    priority: 'urgent',
    status: 'waiting',
    estimatedWait: 10,
    notes: 'Aniversário hoje'
  },
]

interface WaitlistManagementWidgetProps {
  accountId?: string | null
}

export function WaitlistManagementWidget({ accountId }: WaitlistManagementWidgetProps) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(mockWaitlist)
  const [expanded, setExpanded] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'notified'>('all')

  const waitingCount = waitlist.filter(w => w.status === 'waiting').length
  const avgWaitTime = Math.round(
    waitlist.reduce((acc, w) => acc + w.waitTime, 0) / waitlist.length
  )
  const urgentCount = waitlist.filter(w => w.priority === 'urgent').length

  const handleNotify = (id: string) => {
    setWaitlist(prev => prev.map(w => 
      w.id === id ? { ...w, status: 'notified' as const } : w
    ))
  }

  const handleComplete = (id: string) => {
    setWaitlist(prev => prev.map(w => 
      w.id === id ? { ...w, status: 'completed' as const } : w
    ))
  }

  const handleRemove = (id: string) => {
    setWaitlist(prev => prev.filter(w => w.id !== id))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-50 border-red-200'
      case 'high': return 'text-orange-500 bg-orange-50 border-orange-200'
      default: return 'text-gray-500 bg-gray-50 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Aguardando</Badge>
      case 'notified':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Notificado</Badge>
      case 'seated':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Atendendo</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Concluído</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredWaitlist = waitlist.filter(w => {
    if (filter === 'all') return w.status !== 'completed'
    return w.status === filter
  })

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Lista de Espera</CardTitle>
              <CardDescription>{waitingCount} clientes aguardando</CardDescription>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <UserPlus className="h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar à Lista de Espera</DialogTitle>
                <DialogDescription>
                  Adicione um cliente à lista de espera
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <Input placeholder="Nome do cliente" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input placeholder="(00) 00000-0000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Serviço</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corte">Corte</SelectItem>
                        <SelectItem value="barba">Barba</SelectItem>
                        <SelectItem value="manicure">Manicure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Normal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setShowAddDialog(false)}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-amber-600">{waitingCount}</p>
            <p className="text-xs text-muted-foreground">Aguardando</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{avgWaitTime}min</p>
            <p className="text-xs text-muted-foreground">Tempo Médio</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
            <p className="text-xs text-muted-foreground">Urgentes</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'waiting', 'notified'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="text-xs"
            >
              {f === 'all' ? 'Todos' : f === 'waiting' ? 'Aguardando' : 'Notificados'}
            </Button>
          ))}
        </div>

        {/* Waitlist */}
        <ScrollArea className="h-[280px] pr-4">
          <AnimatePresence>
            {filteredWaitlist.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>Nenhum cliente na lista de espera</p>
              </div>
            ) : (
              filteredWaitlist.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-3 mb-2 rounded-lg border",
                    getPriorityColor(entry.priority)
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {entry.clientName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{entry.clientName}</p>
                        <p className="text-xs text-muted-foreground">{entry.service}</p>
                      </div>
                    </div>
                    {getStatusBadge(entry.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {entry.waitTime}min
                    </div>
                    <div className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      ~{entry.estimatedWait}min
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {entry.professional}
                    </div>
                  </div>

                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mb-2 italic">
                      💬 {entry.notes}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {entry.status === 'waiting' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs"
                        onClick={() => handleNotify(entry.id)}
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        Notificar
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs"
                      onClick={() => handleComplete(entry.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Atender
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-xs text-red-500 hover:text-red-600"
                      onClick={() => handleRemove(entry.id)}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export function WaitlistManagementMini({ accountId }: WaitlistManagementWidgetProps) {
  const waitingCount = mockWaitlist.filter(w => w.status === 'waiting').length
  const urgentCount = mockWaitlist.filter(w => w.priority === 'urgent').length

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Users className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Lista de Espera</p>
              <p className="text-xs text-muted-foreground">{waitingCount} aguardando</p>
            </div>
          </div>
          {urgentCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {urgentCount} urgentes
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
