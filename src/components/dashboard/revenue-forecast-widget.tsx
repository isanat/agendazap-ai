'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  ChevronRight,
  RefreshCw,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ForecastData {
  period: string
  predicted: number
  confidence: number
  trend: 'up' | 'down' | 'stable'
  changePercent: number
}

interface RevenueForecastWidgetProps {
  accountId?: string | null
}

const generateForecast = (): ForecastData[] => [
  { period: 'Esta Semana', predicted: 4850, confidence: 92, trend: 'up', changePercent: 12 },
  { period: 'Próxima Semana', predicted: 5200, confidence: 78, trend: 'up', changePercent: 7 },
  { period: 'Este Mês', predicted: 18200, confidence: 85, trend: 'up', changePercent: 15 },
  { period: 'Próximo Mês', predicted: 21000, confidence: 62, trend: 'up', changePercent: 8 }
]

const growthFactors = [
  { name: 'Agendamentos Recorrentes', impact: '+R$ 3.200', positive: true },
  { name: 'Novos Clientes', impact: '+R$ 1.800', positive: true },
  { name: 'Pacotes Vendidos', impact: '+R$ 950', positive: true },
  { name: 'Risco de Cancelamentos', impact: '-R$ 400', positive: false },
  { name: 'No-Show Estimado', impact: '-R$ 250', positive: false }
]

export function RevenueForecastWidget({ accountId }: RevenueForecastWidgetProps) {
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'forecast' | 'factors'>('forecast')
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 700))
      setForecasts(generateForecast())
      setLoading(false)
    }
    fetchForecast()
  }, [accountId])

  const totalPredicted = forecasts.reduce((acc, f) => f.period.includes('Mês') ? acc + f.predicted : acc, 0)
  const avgConfidence = forecasts.length > 0 
    ? Math.round(forecasts.reduce((acc, f) => acc + f.confidence, 0) / forecasts.length)
    : 0

  const positiveFactors = growthFactors.filter(f => f.positive)
  const negativeFactors = growthFactors.filter(f => !f.positive)
  const totalPositive = positiveFactors.reduce((acc, f) => acc + parseFloat(f.impact.replace(/[^\d]/g, '')), 0)
  const totalNegative = negativeFactors.reduce((acc, f) => acc + parseFloat(f.impact.replace(/[^\d]/g, '')), 0)

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            Previsão de Receita
          </CardTitle>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
            <Sparkles className="w-3 h-3 mr-1" />
            IA
          </Badge>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={viewMode === 'forecast' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setViewMode('forecast')}
          >
            Previsão
          </Button>
          <Button
            variant={viewMode === 'factors' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setViewMode('factors')}
          >
            Fatores
          </Button>
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
        ) : viewMode === 'forecast' ? (
          /* Forecast View */
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20">
                <p className="text-xs text-muted-foreground mb-1">Previsão Mensal</p>
                <p className="text-xl font-bold text-emerald-600">
                  R$ {totalPredicted.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] text-green-600">+15% vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
                <p className="text-xs text-muted-foreground mb-1">Confiança</p>
                <p className="text-xl font-bold text-blue-600">{avgConfidence}%</p>
                <div className="relative h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${avgConfidence}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            </div>

            {/* Forecast Cards */}
            {forecasts.map((forecast, index) => (
              <motion.div
                key={forecast.period}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-3 rounded-lg border transition-all cursor-pointer',
                  selectedPeriod === forecast.period ? 'ring-2 ring-primary/20 border-primary/30' : 'hover:shadow-sm'
                )}
                onClick={() => setSelectedPeriod(selectedPeriod === forecast.period ? null : forecast.period)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{forecast.period}</p>
                    <p className="text-xs text-muted-foreground">
                      Confiança: {forecast.confidence}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      R$ {forecast.predicted.toLocaleString()}
                    </p>
                    <div className={cn(
                      'flex items-center justify-end gap-1 text-xs',
                      forecast.trend === 'up' ? 'text-green-600' : 
                      forecast.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                    )}>
                      {forecast.trend === 'up' ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : forecast.trend === 'down' ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <span>→</span>
                      )}
                      <span>{forecast.changePercent > 0 ? '+' : ''}{forecast.changePercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Confidence Bar */}
                <AnimatePresence>
                  {selectedPeriod === forecast.period && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3"
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Nível de confiança</span>
                        <span className="font-medium">{forecast.confidence}%</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={cn(
                            'absolute inset-y-0 left-0 rounded-full',
                            forecast.confidence >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            forecast.confidence >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                            'bg-gradient-to-r from-red-500 to-rose-500'
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${forecast.confidence}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Baseado em dados históricos e tendências de mercado
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Factors View */
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-lg font-bold text-green-600">+R$ {totalPositive.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Fatores Positivos</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-lg font-bold text-red-600">-R$ {totalNegative.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Fatores Negativos</p>
              </div>
            </div>

            {/* Positive Factors */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Impulsionadores
              </p>
              {positiveFactors.map((factor, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-green-500/5 border border-green-500/10"
                >
                  <span className="text-xs">{factor.name}</span>
                  <span className="text-xs font-medium text-green-600">{factor.impact}</span>
                </motion.div>
              ))}
            </div>

            {/* Negative Factors */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                Riscos
              </p>
              {negativeFactors.map((factor, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10"
                >
                  <span className="text-xs">{factor.name}</span>
                  <span className="text-xs font-medium text-red-600">{factor.impact}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Atualizado há 5 minutos
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">
            <RefreshCw className="w-3 h-3 mr-1" />
            Atualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function RevenueForecastMini({ accountId }: { accountId?: string | null }) {
  const forecasts = generateForecast()
  const monthly = forecasts.find(f => f.period === 'Este Mês')

  return (
    <div className="p-3 rounded-lg border bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-medium">Previsão do Mês</span>
        </div>
        <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
          IA
        </Badge>
      </div>
      <p className="text-lg font-bold text-emerald-600">
        R$ {monthly?.predicted.toLocaleString()}
      </p>
      <div className="flex items-center gap-1 mt-1">
        <ArrowUpRight className="w-3 h-3 text-green-500" />
        <span className="text-[10px] text-green-600">+{monthly?.changePercent}% vs anterior</span>
      </div>
    </div>
  )
}
