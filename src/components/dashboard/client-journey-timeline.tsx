'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Calendar,
  MessageSquare,
  CreditCard,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Phone,
  MapPin,
  Heart
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface JourneyStep {
  id: string
  type: 'discovery' | 'first_booking' | 'completed' | 'review' | 'return' | 'loyalty'
  title: string
  description: string
  timestamp: string
  icon: typeof Calendar
  status: 'completed' | 'current' | 'upcoming'
  details?: {
    service?: string
    professional?: string
    value?: number
    rating?: number
  }
}

interface ClientJourneyTimelineProps {
  accountId?: string | null
  clientId?: string
}

const journeyConfig = {
  discovery: {
    icon: Sparkles,
    color: 'purple',
    label: 'Descoberta'
  },
  first_booking: {
    icon: Calendar,
    color: 'blue',
    label: 'Primeiro Agendamento'
  },
  completed: {
    icon: CheckCircle,
    color: 'green',
    label: 'Serviço Realizado'
  },
  review: {
    icon: Star,
    color: 'amber',
    label: 'Avaliação'
  },
  return: {
    icon: ArrowRight,
    color: 'cyan',
    label: 'Retorno'
  },
  loyalty: {
    icon: Heart,
    color: 'rose',
    label: 'Cliente VIP'
  }
}

const colorStyles = {
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    ring: 'ring-purple-500/20',
    gradient: 'from-purple-500/20 to-violet-500/10'
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    ring: 'ring-blue-500/20',
    gradient: 'from-blue-500/20 to-cyan-500/10'
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/30',
    ring: 'ring-green-500/20',
    gradient: 'from-green-500/20 to-emerald-500/10'
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    ring: 'ring-amber-500/20',
    gradient: 'from-amber-500/20 to-yellow-500/10'
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
    ring: 'ring-cyan-500/20',
    gradient: 'from-cyan-500/20 to-teal-500/10'
  },
  rose: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    ring: 'ring-rose-500/20',
    gradient: 'from-rose-500/20 to-pink-500/10'
  }
}

const generateJourney = (): JourneyStep[] => [
  {
    id: '1',
    type: 'discovery',
    title: 'Cliente Descoberto',
    description: 'Chegou via Instagram',
    timestamp: '15 Jan 2024',
    status: 'completed',
    icon: Sparkles
  },
  {
    id: '2',
    type: 'first_booking',
    title: 'Primeiro Agendamento',
    description: 'Corte Feminino com Maria',
    timestamp: '18 Jan 2024',
    status: 'completed',
    icon: Calendar,
    details: {
      service: 'Corte Feminino',
      professional: 'Maria',
      value: 80
    }
  },
  {
    id: '3',
    type: 'completed',
    title: 'Serviço Concluído',
    description: 'Cliente satisfeita',
    timestamp: '18 Jan 2024',
    status: 'completed',
    icon: CheckCircle,
    details: {
      service: 'Corte Feminino',
      professional: 'Maria'
    }
  },
  {
    id: '4',
    type: 'review',
    title: 'Avaliação 5 Estrelas',
    description: 'Excelente atendimento!',
    timestamp: '19 Jan 2024',
    status: 'completed',
    icon: Star,
    details: {
      rating: 5
    }
  },
  {
    id: '5',
    type: 'return',
    title: 'Segunda Visita',
    description: 'Coloração + Corte',
    timestamp: '02 Fev 2024',
    status: 'completed',
    icon: ArrowRight,
    details: {
      service: 'Coloração + Corte',
      professional: 'Maria',
      value: 180
    }
  },
  {
    id: '6',
    type: 'loyalty',
    title: 'Cliente VIP',
    description: '5+ visitas, fidelidade confirmada',
    timestamp: '15 Mar 2024',
    status: 'current',
    icon: Heart
  }
]

export function ClientJourneyTimeline({ accountId, clientId }: ClientJourneyTimelineProps) {
  const [journey, setJourney] = useState<JourneyStep[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  useEffect(() => {
    const fetchJourney = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 600))
      setJourney(generateJourney())
      setLoading(false)
    }
    fetchJourney()
  }, [accountId, clientId])

  const completedSteps = journey.filter(s => s.status === 'completed').length
  const totalSteps = journey.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            Jornada do Cliente
          </CardTitle>
          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-200">
            {completedSteps}/{totalSteps} etapas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progresso da jornada</span>
            <span className="font-medium text-cyan-600">{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-blue-500/30 to-transparent" />

            {/* Journey Steps */}
            <div className="space-y-3">
              {journey.map((step, index) => {
                const config = journeyConfig[step.type]
                const colors = colorStyles[config.color as keyof typeof colorStyles]
                const Icon = step.icon
                const isExpanded = expandedStep === step.id

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.3 }}
                    className="relative pl-10"
                  >
                    {/* Timeline Node */}
                    <motion.div
                      className={cn(
                        'absolute left-0 top-1 p-2 rounded-full border-2 z-10',
                        step.status === 'completed' ? 'bg-green-500 border-green-400' :
                        step.status === 'current' ? 'bg-blue-500 border-blue-400 animate-pulse' :
                        'bg-muted border-muted-foreground/30'
                      )}
                      whileHover={{ scale: 1.2 }}
                    >
                      <Icon className={cn(
                        'w-3.5 h-3.5',
                        step.status !== 'upcoming' ? 'text-white' : 'text-muted-foreground'
                      )} />
                    </motion.div>

                    {/* Step Content */}
                    <motion.div
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        colors.border,
                        'hover:shadow-md',
                        isExpanded && 'ring-2 ring-primary/20',
                        'bg-gradient-to-r',
                        colors.gradient
                      )}
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{step.title}</p>
                            {step.status === 'current' && (
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-500/10 text-blue-600 border-blue-200">
                                Atual
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {step.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {step.timestamp}
                          </p>
                        </div>
                        <ChevronRight className={cn(
                          'w-4 h-4 text-muted-foreground shrink-0 transition-transform mt-1',
                          isExpanded && 'rotate-90'
                        )} />
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && step.details && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-border/50"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              {step.details.service && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <span>{step.details.service}</span>
                                </div>
                              )}
                              {step.details.professional && (
                                <div className="flex items-center gap-2 text-xs">
                                  <User className="w-3 h-3 text-muted-foreground" />
                                  <span>{step.details.professional}</span>
                                </div>
                              )}
                              {step.details.value && (
                                <div className="flex items-center gap-2 text-xs">
                                  <CreditCard className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-medium">R$ {step.details.value}</span>
                                </div>
                              )}
                              {step.details.rating && (
                                <div className="flex items-center gap-1 text-xs">
                                  {Array.from({ length: step.details.rating }).map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <p className="text-lg font-bold text-green-600">R$ 520</p>
            <p className="text-[10px] text-muted-foreground">Total gasto</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <p className="text-lg font-bold text-blue-600">5</p>
            <p className="text-[10px] text-muted-foreground">Visitas</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <p className="text-lg font-bold text-amber-600">4.8</p>
            <p className="text-[10px] text-muted-foreground">Avaliação</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ClientJourneyMini({ accountId }: { accountId?: string | null }) {
  const journey = generateJourney().slice(0, 3)

  return (
    <div className="space-y-2">
      {journey.map((step, index) => {
        const config = journeyConfig[step.type]
        const colors = colorStyles[config.color as keyof typeof colorStyles]
        const Icon = step.icon

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:shadow-sm transition-all',
              colors.border,
              'bg-gradient-to-r',
              colors.gradient
            )}
          >
            <div className={cn('p-1.5 rounded-full', colors.bg)}>
              <Icon className={cn('w-3.5 h-3.5', colors.text)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{step.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{step.timestamp}</p>
            </div>
            {step.status === 'completed' && (
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
