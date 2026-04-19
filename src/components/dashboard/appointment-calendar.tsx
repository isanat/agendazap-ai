'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getStoredAccountId } from '@/hooks/use-data'
import { authFetch } from '@/lib/auth-fetch'

interface AppointmentCalendarProps {
  onDateSelect?: (date: Date) => void
  selectedDate?: Date
}

interface DayAppointments {
  count: number
  hasNoShow: boolean
}

export function AppointmentCalendar({ onDateSelect, selectedDate }: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(selectedDate || null)
  const [appointmentsByDate, setAppointmentsByDate] = useState<Record<string, DayAppointments>>({})
  const [isLoading, setIsLoading] = useState(true)

  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = getStoredAccountId()
    setAccountId(id)
  }, [])

  const fetchAppointments = useCallback(async () => {
    if (!accountId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      // Fetch appointments for the current month
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      
      const response = await authFetch(
        `/api/appointments?accountId=${accountId}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch appointments')
      
      const data = await response.json()
      
      // Group appointments by date
      const grouped: Record<string, DayAppointments> = {}
      
      ;(data.appointments || []).forEach((apt: any) => {
        const dateKey = format(new Date(apt.datetime), 'yyyy-MM-dd')
        if (!grouped[dateKey]) {
          grouped[dateKey] = { count: 0, hasNoShow: false }
        }
        grouped[dateKey].count++
        if (apt.status === 'no_show') {
          grouped[dateKey].hasNoShow = true
        }
      })
      
      setAppointmentsByDate(grouped)
    } catch (err) {
      console.error('Error fetching appointments:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accountId, currentDate])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get the day of week for the first day (0 = Sunday)
  const startDay = monthStart.getDay()
  
  // Add padding days from previous month
  const paddingDays = Array(startDay).fill(null)

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const handleDayClick = (day: Date) => {
    setSelected(day)
    onDateSelect?.(day)
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  if (!accountId) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Faça login para ver seus agendamentos</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array(35).fill(null).map((_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        ) : (
          /* Calendar grid */
          <div className="grid grid-cols-7 gap-1">
            {/* Padding days */}
            {paddingDays.map((_, index) => (
              <div key={`padding-${index}`} className="h-20" />
            ))}
            
            {/* Actual days */}
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const appointment = appointmentsByDate[dateKey]
              const isSelected = selected && isSameDay(day, selected)
              const isCurrentDay = isToday(day)

              return (
                <button
                  key={dateKey}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'h-20 p-1 rounded-lg text-left transition-colors border border-transparent',
                    'hover:bg-accent hover:border-border',
                    isSelected && 'bg-green-500/10 border-green-500',
                    isCurrentDay && !isSelected && 'bg-blue-500/10 border-blue-500'
                  )}
                >
                  <div className={cn(
                    'text-sm font-medium',
                    isCurrentDay && 'text-blue-600'
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  {appointment && (
                    <div className="mt-1">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          'text-xs px-1 py-0 h-5',
                          appointment.hasNoShow && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {appointment.count} apt
                      </Badge>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Selecionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">Hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Com no-show</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
