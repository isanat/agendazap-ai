'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ComparisonStat {
  label: string
  current: number
  previous: number
  prefix?: string
  suffix?: string
  icon: typeof DollarSign
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red'
}

interface StatsComparisonWidgetProps {
  accountId?: string | null
}

const stats: ComparisonStat[] = [
  {
    label: 'Faturamento',
    current: 12500,
    previous: 10200,
    prefix: 'R$ ',
    icon: DollarSign,
    color: 'green'
  },
  {
    label: 'Agendamentos',
    current: 145,
    previous: 132,
    suffix: '',
    icon: Calendar,
    color: 'blue'
  },
  {
    label: 'Novos Clientes',
    current: 28,
    previous: 35,
    suffix: '',
    icon: Users,
    color: 'purple'
  },
  {
    label: 'Taxa de Ocupação',
    current: 78,
    previous: 72,
    suffix: '%',
    icon: Target,
    color: 'orange'
  },
]

const colorClasses = {
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    gradient: 'from-green-500/20 to-green-600/10'
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-500/20 to-blue-600/10'
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-500/20 to-purple-600/10'
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    gradient: 'from-orange-500/20 to-orange-600/10'
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    gradient: 'from-red-500/20 to-red-600/10'
  },
}

function calculateChange(current: number, previous: number): { 
  value: number
  percentage: number
  trend: 'up' | 'down' | 'neutral'
} {
  if (previous === 0) {
    return { value: current, percentage: 100, trend: 'up' }
  }
  
  const change = current - previous
  const percentage = Math.round((change / previous) * 100)
  
  return {
    value: Math.abs(change),
    percentage: Math.abs(percentage),
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  }
}

export function StatsComparisonWidget({ accountId }: StatsComparisonWidgetProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  const periodLabels = {
    week: 'vs semana anterior',
    month: 'vs mês anterior',
    year: 'vs ano anterior'
  }

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            Comparativo
          </CardTitle>
          <div className="flex gap-1">
            {(['week', 'month', 'year'] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setPeriod(p)}
              >
                {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{periodLabels[period]}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {stats.map((stat, index) => {
          const change = calculateChange(stat.current, stat.previous)
          const colors = colorClasses[stat.color]
          const Icon = stat.icon

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-all group"
            >
              <div className={cn('p-2 rounded-lg shrink-0', colors.bg)}>
                <Icon className={cn('w-4 h-4', colors.text)} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {stat.prefix || ''}{stat.current.toLocaleString('pt-BR')}{stat.suffix || ''}
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  change.trend === 'up' && 'text-green-600 dark:text-green-400',
                  change.trend === 'down' && 'text-red-600 dark:text-red-400',
                  change.trend === 'neutral' && 'text-muted-foreground'
                )}>
                  {change.trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                  {change.trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                  {change.trend === 'neutral' && <Minus className="w-4 h-4" />}
                  <span>{change.percentage}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {stat.prefix || ''}{change.value.toLocaleString('pt-BR')}{stat.suffix || ''}
                </p>
              </div>
            </motion.div>
          )
        })}

        {/* Summary */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Desempenho geral</span>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
              <TrendingUp className="w-3 h-3 mr-1" />
              +18%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function MiniComparison({ accountId }: StatsComparisonWidgetProps) {
  const stat = stats[0]
  const change = calculateChange(stat.current, stat.previous)
  const colors = colorClasses[stat.color]
  const Icon = stat.icon

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className={cn('p-2 rounded-lg', colors.bg)}>
        <Icon className={cn('w-4 h-4', colors.text)} />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{stat.label}</p>
        <p className="text-lg font-semibold">
          {stat.prefix}{stat.current.toLocaleString('pt-BR')}{stat.suffix}
        </p>
      </div>
      <div className={cn(
        'flex items-center gap-1 text-sm font-medium',
        change.trend === 'up' && 'text-green-600',
        change.trend === 'down' && 'text-red-600'
      )}>
        {change.trend === 'up' && <TrendingUp className="w-4 h-4" />}
        {change.trend === 'down' && <TrendingDown className="w-4 h-4" />}
        {change.percentage}%
      </div>
    </div>
  )
}
