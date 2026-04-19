'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Settings,
  RefreshCw,
  Sun,
  Moon,
  Coffee
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface DaySchedule {
  day: string
  date: string
  isToday: boolean
  appointments: Appointment[]
  workingHours: { start: string; end: string }
  isDayOff: boolean
}

interface Appointment {
  id: string
  time: string
  endTime: string
  client: string
  service: string
  professional: string
  professionalColor: string
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'noshow'
}

interface WeeklyScheduleOverviewProps {
  accountId?: string | null
}

const statusConfig = {
  confirmed: { icon: CheckCircle, color: 'green', label: 'Confirmado' },
  pending: { icon: Clock, color: 'amber', label: 'Pendente' },
  completed: { icon: CheckCircle, color: 'blue', label: 'Concluído' },
  cancelled: { icon: XCircle, color: 'red', label: 'Cancelado' },
  noshow: { icon: AlertCircle, color: 'rose', label: 'No-Show' }
}

const colorStyles = {
  green: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-500/10' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-500/10' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-500/10' },
  red: { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-500/10' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-500/10' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-500/10' },
  cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', light: 'bg-cyan-500/10' }
}

const generateWeekSchedule = (): DaySchedule[] => {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const today = new Date()
  const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1

  return days.map((day, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - todayIndex + index)
    
    const isDayOff = index >= 5 // Weekend
    
    return {
      day,
      date: date.getDate().toString().padStart(2, '0'),
      isToday: index === todayIndex,
      appointments: isDayOff ? [] : generateAppointments(index),
      workingHours: isDayOff ? { start: '00:00', end: '00:00' } : { start: '09:00', end: '18:00' },
      isDayOff
    }
  })
}

const generateAppointments = (dayIndex: number): Appointment[] => {
  const clients = ['Ana Silva', 'Maria Costa', 'Julia Santos', 'Pedro Lima', 'Carla Oliveira']
  const services = ['Corte Feminino', 'Coloração', 'Hidratação', 'Escova', 'Manicure']
  const professionals = [
    { name: 'Maria', color: 'green' },
    { name: 'Ana', color: 'purple' },
    { name: 'Carla', color: 'cyan' }
  ]
  const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
  const statuses: Array<'confirmed' | 'pending' | 'completed'> = ['confirmed', 'pending', 'completed']

  const numAppointments = 3 + Math.floor(Math.random() * 3)
  const appointments: Appointment[] = []

  for (let i = 0; i < numAppointments; i++) {
    const prof = professionals[Math.floor(Math.random() * professionals.length)]
    appointments.push({
      id: `${dayIndex}-${i}`,
      time: times[i],
      endTime: `${parseInt(times[i]) + 1}:00`,
      client: clients[Math.floor(Math.random() * clients.length)],
      service: services[Math.floor(Math.random() * services.length)],
      professional: prof.name,
      professionalColor: prof.color,
      status: statuses[Math.floor(Math.random() * statuses.length)]
    })
  }

  return appointments.sort((a, b) => a.time.localeCompare(b.time))
}

export function WeeklyScheduleOverview({ accountId }: WeeklyScheduleOverviewProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 600))
      setSchedule(generateWeekSchedule())
      setLoading(false)
    }
    fetchSchedule()
  }, [accountId, weekOffset])

  const totalAppointments = schedule.reduce((acc, day) => acc + day.appointments.length, 0)
  const todayAppointments = schedule.find(d => d.isToday)?.appointments.length || 0

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            Visão Semanal
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setWeekOffset(prev => prev - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setWeekOffset(prev => prev + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Week Stats */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium">{totalAppointments}</p>
              <p className="text-[10px] text-muted-foreground">Esta semana</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <Sun className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium">{todayAppointments}</p>
              <p className="text-[10px] text-muted-foreground">Hoje</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1">
              {schedule.map((day, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                  className={cn(
                    'relative p-2 rounded-lg text-center transition-all',
                    day.isToday 
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white' 
                      : selectedDay === index 
                        ? 'bg-primary/10 ring-2 ring-primary/30'
                        : 'hover:bg-muted/50',
                    day.isDayOff && !day.isToday && 'opacity-50'
                  )}
                >
                  <p className="text-[10px] font-medium opacity-80">{day.day}</p>
                  <p className="text-sm font-bold">{day.date}</p>
                  {day.appointments.length > 0 && (
                    <div className={cn(
                      'absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5',
                      day.isToday && 'opacity-80'
                    )}>
                      {day.appointments.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            day.isToday ? 'bg-white/60' : 'bg-primary/40'
                          )}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Selected Day Details */}
            <AnimatePresence mode="wait">
              {selectedDay !== null && (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {schedule[selectedDay].day}, {schedule[selectedDay].date}
                        </p>
                        {schedule[selectedDay].isDayOff && (
                          <Badge variant="outline" className="h-5 text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
                            <Coffee className="w-3 h-3 mr-1" />
                            Folga
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {schedule[selectedDay].workingHours.start} - {schedule[selectedDay].workingHours.end}
                      </span>
                    </div>

                    {schedule[selectedDay].appointments.length === 0 ? (
                      <div className="py-4 text-center">
                        <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">Nenhum agendamento</p>
                        <Button size="sm" className="h-7 text-xs mt-2">
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {schedule[selectedDay].appointments.map((apt, i) => {
                          const status = statusConfig[apt.status]
                          const StatusIcon = status.icon
                          const colors = colorStyles[status.color as keyof typeof colorStyles]
                          const profColors = colorStyles[apt.professionalColor as keyof typeof colorStyles]

                          return (
                            <motion.div
                              key={apt.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className={cn('w-1 h-10 rounded-full', profColors.bg)} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-medium truncate">{apt.client}</p>
                                  <StatusIcon className={cn('w-3 h-3', colors.text)} />
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {apt.service} • {apt.professional}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-medium">{apt.time}</p>
                                <p className="text-[10px] text-muted-foreground">{apt.endTime}</p>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Atualizar
              </Button>
              <Button size="sm" className="h-8 text-xs flex-1">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function WeeklyScheduleMini({ accountId }: { accountId?: string | null }) {
  const schedule = generateWeekSchedule()
  const today = schedule.find(d => d.isToday)
  const weekTotal = schedule.reduce((acc, d) => acc + d.appointments.length, 0)

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">Esta Semana</span>
        <Badge variant="outline" className="text-[10px]">{weekTotal} agendamentos</Badge>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {schedule.map((day, i) => (
          <div
            key={i}
            className={cn(
              'text-center p-1 rounded text-[10px]',
              day.isToday && 'bg-indigo-500 text-white'
            )}
          >
            <div className="font-medium">{day.day[0]}</div>
            <div className="font-bold">{day.date}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
