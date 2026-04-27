'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Clock,
  Calendar,
  Coffee,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Briefcase,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, isToday, isWeekend, parseISO, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface StaffMember {
  id: string
  name: string
  avatar?: string
  role: string
  color: string
}

interface ScheduleSlot {
  start: string
  end: string
  available: boolean
  appointmentCount: number
}

interface StaffSchedule {
  staffId: string
  date: string
  slots: ScheduleSlot[]
  isWorking: boolean
  notes?: string
}

const mockStaff: StaffMember[] = [
  { id: '1', name: 'Ana Silva', role: 'Cabeleireira', color: '#10B981', avatar: '' },
  { id: '2', name: 'Carlos Santos', role: 'Barbeiro', color: '#3B82F6', avatar: '' },
  { id: '3', name: 'Maria Costa', role: 'Manicure', color: '#8B5CF6', avatar: '' },
  { id: '4', name: 'Pedro Lima', role: 'Cabeleireiro', color: '#F59E0B', avatar: '' },
  { id: '5', name: 'Julia Ferreira', role: 'Esteticista', color: '#EC4899', avatar: '' }
]

const generateSchedule = (staffId: string, date: Date): StaffSchedule => {
  const dateStr = date.toISOString().split('T')[0]
  const isWeekendDay = isWeekend(date)
  
  // Simulate some days off
  const isDayOff = Math.random() > 0.85 || (staffId === '5' && isWeekendDay)
  
  const slots: ScheduleSlot[] = isDayOff ? [] : [
    { start: '08:00', end: '10:00', available: Math.random() > 0.3, appointmentCount: Math.floor(Math.random() * 3) },
    { start: '10:00', end: '12:00', available: Math.random() > 0.5, appointmentCount: Math.floor(Math.random() * 3) },
    { start: '12:00', end: '14:00', available: true, appointmentCount: 0 }, // Lunch
    { start: '14:00', end: '16:00', available: Math.random() > 0.4, appointmentCount: Math.floor(Math.random() * 3) },
    { start: '16:00', end: '18:00', available: Math.random() > 0.6, appointmentCount: Math.floor(Math.random() * 3) },
    { start: '18:00', end: '20:00', available: Math.random() > 0.7, appointmentCount: Math.floor(Math.random() * 2) }
  ]

  return {
    staffId,
    date: dateStr,
    slots,
    isWorking: !isDayOff,
    notes: isDayOff ? 'Folga' : undefined
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface StaffScheduleWidgetProps {
  accountId?: string | null
}

export function StaffScheduleWidget({ accountId }: StaffScheduleWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)

  const schedules = mockStaff.map(staff => generateSchedule(staff.id, currentDate))
  
  const workingToday = schedules.filter(s => s.isWorking).length
  const totalAppointments = schedules.reduce((acc, s) => 
    acc + s.slots.reduce((slotAcc, slot) => slotAcc + slot.appointmentCount, 0), 0
  )

  const prevDay = () => setCurrentDate(d => addDays(d, -1))
  const nextDay = () => setCurrentDate(d => addDays(d, 1))
  const goToToday = () => setCurrentDate(new Date())

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Escala da Equipe</CardTitle>
              <CardDescription>{workingToday} trabalhando hoje</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Briefcase className="w-3 h-3 mr-1" />
            {totalAppointments} atendimentos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
            {!isToday(currentDate) && (
              <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
                Hoje
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={nextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Staff List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {mockStaff.map((staff, index) => {
              const schedule = schedules.find(s => s.staffId === staff.id)
              const isSelected = selectedStaff === staff.id
              const availableSlots = schedule?.slots.filter(s => s.available).length || 0
              const totalSlots = schedule?.slots.length || 0

              return (
                <motion.div
                  key={staff.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-3 rounded-lg border transition-all cursor-pointer',
                    schedule?.isWorking
                      ? 'bg-card hover:border-blue-300 dark:hover:border-blue-700'
                      : 'bg-muted/50',
                    isSelected && 'border-blue-400 dark:border-blue-600'
                  )}
                  onClick={() => setSelectedStaff(isSelected ? null : staff.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={staff.avatar} />
                        <AvatarFallback style={{ backgroundColor: staff.color + '20', color: staff.color }}>
                          {getInitials(staff.name)}
                        </AvatarFallback>
                      </Avatar>
                      {schedule?.isWorking ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                      ) : (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-400 rounded-full border-2 border-white dark:border-gray-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{staff.name}</h4>
                        {!schedule?.isWorking && (
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600">
                            <Coffee className="w-3 h-3 mr-1" />
                            Folga
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{staff.role}</p>
                    </div>
                    
                    {schedule?.isWorking && (
                      <div className="text-right">
                        <p className="text-sm font-medium">{availableSlots}/{totalSlots}</p>
                        <p className="text-xs text-muted-foreground">horários livres</p>
                      </div>
                    )}
                  </div>

                  {/* Expanded Schedule View */}
                  {isSelected && schedule?.isWorking && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 pt-3 border-t"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        {schedule.slots.map((slot, i) => (
                          <div
                            key={i}
                            className={cn(
                              'p-2 rounded text-center text-xs',
                              slot.available
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            )}
                          >
                            <div className="font-medium">{slot.start}</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              {slot.available ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {slot.appointmentCount > 0 && slot.appointmentCount}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Summary Footer */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{workingToday}</p>
            <p className="text-xs text-muted-foreground">Trabalhando</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-500">{mockStaff.length - workingToday}</p>
            <p className="text-xs text-muted-foreground">De folga</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{totalAppointments}</p>
            <p className="text-xs text-muted-foreground">Atendimentos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StaffScheduleMini({ accountId }: StaffScheduleWidgetProps) {
  const workingToday = mockStaff.filter(() => Math.random() > 0.15).length

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <Users className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Escala</p>
          <p className="text-xs text-muted-foreground">
            {workingToday} de {mockStaff.length} trabalhando
          </p>
        </div>
        <Button size="sm" variant="ghost">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
