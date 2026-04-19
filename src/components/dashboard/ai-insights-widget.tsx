'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  DollarSign,
  Users,
  Calendar,
  Zap,
  ChevronRight,
  RefreshCw,
  Brain,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Insight {
  id: string
  type: 'opportunity' | 'warning' | 'success' | 'tip'
  title: string
  description: string
  impact?: string
  action?: string
  priority: 'high' | 'medium' | 'low'
  category: 'revenue' | 'retention' | 'efficiency' | 'growth'
}

interface AIInsightsWidgetProps {
  accountId?: string | null
}

const insightIcons = {
  opportunity: TrendingUp,
  warning: AlertTriangle,
  success: Target,
  tip: Lightbulb,
}

const insightColors = {
  opportunity: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/30',
    gradient: 'from-green-500/20 to-green-600/10'
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    gradient: 'from-amber-500/20 to-amber-600/10'
  },
  success: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    gradient: 'from-blue-500/20 to-blue-600/10'
  },
  tip: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    gradient: 'from-purple-500/20 to-purple-600/10'
  },
}

const categoryIcons = {
  revenue: DollarSign,
  retention: Users,
  efficiency: Zap,
  growth: BarChart3,
}

// Simulated AI insights for demo
const generateInsights = (): Insight[] => [
  {
    id: '1',
    type: 'opportunity',
    title: 'Potencial de Receita Identificado',
    description: '3 clientes não retornaram há mais de 30 dias. Entre em contato para reagendar.',
    impact: '+R$ 450/mês potencial',
    action: 'Enviar campanha',
    priority: 'high',
    category: 'revenue'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Alta Taxa de No-Show',
    description: 'A taxa de no-show desta semana está 15% acima da média. Considere cobrar taxa antecipada.',
    impact: 'R$ 200 perdidos esta semana',
    action: 'Configurar taxa',
    priority: 'high',
    category: 'efficiency'
  },
  {
    id: '3',
    type: 'tip',
    title: 'Horário com Baixa Ocupação',
    description: 'Terças-feiras às 14h-16h têm apenas 20% de ocupação. Considere promoções.',
    impact: '+R$ 300/mês potencial',
    action: 'Criar promoção',
    priority: 'medium',
    category: 'growth'
  },
  {
    id: '4',
    type: 'success',
    title: 'Cliente VIP Prestes a Mudar',
    description: 'Ana Silva (top 5 clientes) não agendou há 3 semanas. Ação recomendada.',
    impact: 'R$ 800 valor de vida',
    action: 'Contatar agora',
    priority: 'high',
    category: 'retention'
  },
  {
    id: '5',
    type: 'opportunity',
    title: 'Serviço em Alta',
    description: 'Hidratação teve 40% mais demanda este mês. Considere adicionar mais horários.',
    impact: '+R$ 600/mês potencial',
    action: 'Ver horários',
    priority: 'medium',
    category: 'growth'
  },
]

export function AIInsightsWidget({ accountId }: AIInsightsWidgetProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))
      setInsights(generateInsights())
      setLoading(false)
    }
    fetchInsights()
  }, [accountId])

  const handleRefresh = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    setInsights(generateInsights())
    setLoading(false)
  }

  const filteredInsights = selectedCategory
    ? insights.filter(i => i.category === selectedCategory)
    : insights

  const highPriorityCount = insights.filter(i => i.priority === 'high').length
  const categories = [...new Set(insights.map(i => i.category))]

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Brain className="w-4 h-4 text-white" />
            </div>
            Insights da IA
          </CardTitle>
          <div className="flex items-center gap-2">
            {highPriorityCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                {highPriorityCount} urgentes
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map(cat => {
            const Icon = categoryIcons[cat]
            return (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs shrink-0 gap-1"
                onClick={() => setSelectedCategory(cat)}
              >
                <Icon className="w-3 h-3" />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filteredInsights.map((insight, index) => {
                const Icon = insightIcons[insight.type]
                const colors = insightColors[insight.type]
                const isExpanded = expandedInsight === insight.id

                return (
                  <motion.div
                    key={insight.id}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    className={cn(
                      'relative overflow-hidden rounded-lg border transition-all cursor-pointer',
                      colors.border,
                      'hover:shadow-md',
                      isExpanded && 'ring-2 ring-primary/20'
                    )}
                    onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                  >
                    <div className={cn('absolute inset-0 bg-gradient-to-r opacity-50', colors.gradient)} />
                    
                    <div className="relative p-3">
                      <div className="flex items-start gap-3">
                        <motion.div
                          className={cn('p-2 rounded-lg shrink-0', colors.bg)}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <Icon className={cn('w-4 h-4', colors.text)} />
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{insight.title}</p>
                            {insight.priority === 'high' && (
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-red-500/10 text-red-600 border-red-200">
                                Urgente
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {insight.description}
                          </p>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3 space-y-2"
                              >
                                {insight.impact && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                      {insight.impact}
                                    </span>
                                  </div>
                                )}

                                {insight.action && (
                                  <Button size="sm" className="h-7 text-xs w-full">
                                    {insight.action}
                                    <ChevronRight className="w-3 h-3 ml-1" />
                                  </Button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <ChevronRight className={cn(
                          'w-4 h-4 text-muted-foreground shrink-0 transition-transform',
                          isExpanded && 'rotate-90'
                        )} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  )
}

export function AIInsightsMini({ accountId }: { accountId?: string | null }) {
  const [insights] = useState<Insight[]>(generateInsights().slice(0, 2))

  return (
    <div className="space-y-2">
      {insights.map((insight, index) => {
        const Icon = insightIcons[insight.type]
        const colors = insightColors[insight.type]

        return (
          <motion.div
            key={insight.id}
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
            <div className={cn('p-1.5 rounded-md', colors.bg)}>
              <Icon className={cn('w-3.5 h-3.5', colors.text)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{insight.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{insight.impact}</p>
            </div>
            {insight.priority === 'high' && (
              <Badge variant="outline" className="h-4 px-1 text-[9px] bg-red-500/10 text-red-600 border-red-200">
                !
              </Badge>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
