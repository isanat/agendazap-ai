'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Users,
  Calendar,
  MessageSquare,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Suggestion {
  id: string
  type: 'revenue' | 'retention' | 'efficiency' | 'marketing' | 'risk'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  potentialGain?: string
  action: string
  implemented: boolean
}

const mockSuggestions: Suggestion[] = [
  {
    id: '1',
    type: 'revenue',
    title: 'Oferecer pacote promocional',
    description: 'Clientes que fazem Corte + Barba têm 40% mais retenção. Crie um pacote com desconto de 15%.',
    impact: 'high',
    potentialGain: '+R$ 1.200/mês',
    action: 'Criar pacote',
    implemented: false
  },
  {
    id: '2',
    type: 'retention',
    title: 'Reativar clientes inativos',
    description: '18 clientes não retornam há mais de 60 dias. Envie uma oferta especial via WhatsApp.',
    impact: 'high',
    potentialGain: '+R$ 2.800/mês',
    action: 'Enviar ofertas',
    implemented: false
  },
  {
    id: '3',
    type: 'efficiency',
    title: 'Otimizar horários de pico',
    description: 'Terça e quinta às 10h têm alta demanda. Considere adicionar um profissional nesses horários.',
    impact: 'medium',
    potentialGain: '+8 agendamentos/semana',
    action: 'Ver agenda',
    implemented: false
  },
  {
    id: '4',
    type: 'risk',
    title: 'Alerta de no-show frequente',
    description: '3 clientes têm histórico de cancelamento tardio. Implemente confirmação dupla para eles.',
    impact: 'medium',
    potentialGain: '-R$ 150/perdas',
    action: 'Configurar alerta',
    implemented: true
  },
  {
    id: '5',
    type: 'marketing',
    title: 'Aniversariantes do mês',
    description: '5 clientes fazem aniversário em Dezembro. Ofereça um brinde especial para fidelização.',
    impact: 'low',
    potentialGain: '+5 agendamentos',
    action: 'Ver clientes',
    implemented: false
  }
]

const typeConfig = {
  revenue: {
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Receita'
  },
  retention: {
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Retenção'
  },
  efficiency: {
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Eficiência'
  },
  marketing: {
    icon: Target,
    color: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Marketing'
  },
  risk: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Risco'
  }
}

const impactConfig = {
  high: { color: 'bg-green-500', label: 'Alto impacto' },
  medium: { color: 'bg-amber-500', label: 'Médio impacto' },
  low: { color: 'bg-slate-400', label: 'Baixo impacto' }
}

interface SmartSuggestionsWidgetProps {
  accountId?: string | null
}

export function SmartSuggestionsWidget({ accountId }: SmartSuggestionsWidgetProps) {
  const [suggestions, setSuggestions] = useState(mockSuggestions)
  const [filter, setFilter] = useState<'all' | 'implemented' | 'pending'>('all')

  const filteredSuggestions = suggestions.filter(s => {
    if (filter === 'implemented') return s.implemented
    if (filter === 'pending') return !s.implemented
    return true
  })

  const implementedCount = suggestions.filter(s => s.implemented).length
  const potentialRevenue = suggestions
    .filter(s => !s.implemented && s.potentialGain?.includes('R$'))
    .reduce((acc, s) => {
      const match = s.potentialGain?.match(/R\$ ([\d.,]+)/)
      return acc + (match ? parseFloat(match[1].replace('.', '').replace(',', '.')) : 0)
    }, 0)

  const handleImplement = (id: string) => {
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, implemented: true } : s
    ))
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Sugestões Inteligentes</CardTitle>
              <CardDescription>IA identificou {suggestions.length} oportunidades</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {implementedCount}/{suggestions.length} aplicadas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Potential Revenue Banner */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">Ganho potencial implementando todas:</span>
            </div>
            <span className="font-bold text-green-700 dark:text-green-400">
              R$ {potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'pending', 'implemented'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={cn(
                'text-xs',
                filter === f && 'bg-green-600 hover:bg-green-700'
              )}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Aplicadas'}
            </Button>
          ))}
        </div>

        {/* Suggestions List */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filteredSuggestions.map((suggestion, index) => {
              const config = typeConfig[suggestion.type]
              const Icon = config.icon
              const impact = impactConfig[suggestion.impact]

              return (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    suggestion.implemented
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : 'bg-card hover:border-green-300 dark:hover:border-green-700'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg shrink-0', config.bg)}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                          'font-medium text-sm',
                          suggestion.implemented && 'line-through text-muted-foreground'
                        )}>
                          {suggestion.title}
                        </h4>
                        <div className={cn('w-2 h-2 rounded-full', impact.color)} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center gap-2">
                        {suggestion.potentialGain && !suggestion.implemented && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {suggestion.potentialGain}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        {suggestion.implemented && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aplicada
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!suggestion.implemented && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleImplement(suggestion.id)}
                      >
                        {suggestion.action}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

export function SmartSuggestionsMini({ accountId }: SmartSuggestionsWidgetProps) {
  const pendingCount = mockSuggestions.filter(s => !s.implemented).length
  const highImpactCount = mockSuggestions.filter(s => !s.implemented && s.impact === 'high').length

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Sugestões IA</p>
          <p className="text-xs text-muted-foreground">
            {pendingCount} pendentes, {highImpactCount} de alto impacto
          </p>
        </div>
        <Button size="sm" variant="ghost">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
