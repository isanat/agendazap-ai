'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, User, Phone, Bell, Trash2, Plus, 
  CheckCircle, AlertCircle, Users, Calendar,
  ChevronDown, ChevronUp, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WaitlistEntry {
  id: string
  clientName: string
  clientPhone: string
  serviceName: string
  professionalId: string
  professionalName: string
  preferredDate: string
  preferredTimeStart: string
  preferredTimeEnd: string
  createdAt: Date
  status: 'waiting' | 'notified' | 'converted' | 'expired'
  priority: 'normal' | 'high' | 'vip'
  notes: string
}

interface WaitlistManagerProps {
  professionals: { id: string; name: string; color: string }[]
  services: { id: string; name: string }[]
  selectedDate?: Date
  onAddToWaitlist?: (entry: Partial<WaitlistEntry>) => void
  onConvertToAppointment?: (entry: WaitlistEntry) => void
}

const priorityColors = {
  normal: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  high: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  vip: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
}

const statusColors = {
  waiting: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  notified: 'bg-green-500/10 text-green-600 border-green-500/20',
  converted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  expired: 'bg-red-500/10 text-red-600 border-red-500/20',
}

const statusLabels = {
  waiting: 'Aguardando',
  notified: 'Notificado',
  converted: 'Convertido',
  expired: 'Expirado',
}

// Mock data for demonstration
const mockWaitlist: WaitlistEntry[] = [
  {
    id: '1',
    clientName: 'Maria Silva',
    clientPhone: '(11) 98765-4321',
    serviceName: 'Corte + Hidratação',
    professionalId: '1',
    professionalName: 'Ana Paula',
    preferredDate: '2025-04-17',
    preferredTimeStart: '09:00',
    preferredTimeEnd: '12:00',
    createdAt: new Date('2025-04-15T10:30:00'),
    status: 'waiting',
    priority: 'normal',
    notes: 'Cliente regular, prefere manhã'
  },
  {
    id: '2',
    clientName: 'João Santos',
    clientPhone: '(11) 91234-5678',
    serviceName: 'Barba Completa',
    professionalId: '2',
    professionalName: 'Carlos',
    preferredDate: '2025-04-17',
    preferredTimeStart: '14:00',
    preferredTimeEnd: '18:00',
    createdAt: new Date('2025-04-15T11:45:00'),
    status: 'waiting',
    priority: 'high',
    notes: 'Aniversário no dia 18, precisa antes'
  },
  {
    id: '3',
    clientName: 'Ana Oliveira',
    clientPhone: '(11) 92345-6789',
    serviceName: 'Manicure + Pedicure',
    professionalId: '3',
    professionalName: 'Julia',
    preferredDate: '2025-04-17',
    preferredTimeStart: '10:00',
    preferredTimeEnd: '16:00',
    createdAt: new Date('2025-04-14T09:00:00'),
    status: 'notified',
    priority: 'vip',
    notes: 'Cliente VIP, flexível com horário'
  },
]

export function WaitlistManager({ 
  professionals, 
  services, 
  selectedDate,
  onAddToWaitlist,
  onConvertToAppointment 
}: WaitlistManagerProps) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(mockWaitlist)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'notified'>('all')
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    serviceName: '',
    professionalId: '',
    preferredDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    preferredTimeStart: '09:00',
    preferredTimeEnd: '18:00',
    priority: 'normal' as 'normal' | 'high' | 'vip',
    notes: ''
  })

  const filteredWaitlist = waitlist
    .filter(entry => filter === 'all' || entry.status === filter)
    .sort((a, b) => {
      // Sort by priority first, then by creation date
      const priorityOrder = { vip: 0, high: 1, normal: 2 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const handleAddToWaitlist = () => {
    if (!formData.clientName || !formData.clientPhone || !formData.serviceName) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const professional = professionals.find(p => p.id === formData.professionalId)
    
    const newEntry: WaitlistEntry = {
      id: Date.now().toString(),
      clientName: formData.clientName,
      clientPhone: formData.clientPhone,
      serviceName: formData.serviceName,
      professionalId: formData.professionalId,
      professionalName: professional?.name || 'Qualquer',
      preferredDate: formData.preferredDate,
      preferredTimeStart: formData.preferredTimeStart,
      preferredTimeEnd: formData.preferredTimeEnd,
      createdAt: new Date(),
      status: 'waiting',
      priority: formData.priority,
      notes: formData.notes
    }

    setWaitlist(prev => [...prev, newEntry])
    setIsAddDialogOpen(false)
    
    // Reset form
    setFormData({
      clientName: '',
      clientPhone: '',
      serviceName: '',
      professionalId: '',
      preferredDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      preferredTimeStart: '09:00',
      preferredTimeEnd: '18:00',
      priority: 'normal',
      notes: ''
    })

    toast.success('Cliente adicionado à lista de espera')
    
    if (onAddToWaitlist) {
      onAddToWaitlist(newEntry)
    }
  }

  const handleNotify = (id: string) => {
    setWaitlist(prev => prev.map(entry => 
      entry.id === id ? { ...entry, status: 'notified' as const } : entry
    ))
    toast.success('Cliente notificado via WhatsApp')
  }

  const handleConvert = (entry: WaitlistEntry) => {
    setWaitlist(prev => prev.map(e => 
      e.id === entry.id ? { ...e, status: 'converted' as const } : e
    ))
    toast.success('Convertido para agendamento')
    
    if (onConvertToAppointment) {
      onConvertToAppointment(entry)
    }
  }

  const handleRemove = (id: string) => {
    setWaitlist(prev => prev.filter(entry => entry.id !== id))
    toast.success('Removido da lista de espera')
  }

  const waitingCount = waitlist.filter(e => e.status === 'waiting').length
  const notifiedCount = waitlist.filter(e => e.status === 'notified').length

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Lista de Espera
            </CardTitle>
            <CardDescription>
              Clientes aguardando vagas
            </CardDescription>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Adicionar à Lista de Espera
                </DialogTitle>
                <DialogDescription>
                  Adicione um cliente que deseja aguardar uma vaga
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Cliente *</Label>
                    <Input
                      value={formData.clientName}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone *</Label>
                    <Input
                      value={formData.clientPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Serviço *</Label>
                    <Select
                      value={formData.serviceName}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, serviceName: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Profissional</Label>
                    <Select
                      value={formData.professionalId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, professionalId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer profissional</SelectItem>
                        {professionals.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                              {p.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Preferência de Horário</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredDate: e.target.value }))}
                    />
                    <Input
                      type="time"
                      value={formData.preferredTimeStart}
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredTimeStart: e.target.value }))}
                    />
                    <Input
                      type="time"
                      value={formData.preferredTimeEnd}
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredTimeEnd: e.target.value }))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Data, horário inicial e final</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'normal' | 'high' | 'vip') => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Informações adicionais..."
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddToWaitlist} className="bg-gradient-to-r from-blue-500 to-indigo-600">
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Stats */}
        <div className="flex gap-2 mt-3">
          <Badge 
            variant="outline" 
            className={cn('cursor-pointer', filter === 'all' && 'ring-2 ring-blue-500')}
            onClick={() => setFilter('all')}
          >
            Todos ({waitlist.length})
          </Badge>
          <Badge 
            variant="outline"
            className={cn('cursor-pointer bg-blue-500/10', filter === 'waiting' && 'ring-2 ring-blue-500')}
            onClick={() => setFilter('waiting')}
          >
            <Clock className="w-3 h-3 mr-1" />
            Aguardando ({waitingCount})
          </Badge>
          <Badge 
            variant="outline"
            className={cn('cursor-pointer bg-green-500/10', filter === 'notified' && 'ring-2 ring-green-500')}
            onClick={() => setFilter('notified')}
          >
            <Bell className="w-3 h-3 mr-1" />
            Notificados ({notifiedCount})
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {filteredWaitlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {filter === 'all' ? 'Nenhum cliente na lista de espera' : `Nenhum cliente ${filter === 'waiting' ? 'aguardando' : 'notificado'}`}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Accordion type="single" collapsible className="w-full">
              {filteredWaitlist.map((entry, index) => (
                <AccordionItem key={entry.id} value={entry.id} className="px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 w-full pr-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                          entry.priority === 'vip' && 'bg-purple-500/20 text-purple-600',
                          entry.priority === 'high' && 'bg-amber-500/20 text-amber-600',
                          entry.priority === 'normal' && 'bg-gray-500/20 text-gray-600'
                        )}
                      >
                        {entry.priority === 'vip' ? '⭐' : entry.clientName.charAt(0)}
                      </motion.div>
                      
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{entry.clientName}</span>
                          <Badge variant="outline" className={cn('text-[10px]', priorityColors[entry.priority])}>
                            {entry.priority === 'vip' ? 'VIP' : entry.priority === 'high' ? 'Alta' : 'Normal'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{entry.serviceName}</span>
                          <span>•</span>
                          <span>{entry.professionalName}</span>
                        </div>
                      </div>
                      
                      <Badge variant="outline" className={cn('text-[10px]', statusColors[entry.status])}>
                        {statusLabels[entry.status]}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3 pt-2"
                    >
                      {/* Contact Info */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{entry.clientPhone}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(entry.preferredDate), "dd/MM", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{entry.preferredTimeStart} - {entry.preferredTimeEnd}</span>
                        </div>
                      </div>
                      
                      {/* Notes */}
                      {entry.notes && (
                        <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                          {entry.notes}
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {entry.status === 'waiting' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleNotify(entry.id)}
                              className="flex-1"
                            >
                              <Bell className="w-3 h-3 mr-1" />
                              Notificar
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleConvert(entry)}
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Agendar
                            </Button>
                          </>
                        )}
                        {entry.status === 'notified' && (
                          <Button 
                            size="sm"
                            onClick={() => handleConvert(entry)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Confirmar Agendamento
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleRemove(entry.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
