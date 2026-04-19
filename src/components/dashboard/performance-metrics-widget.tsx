'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, Target, Award, Star, 
  Clock, Users, DollarSign, Calendar, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface PerformanceMetric {
  id: string
  name: string
  value: number
  target: number
  unit: string
  trend: number
  trendDirection: 'up' | 'down' | 'stable'
  category: 'revenue' | 'efficiency' | 'quality' | 'growth'
}

interface WeeklyPerformance {
  day: string
  appointments: number
  revenue: number
  satisfaction: number
}

const mockMetrics: PerformanceMetric[] = [
  {
    id: '1',
    name: 'Receita Mensal',
    value: 28500,
    target: 35000,
    unit: 'R$',
    trend: 12.5,
    trendDirection: 'up',
    category: 'revenue'
  },
  {
    id: '2',
    name: 'Taxa de Ocupação',
    value: 78,
    target: 85,
    unit: '%',
    trend: 5.2,
    trendDirection: 'up',
    category: 'efficiency'
  },
  {
    id: '3',
    name: 'Satisfação do Cliente',
    value: 4.8,
    target: 4.9,
    unit: '★',
    trend: -0.1,
    trendDirection: 'down',
    category: 'quality'
  },
  {
    id: '4',
    name: 'Taxa de No-Show',
    value: 8,
    target: 5,
    unit: '%',
    trend: -2.3,
    trendDirection: 'down',
    category: 'efficiency'
  },
  {
    id: '5',
    name: 'Novos Clientes',
    value: 45,
    target: 50,
    unit: '',
    trend: 15,
    trendDirection: 'up',
    category: 'growth'
  },
  {
    id: '6',
    name: 'Ticket Médio',
    value: 95,
    target: 100,
    unit: 'R$',
    trend: 3.2,
    trendDirection: 'up',
    category: 'revenue'
  },
]

const mockWeeklyPerformance: WeeklyPerformance[] = [
  { day: 'Seg', appointments: 28, revenue: 2650, satisfaction: 4.7 },
  { day: 'Ter', appointments: 32, revenue: 3120, satisfaction: 4.8 },
  { day: 'Qua', appointments: 35, revenue: 3480, satisfaction: 4.9 },
  { day: 'Qui', appointments: 30, revenue: 2890, satisfaction: 4.8 },
  { day: 'Sex', appointments: 42, revenue: 4200, satisfaction: 4.7 },
  { day: 'Sáb', appointments: 48, revenue: 5100, satisfaction: 4.9 },
  { day: 'Dom', appointments: 15, revenue: 1420, satisfaction: 4.8 },
]

interface PerformanceMetricsWidgetProps {
  accountId?: string | null
}

export function PerformanceMetricsWidget({ accountId }: PerformanceMetricsWidgetProps) {
  const [period, setPeriod] = useState('month')
  const [category, setCategory] = useState<'all' | 'revenue' | 'efficiency' | 'quality' | 'growth'>('all')

  const filteredMetrics = category === 'all' 
    ? mockMetrics 
    : mockMetrics.filter(m => m.category === category)

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'revenue': return <DollarSign className="h-4 w-4" />
      case 'efficiency': return <Clock className="h-4 w-4" />
      case 'quality': return <Star className="h-4 w-4" />
      case 'growth': return <TrendingUp className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'revenue': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      case 'efficiency': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
      case 'quality': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      case 'growth': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <ArrowUpRight className="h-3 w-3" />
      case 'down': return <ArrowDownRight className="h-3 w-3" />
      default: return <Minus className="h-3 w-3" />
    }
  }

  const getTrendColor = (direction: string, metricName: string) => {
    // For no-show rate, down is good
    if (metricName === 'Taxa de No-Show') {
      return direction === 'down' ? 'text-green-500' : 'text-red-500'
    }
    return direction === 'up' ? 'text-green-500' : direction === 'down' ? 'text-red-500' : 'text-gray-500'
  }

  // Calculate overall score
  const avgProgress = mockMetrics.reduce((acc, m) => {
    const progress = m.unit === '%' && m.target < m.value 
      ? (m.target / m.value) * 100 
      : (m.value / m.target) * 100
    return acc + Math.min(progress, 100)
  }, 0) / mockMetrics.length

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Target className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Métricas de Performance</CardTitle>
              <CardDescription>Score geral: {avgProgress.toFixed(0)}%</CardDescription>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso Geral</span>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold">{avgProgress.toFixed(0)}%</span>
            </div>
          </div>
          <Progress value={avgProgress} className="h-2" />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'revenue', label: 'Receita' },
            { value: 'efficiency', label: 'Eficiência' },
            { value: 'quality', label: 'Qualidade' },
            { value: 'growth', label: 'Crescimento' },
          ].map((cat) => (
            <Button
              key={cat.value}
              size="sm"
              variant={category === cat.value ? 'default' : 'outline'}
              onClick={() => setCategory(cat.value as typeof category)}
              className="text-xs"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          {filteredMetrics.map((metric, index) => {
            const progress = metric.unit === '%' && metric.target < metric.value
              ? (metric.target / metric.value) * 100
              : (metric.value / metric.target) * 100
            
            return (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("p-1 rounded", getCategoryColor(metric.category))}>
                    {getCategoryIcon(metric.category)}
                  </div>
                  <div className={cn(
                    "flex items-center gap-0.5 text-xs",
                    getTrendColor(metric.trendDirection, metric.name)
                  )}>
                    {getTrendIcon(metric.trendDirection)}
                    {Math.abs(metric.trend)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{metric.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">
                    {metric.unit === 'R$' ? 'R$ ' : ''}{metric.value.toLocaleString('pt-BR')}{metric.unit !== 'R$' && metric.unit !== '' ? metric.unit : ''}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {metric.unit === 'R$' ? 'R$ ' : ''}{metric.target.toLocaleString('pt-BR')}{metric.unit !== 'R$' && metric.unit !== '' ? metric.unit : ''}</span>
                </div>
                <Progress value={Math.min(progress, 100)} className="h-1 mt-2" />
              </motion.div>
            )
          })}
        </div>

        {/* Weekly Summary */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-3">Resumo da Semana</p>
          <div className="space-y-2">
            {mockWeeklyPerformance.slice(-3).map((day, index) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-8">{day.day}</span>
                  <span className="text-xs text-muted-foreground">
                    {day.appointments} agendamentos
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-green-600">
                    R$ {day.revenue.toLocaleString('pt-BR')}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs">{day.satisfaction}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action */}
        <Button size="sm" variant="outline" className="w-full gap-1">
          <BarChart3 className="h-4 w-4" />
          Ver Relatório Completo
        </Button>
      </CardContent>
    </Card>
  )
}

export function PerformanceMetricsMini({ accountId }: PerformanceMetricsWidgetProps) {
  const avgProgress = mockMetrics.reduce((acc, m) => {
    const progress = m.unit === '%' && m.target < m.value 
      ? (m.target / m.value) * 100 
      : (m.value / m.target) * 100
    return acc + Math.min(progress, 100)
  }, 0) / mockMetrics.length

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Target className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Performance</p>
              <p className="text-xs text-muted-foreground">
                Score: {avgProgress.toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-green-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">+8.5%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
