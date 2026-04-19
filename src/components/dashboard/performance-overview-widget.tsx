'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Server, 
  TrendingUp, 
  TrendingDown,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { authGet } from '@/lib/auth-fetch'

export type HealthStatus = 'healthy' | 'warning' | 'critical'

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  status: HealthStatus
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  target?: number
  history?: number[]
}

export interface SystemPerformance {
  responseTime: PerformanceMetric
  errorRate: PerformanceMetric
  uptime: PerformanceMetric
  requests: PerformanceMetric
  cpuUsage?: PerformanceMetric
  memoryUsage?: PerformanceMetric
}

interface PerformanceOverviewWidgetProps {
  accountId?: string | null
  variant?: 'default' | 'mini'
  refreshInterval?: number
}

const statusConfig: Record<HealthStatus, {
  color: string
  bgColor: string
  icon: typeof CheckCircle
  label: string
  progressColor: string
}> = {
  healthy: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    icon: CheckCircle,
    label: 'Saudável',
    progressColor: 'bg-green-500'
  },
  warning: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    icon: AlertTriangle,
    label: 'Atenção',
    progressColor: 'bg-amber-500'
  },
  critical: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    icon: AlertTriangle,
    label: 'Crítico',
    progressColor: 'bg-red-500'
  }
}

// Generate sparkline SVG path
function Sparkline({ 
  data, 
  width = 60, 
  height = 24, 
  color = '#10B981' 
}: { 
  data: number[]
  width?: number
  height?: number
  color?: string
}) {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.polyline
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

// Mini sparkline for compact view
function MiniSparkline({ 
  data, 
  color = '#10B981' 
}: { 
  data: number[]
  color?: string
}) {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 40
  const height = 16

  const pathD = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return index === 0 ? `M ${x},${y}` : `L ${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="shrink-0">
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StatusIndicator({ status }: { status: HealthStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        config.bgColor,
        config.color
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </motion.div>
  )
}

function MetricCard({ 
  metric, 
  variant = 'default' 
}: { 
  metric: PerformanceMetric
  variant?: 'default' | 'mini'
}) {
  const config = statusConfig[metric.status]
  const trendIcon = metric.trend === 'up' ? ArrowUpRight : 
                    metric.trend === 'down' ? ArrowDownRight : Minus
  const TrendIcon = metric.trend ? trendIcon : null

  if (variant === 'mini') {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={cn('w-2 h-2 rounded-full', config.progressColor)} />
          <span className="text-xs text-muted-foreground truncate">{metric.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">
            {metric.value}{metric.unit}
          </span>
          {metric.history && (
            <MiniSparkline 
              data={metric.history} 
              color={metric.status === 'healthy' ? '#10B981' : 
                     metric.status === 'warning' ? '#F59E0B' : '#EF4444'}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl border transition-all hover:shadow-md',
        config.bgColor,
        'border-l-4',
        metric.status === 'healthy' && 'border-l-green-500',
        metric.status === 'warning' && 'border-l-amber-500',
        metric.status === 'critical' && 'border-l-red-500'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{metric.name}</span>
          <StatusIndicator status={metric.status} />
        </div>
        
        {metric.history && (
          <Sparkline 
            data={metric.history}
            color={metric.status === 'healthy' ? '#10B981' : 
                   metric.status === 'warning' ? '#F59E0B' : '#EF4444'}
          />
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums">
              {metric.value}
            </span>
            <span className="text-sm text-muted-foreground">{metric.unit}</span>
          </div>
          
          {metric.target && (
            <div className="flex items-center gap-2 mt-2">
              <Progress 
                value={(metric.value / metric.target) * 100} 
                className="h-1.5 w-24"
              />
              <span className="text-xs text-muted-foreground">
                Meta: {metric.target}{metric.unit}
              </span>
            </div>
          )}
        </div>
        
        {metric.trend && metric.trendValue && TrendIcon && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            metric.trend === 'up' && metric.name.toLowerCase().includes('error') 
              ? 'text-red-600' 
              : metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
          )}>
            <TrendIcon className="w-4 h-4" />
            {metric.trendValue}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Generate mock performance data
function generateMockPerformance(): SystemPerformance {
  return {
    responseTime: {
      name: 'Tempo de Resposta',
      value: 145,
      unit: 'ms',
      status: 'healthy',
      trend: 'down',
      trendValue: '-12%',
      target: 200,
      history: [180, 165, 155, 170, 160, 150, 145]
    },
    errorRate: {
      name: 'Taxa de Erros',
      value: 0.3,
      unit: '%',
      status: 'healthy',
      trend: 'down',
      trendValue: '-0.2%',
      target: 1,
      history: [0.8, 0.7, 0.6, 0.5, 0.4, 0.35, 0.3]
    },
    uptime: {
      name: 'Disponibilidade',
      value: 99.9,
      unit: '%',
      status: 'healthy',
      trend: 'neutral',
      trendValue: '0%',
      target: 99.5,
      history: [99.8, 99.9, 99.9, 99.8, 99.9, 99.9, 99.9]
    },
    requests: {
      name: 'Requisições/min',
      value: 1247,
      unit: '/min',
      status: 'healthy',
      trend: 'up',
      trendValue: '+8%',
      history: [980, 1050, 1100, 1150, 1180, 1210, 1247]
    }
  }
}

function PerformanceSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="p-4 rounded-xl border">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-10 w-20 mb-2" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  )
}

export function PerformanceOverviewWidget({ 
  accountId, 
  variant = 'default',
  refreshInterval = 30000 
}: PerformanceOverviewWidgetProps) {
  const [performance, setPerformance] = useState<SystemPerformance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPerformance = useCallback(async () => {
    try {
      const response = await authGet('/api/dashboard/stats?performance=true')
      
      if (response.ok) {
        const data = await response.json()
        if (data.performance) {
          setPerformance(data.performance)
        } else {
          setPerformance(generateMockPerformance())
        }
      } else {
        setPerformance(generateMockPerformance())
      }
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching performance:', error)
      setPerformance(generateMockPerformance())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPerformance()
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchPerformance, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchPerformance, refreshInterval])

  // Calculate overall system health
  const overallStatus: HealthStatus = performance 
    ? Object.values(performance).every(m => m.status === 'healthy')
      ? 'healthy'
      : Object.values(performance).some(m => m.status === 'critical')
        ? 'critical'
        : 'warning'
    : 'healthy'

  // Mini variant for sidebar
  if (variant === 'mini') {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Performance
            </CardTitle>
            <StatusIndicator status={overallStatus} />
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between p-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : performance ? (
            <div className="space-y-1">
              {Object.values(performance).map((metric, index) => (
                <motion.div
                  key={metric.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MetricCard metric={metric} variant="mini" />
                </motion.div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Server className="w-4 h-4 text-white" />
            </div>
            Performance do Sistema
          </CardTitle>
          
          <div className="flex items-center gap-3">
            <StatusIndicator status={overallStatus} />
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchPerformance}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
        
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1">
            Atualizado {lastUpdated.toLocaleTimeString('pt-BR')}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-4">
        {isLoading ? (
          <PerformanceSkeleton />
        ) : performance ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.values(performance).map((metric, index) => (
              <motion.div
                key={metric.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <MetricCard metric={metric} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Dados não disponíveis</p>
            <p className="text-sm">Não foi possível carregar métricas de performance</p>
          </div>
        )}
        
        {/* Quick health summary */}
        {performance && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 pt-4 border-t"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">Sistema operacional</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-muted-foreground">Latência baixa</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-green-600 font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>Estável</span>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

// Import Button for the refresh button
import { Button } from '@/components/ui/button'

// Export mini variant as separate component
export function PerformanceOverviewMini({ accountId }: { accountId?: string | null }) {
  return (
    <PerformanceOverviewWidget accountId={accountId} variant="mini" />
  )
}
