'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  AlertCircle,
  Calendar,
  Clock,
  User,
  RefreshCw,
  ChevronRight,
  X,
  CheckCircle,
  Zap,
  CalendarClock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Conflict {
  id: string
  type: 'overlap' | 'double_booking' | 'break_violation' | 'capacity'
  severity: 'critical' | 'warning' | 'info'
  professional: string
  professionalId: string
  time: string
  date: string
  clients: string[]
  description: string
  suggestion?: string
}

interface AppointmentConflictsWidgetProps {
  accountId?: string | null
}

const conflictConfig = {
  overlap: {
    label: 'Sobreposição',
    color: 'amber',
    icon: AlertTriangle
  },
  double_booking: {
    label: 'Duplo Agendamento',
    color: 'red',
    icon: AlertCircle
  },
  break_violation: {
    label: 'Intervalo Violado',
    color: 'orange',
    icon: Clock
  },
  capacity: {
    label: 'Capacidade Excedida',
    color: 'purple',
    icon: User
  }
}

const severityConfig = {
  critical: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/30',
    label: 'Crítico'
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    label: 'Atenção'
  },
  info: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    label: 'Info'
  }
}

const colorStyles = {
  red: {
    gradient: 'from-red-500 to-rose-500',
    bg: 'bg-red-500/10',
    text: 'text-red-600'
  },
  amber: {
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600'
  },
  orange: {
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-600'
  },
  purple: {
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-600'
  }
}

const generateConflicts = (): Conflict[] => [
  {
    id: '1',
    type: 'double_booking',
    severity: 'critical',
    professional: 'Maria Silva',
    professionalId: 'p1',
    time: '14:00 - 15:00',
    date: 'Hoje',
    clients: ['Ana Costa', 'Julia Santos'],
    description: 'Maria tem dois agendamentos no mesmo horário',
    suggestion: 'Reagendar Julia Santos para 15:30'
  },
  {
    id: '2',
    type: 'overlap',
    severity: 'warning',
    professional: 'Carla Mendes',
    professionalId: 'p2',
    time: '10:00 - 11:30',
    date: 'Amanhã',
    clients: ['Pedro Lima'],
    description: 'Agendamento sobrepõe o intervalo de almoço',
    suggestion: 'Mover para 11:30 ou adiantar para 09:00'
  },
  {
    id: '3',
    type: 'break_violation',
    severity: 'info',
    professional: 'Ana Paula',
    professionalId: 'p3',
    time: '18:00 - 19:30',
    date: 'Quarta',
    clients: ['Maria Oliveira'],
    description: 'Agendamento após horário de trabalho',
    suggestion: 'Verificar disponibilidade extra'
  }
]

export function AppointmentConflictsWidget({ accountId }: AppointmentConflictsWidgetProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null)
  const [resolvedConflicts, setResolvedConflicts] = useState<string[]>([])

  useEffect(() => {
    const fetchConflicts = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 800))
      setConflicts(generateConflicts())
      setLoading(false)
    }
    fetchConflicts()
  }, [accountId])

  const handleResolve = (conflictId: string) => {
    setResolvedConflicts(prev => [...prev, conflictId])
    setExpandedConflict(null)
  }

  const activeConflicts = conflicts.filter(c => !resolvedConflicts.includes(c.id))
  const criticalCount = activeConflicts.filter(c => c.severity === 'critical').length
  const warningCount = activeConflicts.filter(c => c.severity === 'warning').length

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-rose-500">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            Conflitos de Agenda
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 animate-pulse">
                {criticalCount} críticos
              </Badge>
            )}
            {activeConflicts.length === 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Sem conflitos
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : activeConflicts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center"
            >
              <CheckCircle className="w-8 h-8 text-green-500" />
            </motion.div>
            <p className="text-sm font-medium text-green-600">Nenhum conflito detectado!</p>
            <p className="text-xs text-muted-foreground mt-1">Sua agenda está organizada</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {activeConflicts.map((conflict, index) => {
                const config = conflictConfig[conflict.type]
                const colors = colorStyles[config.color as keyof typeof colorStyles]
                const severity = severityConfig[conflict.severity]
                const Icon = config.icon
                const isExpanded = expandedConflict === conflict.id

                return (
                  <motion.div
                    key={conflict.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    className={cn(
                      'relative overflow-hidden rounded-lg border transition-all cursor-pointer',
                      severity.border,
                      'hover:shadow-md',
                      isExpanded && 'ring-2 ring-primary/20'
                    )}
                    onClick={() => setExpandedConflict(isExpanded ? null : conflict.id)}
                  >
                    <div className={cn('absolute inset-0 bg-gradient-to-r opacity-30', colors.gradient)} />

                    <div className="relative p-3">
                      <div className="flex items-start gap-3">
                        {/* Severity Indicator */}
                        <motion.div
                          className={cn('p-2 rounded-lg shrink-0', severity.bg)}
                          whileHover={{ scale: 1.1 }}
                        >
                          <Icon className={cn('w-4 h-4', severity.text)} />
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{config.label}</p>
                            <Badge
                              variant="outline"
                              className={cn(
                                'h-4 px-1 text-[9px]',
                                severity.bg,
                                severity.text
                              )}
                            >
                              {severity.label}
                            </Badge>
                            <Badge variant="outline" className="h-4 px-1 text-[9px]">
                              {conflict.date}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground mt-1">
                            {conflict.professional} • {conflict.time}
                          </p>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3 space-y-2"
                              >
                                <p className="text-xs">{conflict.description}</p>

                                {/* Clients */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground">Clientes:</span>
                                  {conflict.clients.map((client, i) => (
                                    <Badge key={i} variant="outline" className="h-5 px-1.5 text-[10px]">
                                      {client}
                                    </Badge>
                                  ))}
                                </div>

                                {/* Suggestion */}
                                {conflict.suggestion && (
                                  <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground">
                                      {conflict.suggestion}
                                    </p>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleResolve(conflict.id)
                                    }}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Resolver
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setExpandedConflict(null)
                                    }}
                                  >
                                    Ignorar
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <ChevronRight className={cn(
                          'w-4 h-4 text-muted-foreground shrink-0 transition-transform',
                          isExpanded && 'rotate-90'
                        )} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Quick Actions */}
        {activeConflicts.length > 0 && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Verificar Novamente
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
              <CalendarClock className="w-3.5 h-3.5 mr-1" />
              Ver Agenda
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AppointmentConflictsMini({ accountId }: { accountId?: string | null }) {
  const conflicts = generateConflicts()
  const criticalCount = conflicts.filter(c => c.severity === 'critical').length

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border',
      criticalCount > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'
    )}>
      <div className={cn(
        'p-2 rounded-lg',
        criticalCount > 0 ? 'bg-red-500/10' : 'bg-green-500/10'
      )}>
        {criticalCount > 0 ? (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">
          {criticalCount > 0 ? `${criticalCount} conflitos detectados` : 'Agenda sem conflitos'}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {criticalCount > 0 ? 'Requer atenção' : 'Tudo em ordem'}
        </p>
      </div>
      {criticalCount > 0 && (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
          {criticalCount}
        </Badge>
      )}
    </div>
  )
}
