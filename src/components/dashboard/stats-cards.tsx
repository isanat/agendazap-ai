'use client'

import { motion } from 'framer-motion'
import {
  Calendar,
  DollarSign,
  TrendingDown,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  ArrowUpRight,
  Info,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface DashboardStats {
  todayAppointments: number
  weekAppointments: number
  monthAppointments: number
  monthRevenue: number
  noShowRate: number
  lostRevenue: number
  occupancyRate: number
  totalClients: number
  growthRate: number
  recoveredRevenue: number
}

interface TodayAppointment {
  id: string
  time: string
  client: string
  service: string
  professional: string
  status: string
}

interface StatsCardsProps {
  accountId?: string | null
  onNavigate?: (page: string) => void
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1000
    const steps = 20
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  return <span>{prefix}{displayValue.toLocaleString('pt-BR')}{suffix}</span>
}

export function StatsCards({ accountId, onNavigate }: StatsCardsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    if (!accountId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [accountId])

  // If no data, show empty state
  const isEmpty = !loading && !stats

  const cards = [
    {
      title: 'Agendamentos Hoje',
      value: stats?.todayAppointments ?? 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      change: stats?.growthRate ? `${stats.growthRate > 0 ? '+' : ''}${stats.growthRate}%` : '-',
      changeType: (stats?.growthRate ?? 0) >= 0 ? 'positive' as const : 'negative' as const,
      gradient: 'from-blue-500/20 to-blue-600/10',
      link: 'appointments',
      tooltip: 'Clique para ver todos os agendamentos de hoje'
    },
    {
      title: 'Agendamentos na Semana',
      value: stats?.weekAppointments ?? 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      change: '-',
      changeType: 'neutral' as const,
      gradient: 'from-purple-500/20 to-purple-600/10',
      link: 'appointments',
      tooltip: 'Clique para ver agendamentos da semana'
    },
    {
      title: 'Faturamento do Mês',
      value: `R$ ${(stats?.monthRevenue ?? 0).toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      change: '-',
      changeType: 'neutral' as const,
      gradient: 'from-green-500/20 to-green-600/10',
      link: 'reports',
      tooltip: 'Clique para ver relatório financeiro detalhado'
    },
    {
      title: 'Taxa de No-Show',
      value: `${stats?.noShowRate ?? 0}%`,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
      change: '-',
      changeType: 'neutral' as const,
      description: 'Taxa geral',
      gradient: 'from-orange-500/20 to-orange-600/10',
      link: 'noshow',
      tooltip: 'Clique para gerenciar taxas de no-show'
    },
    {
      title: 'Lucro Perdido (No-Show)',
      value: `R$ ${(stats?.lostRevenue ?? 0).toLocaleString('pt-BR')}`,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
      change: 'Este mês',
      changeType: 'neutral' as const,
      gradient: 'from-red-500/20 to-red-600/10',
      link: 'reports',
      tooltip: 'Clique para ver análise de perdas'
    },
    {
      title: 'Taxa de Ocupação',
      value: `${stats?.occupancyRate ?? 0}%`,
      icon: Clock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      change: '-',
      changeType: 'neutral' as const,
      gradient: 'from-emerald-500/20 to-emerald-600/10',
      link: 'reports',
      tooltip: 'Clique para ver relatório de ocupação'
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Estatísticas</h2>
        <Button variant="ghost" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.08, duration: 0.4, type: "spring", stiffness: 100 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className={cn(
                    'overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer',
                    'border-0 shadow-lg relative'
                  )}
                  onClick={() => onNavigate?.(card.link)}
                >
                  <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity', card.gradient)} />
                  <CardHeader className="relative flex flex-row items-center justify-between pb-2 pt-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      {card.title}
                      <Info className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </CardTitle>
                    <motion.div
                      className={cn('p-2.5 rounded-xl shadow-sm', card.bgColor)}
                      whileHover={{ scale: 1.15, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <card.icon className={cn('w-5 h-5', card.color)} />
                    </motion.div>
                  </CardHeader>
                  <CardContent className="relative pb-4">
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold tracking-tight">
                        {loading ? '-' : card.value}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className={cn(
                      'text-xs mt-1.5 flex items-center gap-1',
                      card.changeType === 'positive' && 'text-green-600 dark:text-green-400',
                      card.changeType === 'negative' && 'text-red-600 dark:text-red-400',
                      card.changeType === 'neutral' && 'text-muted-foreground'
                    )}>
                      {card.changeType === 'positive' && <TrendingUp className="w-3.5 h-3.5" />}
                      {card.changeType === 'negative' && <TrendingDown className="w-3.5 h-3.5" />}
                      <span className="font-medium">{card.change}</span>
                      <span className="text-muted-foreground">{card.description || (card.changeType !== 'neutral' ? 'vs mês anterior' : '')}</span>
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900">
                <p>{card.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function TodaySchedule({ accountId }: { accountId?: string | null }) {
  const [appointments, setAppointments] = useState<TodayAppointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const data = await response.json()
          setAppointments(data.todayAppointments || [])
        }
      } catch (error) {
        console.error('Error fetching appointments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [accountId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'no_show':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20'
      case 'pending':
        return 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20'
      case 'completed':
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
      case 'no_show':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
      default:
        return 'border-l-gray-500'
    }
  }

  return (
    <Card className="border-0 shadow-md h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Agendamentos de Hoje
          </CardTitle>
          <span className="text-sm text-muted-foreground">{appointments.length} agendamentos</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">Nenhum agendamento hoje</p>
            <p className="text-sm">Os agendamentos aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
            {appointments.map((apt, index) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-lg border-l-4 transition-all',
                  'hover:shadow-md cursor-pointer',
                  getStatusColor(apt.status)
                )}
              >
                <div className="text-sm font-mono text-muted-foreground w-14 font-medium">
                  {apt.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{apt.client}</p>
                  <p className="text-xs text-muted-foreground">
                    {apt.service} • {apt.professional}
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {getStatusIcon(apt.status)}
                </motion.div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function QuickStats({ accountId }: { accountId?: string | null }) {
  const [recoveredRevenue, setRecoveredRevenue] = useState(0)
  const [totalClients, setTotalClients] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const data = await response.json()
          setRecoveredRevenue(data.stats?.recoveredRevenue || 0)
          setTotalClients(data.stats?.totalClients || 0)
        }
      } catch (error) {
        console.error('Error fetching quick stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [accountId])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-white/90 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Receita Recuperada
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tabular-nums">
              {loading ? (
                <span className="opacity-50">...</span>
              ) : (
                `R$ ${recoveredRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-sm text-white/80 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Taxas de no-show cobradas
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-white/90 text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tabular-nums">
              {loading ? (
                <span className="opacity-50">...</span>
              ) : (
                totalClients.toLocaleString('pt-BR')
              )}
            </div>
            <p className="text-sm text-white/80 mt-1 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Clientes cadastrados
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
