'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wand2,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Star,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  ThumbsUp,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServiceRecommendation {
  id: string
  serviceName: string
  category: string
  currentPrice: number
  suggestedPrice: number
  reason: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  trend: 'up' | 'stable' | 'down'
  monthlyBookings: number
  potentialRevenue: number
  accepted: boolean
}

const mockRecommendations: ServiceRecommendation[] = [
  {
    id: '1',
    serviceName: 'Corte Feminino',
    category: 'Corte',
    currentPrice: 80,
    suggestedPrice: 95,
    reason: 'Demanda alta nos últimos 3 meses e preço abaixo da média do mercado (R$ 92)',
    confidence: 92,
    impact: 'high',
    trend: 'up',
    monthlyBookings: 45,
    potentialRevenue: 675,
    accepted: false
  },
  {
    id: '2',
    serviceName: 'Hidratação Profunda',
    category: 'Tratamento',
    currentPrice: 120,
    suggestedPrice: 140,
    reason: 'Serviço com alta satisfação (4.9★) e margem para aumento',
    confidence: 85,
    impact: 'high',
    trend: 'up',
    monthlyBookings: 28,
    potentialRevenue: 560,
    accepted: false
  },
  {
    id: '3',
    serviceName: 'Manicure Completa',
    category: 'Unhas',
    currentPrice: 45,
    suggestedPrice: 55,
    reason: 'Baixa demanda relativa - preço pode estar afastando clientes premium',
    confidence: 68,
    impact: 'medium',
    trend: 'stable',
    monthlyBookings: 32,
    potentialRevenue: 320,
    accepted: false
  },
  {
    id: '4',
    serviceName: 'Barba Premium',
    category: 'Barba',
    currentPrice: 50,
    suggestedPrice: 45,
    reason: 'Preço acima de concorrentes. Redução pode aumentar volume em ~20%',
    confidence: 78,
    impact: 'medium',
    trend: 'down',
    monthlyBookings: 22,
    potentialRevenue: 110,
    accepted: true
  },
  {
    id: '5',
    serviceName: 'Coloração Completa',
    category: 'Coloração',
    currentPrice: 180,
    suggestedPrice: 200,
    reason: 'Serviço especializado com poucos profissionais disponíveis',
    confidence: 95,
    impact: 'high',
    trend: 'up',
    monthlyBookings: 18,
    potentialRevenue: 360,
    accepted: false
  }
]

const impactColors = {
  high: 'bg-green-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400'
}

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-green-600', label: 'Em alta' },
  stable: { icon: Clock, color: 'text-blue-600', label: 'Estável' },
  down: { icon: AlertCircle, color: 'text-red-600', label: 'Em queda' }
}

interface AIServiceRecommendationsProps {
  accountId?: string | null
}

export function AIServiceRecommendations({ accountId }: AIServiceRecommendationsProps) {
  const [recommendations, setRecommendations] = useState(mockRecommendations)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const totalPotentialRevenue = recommendations
    .filter(r => !r.accepted)
    .reduce((acc, r) => acc + r.potentialRevenue, 0)

  const acceptedCount = recommendations.filter(r => r.accepted).length

  const handleAccept = (id: string) => {
    setRecommendations(prev => prev.map(r =>
      r.id === id ? { ...r, accepted: true } : r
    ))
  }

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      setIsAnalyzing(false)
    }, 2000)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Recomendações de Serviços</CardTitle>
              <CardDescription>IA analisou seus serviços</CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isAnalyzing && 'animate-spin')} />
            Analisar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Banner */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-indigo-700 dark:text-indigo-400">Ganho potencial mensal:</span>
            </div>
            <span className="font-bold text-indigo-700 dark:text-indigo-400">
              R$ {totalPotentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Progress 
              value={(acceptedCount / recommendations.length) * 100} 
              className="h-1.5 flex-1" 
            />
            <span className="text-xs text-muted-foreground">
              {acceptedCount}/{recommendations.length} aceitas
            </span>
          </div>
        </div>

        {/* Recommendations List */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {recommendations.map((rec, index) => {
              const trendConf = trendConfig[rec.trend]
              const TrendIcon = trendConf.icon
              const priceChange = rec.suggestedPrice - rec.currentPrice
              const priceChangePercent = ((priceChange / rec.currentPrice) * 100).toFixed(0)

              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    rec.accepted
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : 'bg-card hover:border-indigo-300 dark:hover:border-indigo-700'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Service Icon */}
                    <div className={cn(
                      'p-2 rounded-lg shrink-0',
                      rec.trend === 'up' ? 'bg-green-100 dark:bg-green-900/30' :
                      rec.trend === 'down' ? 'bg-red-100 dark:bg-red-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    )}>
                      <TrendIcon className={cn('w-4 h-4', trendConf.color)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                          'font-medium text-sm',
                          rec.accepted && 'line-through text-muted-foreground'
                        )}>
                          {rec.serviceName}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {rec.category}
                        </Badge>
                        {rec.accepted && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aceita
                          </Badge>
                        )}
                      </div>
                      
                      {/* Price Change */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">De</span>
                        <span className="text-sm font-medium line-through text-muted-foreground">
                          R$ {rec.currentPrice}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className={cn(
                          'text-sm font-bold',
                          priceChange > 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          R$ {rec.suggestedPrice}
                        </span>
                        <Badge className={cn(
                          'text-xs',
                          priceChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}>
                          {priceChange > 0 ? '+' : ''}{priceChangePercent}%
                        </Badge>
                      </div>

                      {/* Reason */}
                      <p className="text-xs text-muted-foreground mb-2">
                        {rec.reason}
                      </p>

                      {/* Metrics Row */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>{rec.confidence}% confiança</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-500" />
                          <span>{rec.monthlyBookings}/mês</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-green-500" />
                          <span>+R$ {rec.potentialRevenue}/mês</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {!rec.accepted && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => handleAccept(rec.id)}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Aceitar
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Lightbulb className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-lg font-bold">{recommendations.length}</p>
            <p className="text-xs text-muted-foreground">Sugestões</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-lg font-bold">
              {recommendations.filter(r => r.trend === 'up').length}
            </p>
            <p className="text-xs text-muted-foreground">Em alta</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-lg font-bold">{acceptedCount}</p>
            <p className="text-xs text-muted-foreground">Aceitas</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AIServiceRecommendationsMini({ accountId }: AIServiceRecommendationsProps) {
  const pendingCount = mockRecommendations.filter(r => !r.accepted).length
  const highImpactCount = mockRecommendations.filter(r => !r.accepted && r.impact === 'high').length

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
          <Wand2 className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Preços IA</p>
          <p className="text-xs text-muted-foreground">
            {pendingCount} sugestões, {highImpactCount} alto impacto
          </p>
        </div>
        <Button size="sm" variant="ghost">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
