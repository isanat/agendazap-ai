'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Zap, Target, Award, Clock, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface PerformanceWidgetProps {
  accountId?: string | null
}

interface PerformanceMetric {
  label: string
  value: number
  target: number
  unit: string
  trend: 'up' | 'down' | 'neutral'
  trendValue: string
  color: string
  icon: typeof Target
}

function CircularProgress({ value, target, color }: { value: number; target: number; color: string }) {
  const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  const colorClasses: Record<string, string> = {
    green: 'stroke-green-500',
    blue: 'stroke-blue-500',
    purple: 'stroke-purple-500'
  }
  
  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r="40"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-muted/20"
        />
        <motion.circle
          cx="48"
          cy="48"
          r="40"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          className={colorClasses[color]}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{Math.round(percentage)}%</span>
      </div>
    </div>
  )
}

export function PerformanceWidget({ accountId }: PerformanceWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const data = await response.json()
          setMetrics([
            {
              label: 'Meta Mensal',
              value: data.stats?.monthRevenue || 0,
              target: 10000,
              unit: 'R$',
              trend: data.stats?.growthRate > 0 ? 'up' : 'neutral',
              trendValue: `${data.stats?.growthRate || 0}%`,
              color: 'green',
              icon: Target
            },
            {
              label: 'Satisfação',
              value: 0,
              target: 100,
              unit: '%',
              trend: 'neutral',
              trendValue: '-',
              color: 'blue',
              icon: Award
            },
            {
              label: 'Ocupação',
              value: data.stats?.occupancyRate || 0,
              target: 85,
              unit: '%',
              trend: 'neutral',
              trendValue: '-',
              color: 'purple',
              icon: Clock
            }
          ])
        }
      } catch (error) {
        console.error('Error fetching performance:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  if (loading) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden relative">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-purple-600" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (metrics.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden relative">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-purple-600" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Sem dados</p>
            <p className="text-sm">Complete agendamentos para ver performance</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden relative">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/5 to-pink-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="w-4 h-4 text-purple-600" />
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4"
            >
              <div className={cn(
                'p-2 rounded-lg',
                metric.color === 'green' && 'bg-green-500/10',
                metric.color === 'blue' && 'bg-blue-500/10',
                metric.color === 'purple' && 'bg-purple-500/10'
              )}>
                <metric.icon className={cn(
                  'w-4 h-4',
                  metric.color === 'green' && 'text-green-600',
                  metric.color === 'blue' && 'text-blue-600',
                  metric.color === 'purple' && 'text-purple-600'
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{metric.label}</span>
                  <span className="text-sm font-bold">
                    {metric.unit === 'R$' ? `${metric.unit} ${metric.value.toLocaleString('pt-BR')}` : `${metric.value}${metric.unit}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.target > 0 ? Math.min((metric.value / metric.target) * 100, 100) : 0}%` }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                      className={cn(
                        'h-full rounded-full',
                        metric.color === 'green' && 'bg-gradient-to-r from-green-500 to-emerald-500',
                        metric.color === 'blue' && 'bg-gradient-to-r from-blue-500 to-cyan-500',
                        metric.color === 'purple' && 'bg-gradient-to-r from-purple-500 to-pink-500'
                      )}
                    />
                  </div>
                  
                  <div className={cn(
                    'flex items-center gap-0.5 text-xs font-medium',
                    metric.trend === 'up' && 'text-green-600',
                    metric.trend === 'down' && 'text-red-600',
                    metric.trend === 'neutral' && 'text-muted-foreground'
                  )}>
                    {metric.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                    {metric.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                    {metric.trend === 'neutral' && <Minus className="w-3 h-3" />}
                    {metric.trendValue}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function PerformanceOverview({ accountId }: PerformanceWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const data = await response.json()
          setMetrics([
            {
              label: 'Meta Mensal',
              value: data.stats?.monthRevenue || 0,
              target: 10000,
              unit: 'R$',
              trend: 'neutral',
              trendValue: '-',
              color: 'green',
              icon: Target
            },
            {
              label: 'Satisfação',
              value: 0,
              target: 100,
              unit: '%',
              trend: 'neutral',
              trendValue: '-',
              color: 'blue',
              icon: Award
            },
            {
              label: 'Ocupação',
              value: data.stats?.occupancyRate || 0,
              target: 85,
              unit: '%',
              trend: 'neutral',
              trendValue: '-',
              color: 'purple',
              icon: Clock
            }
          ])
        }
      } catch (error) {
        console.error('Error fetching performance overview:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  if (loading) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-amber-500" />
            Visão Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="w-4 h-4 text-amber-500" />
          Visão Geral
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-around">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <CircularProgress
                value={metric.value}
                target={metric.target}
                color={metric.color}
              />
              <span className="text-xs text-muted-foreground text-center">{metric.label}</span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
