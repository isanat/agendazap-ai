'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Star,
  Users,
  Clock,
  MapPin,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Building2,
  Award,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Competitor {
  id: string
  name: string
  distance: string
  avgPrice: number
  rating: number
  reviewCount: number
  services: number
  popularService: string
  strengths: string[]
  weaknesses: string[]
  priceComparison: 'higher' | 'lower' | 'same'
  ourAdvantages: string[]
}

const mockCompetitors: Competitor[] = [
  {
    id: '1',
    name: 'Salão Elegance',
    distance: '0.8 km',
    avgPrice: 95,
    rating: 4.6,
    reviewCount: 234,
    services: 18,
    popularService: 'Coloração',
    strengths: ['Preço competitivo', 'Boa localização', 'Horários flexíveis'],
    weaknesses: ['Poucos profissionais', 'Ambiente antigo'],
    priceComparison: 'lower',
    ourAdvantages: ['Melhor avaliação', 'Mais serviços', 'Ambiente moderno']
  },
  {
    id: '2',
    name: 'Studio Bella Hair',
    distance: '1.2 km',
    avgPrice: 120,
    rating: 4.8,
    reviewCount: 456,
    services: 25,
    popularService: 'Mechas',
    strengths: ['Alta qualidade', 'Profissionais renomados', 'Instagram forte'],
    weaknesses: ['Preço alto', 'Pouca disponibilidade'],
    priceComparison: 'higher',
    ourAdvantages: ['Preço mais acessível', 'Disponibilidade', 'Atendimento personalizado']
  },
  {
    id: '3',
    name: 'Cabelo & Cia',
    distance: '2.0 km',
    avgPrice: 75,
    rating: 4.2,
    reviewCount: 189,
    services: 12,
    popularService: 'Corte Masculino',
    strengths: ['Preço baixo', 'Rápido atendimento', 'Estacionamento'],
    weaknesses: ['Qualidade inconsistente', 'Poucos serviços femininos'],
    priceComparison: 'lower',
    ourAdvantages: ['Qualidade superior', 'Serviços completos', 'Melhor experiência']
  },
  {
    id: '4',
    name: 'Spa Beleza Total',
    distance: '3.5 km',
    avgPrice: 150,
    rating: 4.9,
    reviewCount: 678,
    services: 35,
    popularService: 'Spa Day',
    strengths: ['Serviços premium', 'Ambiente luxuoso', 'Day spa completo'],
    weaknesses: ['Muito caro', 'Longe do centro'],
    priceComparison: 'higher',
    ourAdvantages: ['Localização central', 'Preço justo', 'WhatsApp delivery']
  }
]

interface MarketPosition {
  metric: string
  us: number
  average: number
  best: number
  unit: string
}

const marketPositions: MarketPosition[] = [
  { metric: 'Preço Médio', us: 95, average: 110, best: 75, unit: 'R$' },
  { metric: 'Avaliação', us: 4.7, average: 4.5, best: 4.9, unit: '★' },
  { metric: 'Serviços', us: 22, average: 20, best: 35, unit: '' },
  { metric: 'Tempo Médio', us: 45, average: 50, best: 35, unit: 'min' }
]

interface CompetitiveInsight {
  type: 'opportunity' | 'threat' | 'strength'
  title: string
  description: string
  action?: string
}

const insights: CompetitiveInsight[] = [
  {
    type: 'opportunity',
    title: 'Gap de preço no mercado',
    description: 'Seu preço está 14% abaixo da média. Oportunidade de aumentar 10% sem perder competitividade.',
    action: 'Ver análise de preços'
  },
  {
    type: 'strength',
    title: 'Melhor custo-benefício',
    description: 'Você oferece a melhor combinação de qualidade e preço na região.',
    action: 'Destacar em marketing'
  },
  {
    type: 'threat',
    title: 'Concorrente expandindo',
    description: 'Studio Bella Hair aumentou marketing em 40%. Considere ações de retenção.',
    action: 'Ver estratégias'
  }
]

interface CompetitorAnalysisWidgetProps {
  accountId?: string | null
}

export function CompetitorAnalysisWidget({ accountId }: CompetitorAnalysisWidgetProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null)

  const ourAvgPrice = 95
  const ourRating = 4.7
  const marketAvgPrice = mockCompetitors.reduce((a, c) => a + c.avgPrice, 0) / mockCompetitors.length
  const marketAvgRating = mockCompetitors.reduce((a, c) => a + c.rating, 0) / mockCompetitors.length

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-slate-600 to-gray-800 text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Análise Competitiva</CardTitle>
              <CardDescription>{mockCompetitors.length} concorrentes monitorados</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30">
            <TrendingUp className="w-3 h-3 mr-1" />
            Posição: 2º
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Position Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Seu Preço</span>
            </div>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">R$ {ourAvgPrice}</p>
            <p className="text-xs text-green-600">Média: R$ {marketAvgPrice.toFixed(0)}</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-yellow-600">Sua Avaliação</span>
            </div>
            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{ourRating}</p>
            <p className="text-xs text-yellow-600">Média: {marketAvgRating.toFixed(1)}</p>
          </div>
        </div>

        {/* Market Position Comparison */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Posição no Mercado</p>
          <div className="space-y-2">
            {marketPositions.map((pos, index) => {
              const ourPercent = (pos.us / pos.best) * 100
              const avgPercent = (pos.average / pos.best) * 100
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{pos.metric}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-600">
                        {pos.unit === 'R$' ? 'R$ ' : ''}{pos.us}{pos.unit !== 'R$' && pos.unit ? ` ${pos.unit}` : ''}
                      </span>
                      <span className="text-muted-foreground">
                        (Média: {pos.unit === 'R$' ? 'R$ ' : ''}{pos.average})
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute h-full bg-muted-foreground/30 rounded-full"
                      style={{ width: `${Math.min(avgPercent, 100)}%` }}
                    />
                    <div 
                      className="absolute h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min(ourPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Competitors List */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Concorrentes Próximos</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {mockCompetitors.map((competitor, index) => (
              <motion.div
                key={competitor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-2 rounded-lg border transition-all cursor-pointer',
                  selectedCompetitor === competitor.id
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                    : 'bg-card hover:border-slate-200 dark:hover:border-slate-700'
                )}
                onClick={() => setSelectedCompetitor(
                  selectedCompetitor === competitor.id ? null : competitor.id
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Building2 className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{competitor.name}</p>
                      {competitor.priceComparison === 'higher' ? (
                        <ChevronUp className="w-3 h-3 text-green-500" />
                      ) : competitor.priceComparison === 'lower' ? (
                        <ChevronDown className="w-3 h-3 text-red-500" />
                      ) : (
                        <Minus className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {competitor.distance}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {competitor.rating}
                      </span>
                      <span>R$ {competitor.avgPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedCompetitor === competitor.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-2 pt-2 border-t space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Serviços</p>
                        <p className="font-medium">{competitor.services}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Mais popular</p>
                        <p className="font-medium">{competitor.popularService}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Suas vantagens:</p>
                      <div className="flex flex-wrap gap-1">
                        {competitor.ourAdvantages.map((adv, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30">
                            {adv}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Insights Competitivos</p>
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'p-2 rounded-lg border',
                insight.type === 'opportunity' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                insight.type === 'strength' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              )}
            >
              <div className="flex items-start gap-2">
                {insight.type === 'opportunity' ? (
                  <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                ) : insight.type === 'strength' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                </div>
                {insight.action && (
                  <Button variant="ghost" size="sm" className="text-xs shrink-0">
                    {insight.action}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CompetitorAnalysisMini({ accountId }: CompetitorAnalysisWidgetProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-slate-600 to-gray-800 text-white">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Concorrência</p>
          <p className="text-xs text-muted-foreground">
            2º posição • {mockCompetitors.length} monitorados
          </p>
        </div>
        <Button size="sm" variant="ghost">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
