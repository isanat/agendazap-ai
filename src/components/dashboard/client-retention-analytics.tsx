'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Heart,
  UserPlus,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Star,
  Target,
  Award,
  RefreshCw,
  ChevronRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface RetentionMetric {
  id: string
  label: string
  value: number
  change: number
  target: number
  icon: typeof Users
  color: string
}

interface ClientSegment {
  id: string
  name: string
  count: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
  color: string
  description: string
}

interface AtRiskClient {
  id: string
  name: string
  lastVisit: string
  visitsCount: number
  riskLevel: 'high' | 'medium' | 'low'
  action: string
}

interface ClientRetentionAnalyticsProps {
  accountId?: string | null
}

const metrics: RetentionMetric[] = [
  { id: 'retention', label: 'Taxa de Retenção', value: 78, change: 5, target: 85, icon: Heart, color: 'rose' },
  { id: 'loyalty', label: 'Clientes Fieis', value: 145, change: 12, target: 200, icon: Star, color: 'amber' },
  { id: 'churn', label: 'Churn Rate', value: 8, change: -2, target: 5, icon: UserMinus, color: 'red' },
  { id: 'newClients', label: 'Novos Clientes', value: 32, change: 8, target: 40, icon: UserPlus, color: 'green' }
]

const segments: ClientSegment[] = [
  { id: 'vip', name: 'VIP', count: 45, percentage: 12, trend: 'up', color: 'amber', description: '5+ visitas/mês' },
  { id: 'regular', name: 'Regulares', count: 180, percentage: 48, trend: 'stable', color: 'green', description: '2-4 visitas/mês' },
  { id: 'occasional', name: 'Ocasionais', count: 95, percentage: 25, trend: 'down', color: 'blue', description: '1 visita/mês' },
  { id: 'inactive', name: 'Inativos', count: 55, percentage: 15, trend: 'up', color: 'red', description: '30+ dias sem visita' }
]

const atRiskClients: AtRiskClient[] = [
  { id: '1', name: 'Ana Silva', lastVisit: '45 dias atrás', visitsCount: 12, riskLevel: 'high', action: 'Ligar agora' },
  { id: '2', name: 'Maria Costa', lastVisit: '32 dias atrás', visitsCount: 8, riskLevel: 'medium', action: 'Enviar WhatsApp' },
  { id: '3', name: 'Pedro Lima', lastVisit: '28 dias atrás', visitsCount: 5, riskLevel: 'low', action: 'Enviar promoção' }
]

const colorStyles = {
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600', gradient: 'from-rose-500 to-pink-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-600', gradient: 'from-red-500 to-rose-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600', gradient: 'from-green-500 to-emerald-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', gradient: 'from-blue-500 to-cyan-500' }
}

export function ClientRetentionAnalytics({ accountId }: ClientRetentionAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'metrics' | 'segments' | 'risk'>('metrics')

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timer)
  }, [accountId])

  const getRiskColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' }
      case 'medium': return { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' }
      case 'low': return { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' }
    }
  }

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500">
              <Heart className="w-4 h-4 text-white" />
            </div>
            Retenção de Clientes
          </CardTitle>
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200">
            <Sparkles className="w-3 h-3 mr-1" />
            Insights
          </Badge>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mt-3">
          {[
            { id: 'metrics', label: 'Métricas' },
            { id: 'segments', label: 'Segmentos' },
            { id: 'risk', label: 'Em Risco' }
          ].map((view) => (
            <Button
              key={view.id}
              variant={selectedView === view.id ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedView(view.id as typeof selectedView)}
            >
              {view.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedView === 'metrics' && (
              <motion.div
                key="metrics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {metrics.map((metric, index) => {
                  const Icon = metric.icon
                  const colors = colorStyles[metric.color as keyof typeof colorStyles]
                  const progress = (metric.value / metric.target) * 100

                  return (
                    <motion.div
                      key={metric.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn('p-2 rounded-lg', colors.bg)}>
                            <Icon className={cn('w-4 h-4', colors.text)} />
                          </div>
                          <span className="text-sm font-medium">{metric.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{metric.value}{metric.id !== 'loyalty' && metric.id !== 'newClients' ? '%' : ''}</span>
                          <div className={cn(
                            'flex items-center gap-0.5 text-xs',
                            metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {metric.change >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>{Math.abs(metric.change)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Meta: {metric.target}{metric.id !== 'loyalty' && metric.id !== 'newClients' ? '%' : ''}</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', colors.gradient)}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}

            {selectedView === 'segments' && (
              <motion.div
                key="segments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Donut Chart Placeholder */}
                <div className="relative h-32 flex items-center justify-center">
                  <div className="relative w-28 h-28">
                    {segments.map((segment, i) => {
                      const rotation = segments.slice(0, i).reduce((acc, s) => acc + s.percentage * 3.6, 0)
                      return (
                        <motion.div
                          key={segment.id}
                          className={cn('absolute inset-0 rounded-full', colorStyles[segment.color as keyof typeof colorStyles].bg)}
                          style={{
                            clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((segment.percentage * 3.6 * Math.PI) / 180)}% ${50 - 50 * Math.cos((segment.percentage * 3.6 * Math.PI) / 180)}%, 50% 50%)`,
                            transform: `rotate(${rotation}deg)`
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        />
                      )
                    })}
                    <div className="absolute inset-4 rounded-full bg-card flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-lg font-bold">375</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segment List */}
                <div className="space-y-2">
                  {segments.map((segment, index) => {
                    const colors = colorStyles[segment.color as keyof typeof colorStyles]

                    return (
                      <motion.div
                        key={segment.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg border hover:shadow-sm transition-all"
                      >
                        <div className={cn('w-3 h-3 rounded-full', colors.bg)} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{segment.name}</p>
                            <span className="text-xs text-muted-foreground">({segment.count})</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{segment.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{segment.percentage}%</p>
                          <div className={cn(
                            'flex items-center justify-end gap-0.5 text-[10px]',
                            segment.trend === 'up' ? 'text-green-600' : 
                            segment.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                          )}>
                            {segment.trend === 'up' && <TrendingUp className="w-2.5 h-2.5" />}
                            {segment.trend === 'down' && <TrendingDown className="w-2.5 h-2.5" />}
                            {segment.trend === 'stable' && <span>→</span>}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {selectedView === 'risk' && (
              <motion.div
                key="risk"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {atRiskClients.length} clientes em risco de churn
                  </p>
                </div>

                {atRiskClients.map((client, index) => {
                  const riskColors = getRiskColor(client.riskLevel)

                  return (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-3 rounded-lg border transition-all',
                        riskColors.border,
                        'hover:shadow-sm'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', riskColors.bg)}>
                          <UserMinus className={cn('w-4 h-4', riskColors.text)} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{client.name}</p>
                            <Badge
                              variant="outline"
                              className={cn('h-4 px-1 text-[9px]', riskColors.bg, riskColors.text)}
                            >
                              {client.riskLevel === 'high' ? 'Alto' : client.riskLevel === 'medium' ? 'Médio' : 'Baixo'}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {client.lastVisit} • {client.visitsCount} visitas
                          </p>
                        </div>
                        <Button size="sm" className="h-7 text-xs">
                          {client.action}
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  )
}

export function ClientRetentionMini({ accountId }: { accountId?: string | null }) {
  const retentionMetric = metrics[0]

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">Taxa de Retenção</span>
        <div className="flex items-center gap-1 text-green-600 text-xs">
          <TrendingUp className="w-3 h-3" />
          +{retentionMetric.change}%
        </div>
      </div>
      <p className="text-2xl font-bold text-rose-600">{retentionMetric.value}%</p>
      <div className="relative h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
          style={{ width: `${(retentionMetric.value / retentionMetric.target) * 100}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">Meta: {retentionMetric.target}%</p>
    </div>
  )
}
