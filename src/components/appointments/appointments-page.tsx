'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Clock, User, CheckCircle, XCircle, Phone, ChevronLeft, ChevronRight, MoreVertical, Calendar, Filter, X, Sparkles, Move, RefreshCw, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { format, addDays, subDays, isToday, isSameDay, startOfWeek, addWeeks, subWeeks, parseISO, setHours, setMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import { getStoredAccountId } from '@/hooks/use-data'
import { useAppStore } from '@/store/app-store'
import { WaitlistManager } from './waitlist-manager'

interface Appointment {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  serviceId: string
  serviceName: string
  professionalId: string
  professionalName: string
  professionalColor: string
  date: string
  time: string
  duration: number
  status: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled'
  notes: string
  price: number
}

interface Professional {
  id: string
  name: string
  color: string
}

interface Service {
  id: string
  name: string
  durationMinutes: number
  price: number
}

interface Client {
  id: string
  name: string
  phone: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-400',
  confirmed: 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-400',
  completed: 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-400',
  no_show: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-400',
  cancelled: 'bg-gray-500/20 border-gray-500 text-gray-700 dark:text-gray-400',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  no_show: 'No-Show',
  cancelled: 'Cancelado',
}

// Generate time slots from 8:00 to 20:00
const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 8; hour < 20; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    slots.push(`${hour.toString().padStart(2, '0')}:30`)
  }
  return slots
}

const timeSlots = generateTimeSlots()

// Droppable time slot component
function DroppableTimeSlot({ 
  slot, 
  appointments, 
  onEdit,
  onStatusChange,
  onDelete 
}: { 
  slot: string
  appointments: Appointment[]
  onEdit: (apt: Appointment) => void
  onStatusChange: (id: string, status: Appointment['status']) => void
  onDelete: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slot,
    data: { time: slot },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-14 border-b border-border/50 relative transition-colors',
        isOver && 'bg-green-500/20 border-l-4 border-l-green-500'
      )}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-green-600 font-medium bg-green-500/20 px-2 py-1 rounded">
            Soltar aqui
          </span>
        </div>
      )}
      
      {appointments.map((apt) => {
        const startIndex = timeSlots.indexOf(apt.time)
        const slotsNeeded = Math.ceil(apt.duration / 30)
        const height = slotsNeeded * 56 - 4
        
        return (
          <motion.div
            key={apt.id}
            className="absolute left-2 right-2 rounded-lg border-l-4 p-2 cursor-pointer shadow-sm hover:shadow-md transition-shadow group"
            style={{
              backgroundColor: `${apt.professionalColor}15`,
              borderLeftColor: apt.professionalColor,
              height: `${height}px`,
            }}
            onClick={() => onEdit(apt)}
          >
            <div className="flex items-start justify-between h-full">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{apt.clientName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {apt.serviceName} • {apt.professionalName}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-mono">{apt.time}</span>
                  <Badge 
                    variant="outline" 
                    className={cn('text-[10px] px-1 py-0 h-4', statusColors[apt.status])}
                  >
                    {statusLabels[apt.status]}
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onStatusChange(apt.id, 'confirmed')}>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Confirmar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(apt.id, 'completed')}>
                    <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                    Concluir
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(apt.id, 'no_show')}>
                    <XCircle className="w-4 h-4 mr-2 text-red-500" />
                    No-Show
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => onDelete(apt.id)}
                  >
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// Draggable appointment overlay
function DraggableAppointmentOverlay({ appointment }: { appointment: Appointment }) {
  const height = Math.ceil(appointment.duration / 30) * 56 - 4
  
  return (
    <div
      className="rounded-lg border-l-4 p-3 shadow-xl opacity-90"
      style={{
        backgroundColor: `${appointment.professionalColor}25`,
        borderLeftColor: appointment.professionalColor,
        height: `${height}px`,
        width: '200px',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Move className="w-3 h-3 text-muted-foreground" />
        <p className="font-medium text-sm truncate">{appointment.clientName}</p>
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {appointment.serviceName}
      </p>
      <Badge 
        variant="outline" 
        className={cn('text-[10px] px-1 py-0 h-4 mt-1', statusColors[appointment.status])}
      >
        {statusLabels[appointment.status]}
      </Badge>
    </div>
  )
}

export function AppointmentsPage() {
  const { setAddCallback } = useAppStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState<string | null>(null)
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    clientId: '' as string,
    clientName: '',
    clientPhone: '',
    serviceId: '' as string,
    serviceName: '',
    professionalId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    notes: '',
    status: 'pending' as string,
    isRecurring: false,
    recurringType: 'weekly',
    recurringCount: 4
  })
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')

  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = getStoredAccountId()
    setAccountId(id)
  }, [])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Fetch all data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!accountId) {
      setIsLoading(false)
      setIsInitialLoad(false)
      return
    }

    // Only show full loading on initial load, not on refresh
    if (isInitialLoad && !isRefresh) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      const [appointmentsRes, professionalsRes, servicesRes, clientsRes] = await Promise.all([
        authFetch(`/api/appointments?accountId=${accountId}`),
        authFetch(`/api/professionals?accountId=${accountId}`),
        authFetch(`/api/services?accountId=${accountId}`),
        authFetch(`/api/clients?accountId=${accountId}`)
      ])

      if (!appointmentsRes.ok) throw new Error('Failed to fetch appointments')

      const appointmentsData = await appointmentsRes.json()
      const professionalsData = await professionalsRes.json()
      const servicesData = await servicesRes.json()
      const clientsData = await clientsRes.json()

      // Transform professionals
      const transformedProfessionals: Professional[] = (professionalsData.professionals || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        color: p.color || '#10B981'
      }))
      setProfessionals(transformedProfessionals)

      // Transform services
      const transformedServices: Service[] = (servicesData.services || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        price: s.price
      }))
      setServices(transformedServices)

      // Transform clients
      const transformedClients: Client[] = (clientsData.clients || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone
      }))
      setClients(transformedClients)

      // Transform appointments
      const transformedAppointments: Appointment[] = (appointmentsData.appointments || []).map((apt: any) => {
        const professional = transformedProfessionals.find(p => p.id === apt.professionalId)
        const service = transformedServices.find(s => s.id === apt.serviceId)
        
        return {
          id: apt.id,
          clientId: apt.clientId,
          clientName: apt.client?.name || 'Cliente',
          clientPhone: apt.client?.phone || '',
          serviceId: apt.serviceId,
          serviceName: apt.service?.name || 'Serviço',
          professionalId: apt.professionalId,
          professionalName: professional?.name || 'Profissional',
          professionalColor: professional?.color || '#10B981',
          date: format(new Date(apt.datetime), 'yyyy-MM-dd'),
          time: format(new Date(apt.datetime), 'HH:mm'),
          duration: apt.service?.durationMinutes || 30,
          status: apt.status,
          notes: apt.notes || '',
          price: apt.service?.price || 0
        }
      })

      setAppointments(transformedAppointments)
      setIsInitialLoad(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching data:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [accountId, isInitialLoad])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  
  const dayAppointments = useMemo(() => {
    let filtered = appointments
      .filter(apt => apt.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time))
    
    if (selectedProfessionalFilter) {
      filtered = filtered.filter(apt => apt.professionalName === selectedProfessionalFilter)
    }
    
    return filtered
  }, [appointments, dateStr, selectedProfessionalFilter])

  // Group appointments by time slot
  const appointmentsByTimeSlot = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {}
    timeSlots.forEach(slot => {
      grouped[slot] = []
    })
    
    dayAppointments.forEach(apt => {
      const aptTime = apt.time
      if (grouped[aptTime]) {
        grouped[aptTime].push(apt)
      }
    })
    
    return grouped
  }, [dayAppointments])

  const handlePrevDay = () => setSelectedDate(prev => viewMode === 'week' ? addDays(prev, -7) : subDays(prev, 1))
  const handleNextDay = () => setSelectedDate(prev => viewMode === 'week' ? addDays(prev, 7) : addDays(prev, 1))
  const handleToday = () => setSelectedDate(new Date())

  const handleOpenDialog = useCallback((appointment?: Appointment) => {
    if (appointment) {
      setSelectedAppointment(appointment)
      setFormData({
        clientId: appointment.clientId,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        serviceId: appointment.serviceId,
        serviceName: appointment.serviceName,
        professionalId: appointment.professionalId,
        date: appointment.date,
        time: appointment.time,
        notes: appointment.notes,
        status: appointment.status,
        isRecurring: false,
        recurringType: 'weekly',
        recurringCount: 4
      })
    } else {
      setSelectedAppointment(null)
      setFormData({
        clientId: '',
        clientName: '',
        clientPhone: '',
        serviceId: '',
        serviceName: '',
        professionalId: '',
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: '09:00',
        notes: '',
        status: 'pending',
        isRecurring: false,
        recurringType: 'weekly',
        recurringCount: 4
      })
    }
    setIsDialogOpen(true)
  }, [selectedDate])

  // Register callback with store
  useEffect(() => {
    setAddCallback(() => handleOpenDialog)
    return () => setAddCallback(null)
  }, [setAddCallback, handleOpenDialog])

  const handleSave = async () => {
    if (!formData.clientName || !formData.serviceName || !formData.professionalId) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!accountId) {
      toast.error('Conta não encontrada')
      return
    }

    setIsSaving(true)

    try {
      // Prefer serviceId from formData, fall back to name lookup
      const service = formData.serviceId
        ? services.find(s => s.id === formData.serviceId)
        : services.find(s => s.name === formData.serviceName)
      const professional = professionals.find(p => p.id === formData.professionalId)
      
      // Find or create client
      let clientId = selectedAppointment?.clientId || formData.clientId || undefined
      if (!clientId) {
        const existingClient = clients.find(c => 
          c.name.toLowerCase() === formData.clientName.toLowerCase() ||
          c.phone === formData.clientPhone
        )
        if (existingClient) {
          clientId = existingClient.id
        }
      }

      const datetime = new Date(`${formData.date}T${formData.time}:00`)

      if (selectedAppointment) {
        // Update existing appointment - include all editable fields
        const updateBody: Record<string, unknown> = {
          id: selectedAppointment.id,
          professionalId: formData.professionalId,
          notes: formData.notes,
        }

        // Include clientId if changed or available
        if (clientId) {
          updateBody.clientId = clientId
        }

        // Include serviceId if available
        const resolvedServiceId = service?.id || formData.serviceId
        if (resolvedServiceId) {
          updateBody.serviceId = resolvedServiceId
        }

        // Include datetime if date or time changed
        if (formData.date && formData.time) {
          updateBody.datetime = datetime.toISOString()
        }

        // Include status if changed
        if (formData.status) {
          updateBody.status = formData.status
        }

        const response = await authFetch('/api/appointments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody)
        })

        if (!response.ok) throw new Error('Failed to update appointment')
        
        toast.success('Agendamento atualizado com sucesso!')
      } else {
        // Create new appointment
        const response = await authFetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            clientId,
            clientName: formData.clientName,
            clientPhone: formData.clientPhone,
            serviceId: service?.id,
            professionalId: formData.professionalId,
            datetime: datetime.toISOString(),
            notes: formData.notes
          })
        })

        if (!response.ok) throw new Error('Failed to create appointment')
        
        toast.success('Agendamento criado com sucesso!')
      }

      setIsDialogOpen(false)
      fetchData()
    } catch (err) {
      toast.error('Erro ao salvar agendamento')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    try {
      const response = await authFetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })

      if (!response.ok) throw new Error('Failed to update status')
      
      toast.success(`Status alterado para "${statusLabels[status]}"`)
      fetchData()
    } catch (err) {
      toast.error('Erro ao atualizar status')
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await authFetch(`/api/appointments?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete appointment')
      
      toast.success('Agendamento removido')
      fetchData()
    } catch (err) {
      toast.error('Erro ao remover agendamento')
      console.error(err)
    }
  }

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const aptId = event.active.id as string
    const appointment = appointments.find(a => a.id === aptId)
    if (appointment) {
      setDraggedAppointment(appointment)
    }
  }, [appointments])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setDraggedAppointment(null)

    if (over && active.id !== over.id) {
      const appointmentId = active.id as string
      const newTime = over.id as string
      
      // Check if the time slot is a valid time slot
      if (timeSlots.includes(newTime)) {
        // Update appointment time via API
        const apt = appointments.find(a => a.id === appointmentId)
        if (apt) {
          const newDatetime = new Date(`${apt.date}T${newTime}:00`)
          
          authFetch('/api/appointments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: appointmentId,
              datetime: newDatetime.toISOString()
            })
          }).then(async (response) => {
            if (!response.ok) throw new Error('Failed to update')
            fetchData()
            toast.success(`Agendamento de ${apt.clientName} movido para ${newTime}`)
          }).catch(() => {
            toast.error('Erro ao mover agendamento')
          })
        }
      }
    }
  }, [appointments, fetchData])

  // Week view dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekDayStrs = weekDays.map(d => format(d, 'yyyy-MM-dd'))

  // Week view: appointments grouped by day and time slot
  const weekAppointmentsByDayAndSlot = useMemo(() => {
    const wStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const wDays = Array.from({ length: 7 }, (_, i) => addDays(wStart, i))
    const wDayStrs = wDays.map(d => format(d, 'yyyy-MM-dd'))

    const grouped: Record<string, Record<string, Appointment[]>> = {}
    wDayStrs.forEach(ds => {
      grouped[ds] = {}
      timeSlots.forEach(slot => {
        grouped[ds][slot] = []
      })
    })

    let filtered = appointments.filter(apt => wDayStrs.includes(apt.date))
    if (selectedProfessionalFilter) {
      filtered = filtered.filter(apt => apt.professionalName === selectedProfessionalFilter)
    }

    filtered.forEach(apt => {
      if (grouped[apt.date] && grouped[apt.date][apt.time]) {
        grouped[apt.date][apt.time].push(apt)
      }
    })

    return grouped
  }, [appointments, selectedDate, selectedProfessionalFilter])

  // Week appointments count
  const weekAppointmentsCount = useMemo(() => {
    const wStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const wDayStrs = Array.from({ length: 7 }, (_, i) => format(addDays(wStart, i), 'yyyy-MM-dd'))
    let filtered = appointments.filter(apt => wDayStrs.includes(apt.date))
    if (selectedProfessionalFilter) {
      filtered = filtered.filter(apt => apt.professionalName === selectedProfessionalFilter)
    }
    return filtered.length
  }, [appointments, selectedDate, selectedProfessionalFilter])

  // Loading state - only show skeleton on INITIAL load, not on refresh
  if (isLoading && isInitialLoad) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-20" />
        <div className="grid gap-4 lg:grid-cols-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-[600px] lg:col-span-3" />
        </div>
      </div>
    )
  }

  // No account state
  if (!accountId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Conta não encontrada</h2>
        <p className="text-muted-foreground">Faça login para gerenciar seus agendamentos</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Calendar className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar agendamentos</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => fetchData()}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Drag & Drop Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-blue-500/20">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Move className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Arraste e solte para reagendar
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Clique e arraste um agendamento para outro horário
              </p>
            </div>
            <Badge variant="outline" className="border-blue-500/30 text-blue-600">
              DnD Ativo
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agendamentos</h2>
          <p className="text-muted-foreground">
            {viewMode === 'week'
              ? `${weekAppointmentsCount} agendamento(s) na semana`
              : `${dayAppointments.length} agendamento(s) para ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })}`
            }
            {selectedProfessionalFilter && ` • Filtrado: ${selectedProfessionalFilter}`}
          </p>
        </div>
        
        {/* Professional Filter */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedProfessionalFilter || 'all'}
            onValueChange={(value) => setSelectedProfessionalFilter(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map((prof) => (
                <SelectItem key={prof.id} value={prof.name}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: prof.color }} />
                    {prof.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProfessionalFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProfessionalFilter(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevDay}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={handleToday}
                className="hidden sm:flex"
              >
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextDay}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {viewMode === 'week' ? (
                <div className="text-center px-4 py-2 rounded-lg">
                  <div className="text-sm text-muted-foreground">Semana</div>
                  <div className="text-lg font-bold">
                    {format(weekStart, 'd')}–{format(addDays(weekStart, 6), 'd')}
                  </div>
                  <div className="text-sm">
                    {format(weekStart, "MMM yyyy", { locale: ptBR })}
                  </div>
                </div>
              ) : (
                <div className={cn(
                  'text-center px-4 py-2 rounded-lg',
                  isToday(selectedDate) && 'bg-green-500/10 text-green-600 font-medium'
                )}>
                  <div className="text-sm text-muted-foreground">
                    {format(selectedDate, 'EEEE', { locale: ptBR })}
                  </div>
                  <div className="text-xl font-bold">
                    {format(selectedDate, 'd')}
                  </div>
                  <div className="text-sm">
                    {format(selectedDate, 'MMMM', { locale: ptBR })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-1">
              <Button 
                variant={viewMode === 'day' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Dia
              </Button>
              <Button 
                variant={viewMode === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Slots Grid with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {/* Professionals Column */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Profissionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {professionals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum profissional cadastrado
                  </p>
                ) : (
                  professionals.map((prof) => {
                    const isSelected = selectedProfessionalFilter === prof.name
                    const count = appointments
                      .filter(a => (viewMode === 'week' ? weekDayStrs.includes(a.date) : a.date === dateStr) && a.professionalName === prof.name)
                      .length
                    return (
                      <motion.button
                        key={prof.id}
                        onClick={() => setSelectedProfessionalFilter(isSelected ? null : prof.name)}
                        className={cn(
                          'w-full flex items-center gap-2 p-2 rounded-lg transition-colors',
                          isSelected 
                            ? 'bg-green-500/20 ring-2 ring-green-500/50' 
                            : 'bg-muted/50 hover:bg-muted'
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: prof.color }}
                        />
                        <span className="font-medium">{prof.name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {count}
                        </Badge>
                      </motion.button>
                    )
                  })
                )}
                {selectedProfessionalFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs"
                    onClick={() => setSelectedProfessionalFilter(null)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpar filtro
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Waitlist Manager */}
            <div className="mt-4">
              <WaitlistManager 
                professionals={professionals}
                services={services}
                selectedDate={selectedDate}
                onConvertToAppointment={(entry) => {
                  // Pre-fill the appointment dialog with waitlist data
                  setFormData({
                    clientId: '',
                    clientName: entry.clientName,
                    clientPhone: entry.clientPhone,
                    serviceId: '',
                    serviceName: entry.serviceName,
                    professionalId: entry.professionalId,
                    date: entry.preferredDate,
                    time: entry.preferredTimeStart,
                    notes: entry.notes,
                    status: 'pending',
                    isRecurring: false,
                    recurringType: 'weekly',
                    recurringCount: 4
                  })
                  setSelectedAppointment(null)
                  setIsDialogOpen(true)
                }}
              />
            </div>
          </div>

          {/* Time Slots - Day View or Week View */}
          <div className={viewMode === 'week' ? 'lg:col-span-3' : 'lg:col-span-3'}>
            {viewMode === 'day' ? (
              /* Day View */
              <Card className="border-0 shadow-md">
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="relative">
                      {/* Time column */}
                      <div className="flex">
                        <div className="w-16 flex-shrink-0 border-r border-border">
                          {timeSlots.map((slot) => (
                            <div
                              key={slot}
                              className="h-14 flex items-start justify-end pr-2 pt-1 text-xs text-muted-foreground font-mono"
                            >
                              {slot}
                            </div>
                          ))}
                        </div>

                        {/* Appointments grid with drop zones */}
                        <div className="flex-1 relative">
                          {timeSlots.map((slot) => (
                            <DroppableTimeSlot
                              key={slot}
                              slot={slot}
                              appointments={appointmentsByTimeSlot[slot] || []}
                              onEdit={handleOpenDialog}
                              onStatusChange={handleStatusChange}
                              onDelete={handleDelete}
                            />
                          ))}

                          {/* Empty State - Only show when no appointments and not dragging */}
                          {dayAppointments.length === 0 && !draggedAppointment && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                              <EmptyState 
                                type="appointments" 
                                onAction={() => handleOpenDialog()}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              /* Week View */
              <Card className="border-0 shadow-md">
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    {/* Day headers */}
                    <div className="flex sticky top-0 bg-background z-10 border-b">
                      <div className="w-14 flex-shrink-0 border-r border-border" />
                      {weekDays.map((day) => (
                        <div
                          key={format(day, 'yyyy-MM-dd')}
                          className={cn(
                            'flex-1 text-center py-2 border-r border-border/50 last:border-r-0',
                            isToday(day) && 'bg-green-500/10'
                          )}
                        >
                          <div className="text-[10px] text-muted-foreground font-medium uppercase">
                            {format(day, 'EEE', { locale: ptBR })}
                          </div>
                          <div className={cn(
                            'text-sm font-bold',
                            isToday(day) && 'text-green-600'
                          )}>
                            {format(day, 'd')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Time grid */}
                    <div className="flex">
                      {/* Time labels column */}
                      <div className="w-14 flex-shrink-0 border-r border-border">
                        {timeSlots.map((slot) => (
                          <div
                            key={slot}
                            className="h-10 flex items-start justify-end pr-1 pt-0.5 text-[10px] text-muted-foreground font-mono"
                          >
                            {slot}
                          </div>
                        ))}
                      </div>

                      {/* Day columns */}
                      {weekDays.map((day) => {
                        const dayStr = format(day, 'yyyy-MM-dd')
                        const daySlotData = weekAppointmentsByDayAndSlot[dayStr] || {}
                        const isTodayCol = isToday(day)

                        return (
                          <div
                            key={dayStr}
                            className={cn(
                              'flex-1 border-r border-border/50 last:border-r-0 relative',
                              isTodayCol && 'bg-green-500/5'
                            )}
                          >
                            {timeSlots.map((slot) => {
                              const slotApts = daySlotData[slot] || []
                              return (
                                <div
                                  key={slot}
                                  className="h-10 border-b border-border/30 relative"
                                >
                                  {slotApts.map((apt) => {
                                    const slotsNeeded = Math.ceil(apt.duration / 30)
                                    const height = slotsNeeded * 40 - 2
                                    return (
                                      <div
                                        key={apt.id}
                                        className="absolute left-0.5 right-0.5 rounded border-l-2 p-0.5 cursor-pointer shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                        style={{
                                          backgroundColor: `${apt.professionalColor}18`,
                                          borderLeftColor: apt.professionalColor,
                                          height: `${height}px`,
                                        }}
                                        onClick={() => handleOpenDialog(apt)}
                                      >
                                        <p className="text-[10px] font-medium truncate leading-tight">{apt.clientName}</p>
                                        <p className="text-[9px] text-muted-foreground truncate leading-tight">{apt.serviceName}</p>
                                        <Badge
                                          variant="outline"
                                          className={cn('text-[8px] px-0.5 py-0 h-3 mt-0.5', statusColors[apt.status])}
                                        >
                                          {statusLabels[apt.status]}
                                        </Badge>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>

                    {/* Week Empty State */}
                    {weekAppointmentsCount === 0 && (
                      <div className="flex items-center justify-center py-12">
                        <EmptyState
                          type="appointments"
                          onAction={() => handleOpenDialog()}
                        />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedAppointment && (
            <DraggableAppointmentOverlay appointment={draggedAppointment} />
          )}
        </DragOverlay>
      </DndContext>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
        className="fixed bottom-6 right-6 z-40"
      >
        <Button
          size="lg"
          className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          onClick={() => handleOpenDialog()}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* New/Edit Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do agendamento
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <Input
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Nome do cliente"
                  list="clients-list"
                />
                <datalist id="clients-list">
                  {clients.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Serviço</Label>
                <Select
                  value={formData.serviceName}
                  onValueChange={(value) => setFormData({ ...formData, serviceName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name} - R$ {s.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Profissional</Label>
                <Select
                  value={formData.professionalId}
                  onValueChange={(value) => setFormData({ ...formData, professionalId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Horário</Label>
                <Select
                  value={formData.time}
                  onValueChange={(value) => setFormData({ ...formData, time: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações do agendamento..."
              />
            </div>
            
            {/* Recurring Appointments */}
            {!selectedAppointment && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                    <RefreshCw className="w-4 h-4 text-blue-500" />
                    Agendamento Recorrente
                  </Label>
                </div>
                
                {formData.isRecurring && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-4 pl-6"
                  >
                    <div className="space-y-2">
                      <Label className="text-xs">Frequência</Label>
                      <Select
                        value={formData.recurringType}
                        onValueChange={(value) => setFormData({ ...formData, recurringType: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quinzenal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={formData.recurringCount}
                        onChange={(e) => setFormData({ ...formData, recurringCount: parseInt(e.target.value) || 4 })}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Serão criados {formData.recurringCount} agendamentos {formData.recurringType === 'weekly' ? 'semanais' : formData.recurringType === 'biweekly' ? 'quinzenais' : 'mensais'} a partir da data selecionada.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-gradient-to-r from-green-500 to-emerald-600"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
