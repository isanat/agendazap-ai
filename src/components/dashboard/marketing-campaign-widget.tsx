'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  DollarSign,
  MessageSquare,
  Mail,
  ChevronRight,
  Play,
  Pause,
  BarChart3,
  Eye,
  MousePointerClick,
  Calendar,
  Send,
  Plus,
  Settings,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Campaign {
  id: string
  name: string
  type: 'whatsapp' | 'email' | 'sms'
  status: 'active' | 'paused' | 'completed' | 'draft'
  target: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  converted: number
  revenue: number
  cost: number
  startDate: string
  endDate?: string
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Promoção de Verão',
    type: 'whatsapp',
    status: 'active',
    target: 'Clientes inativos (60+ dias)',
    sent: 150,
    delivered: 148,
    opened: 98,
    clicked: 45,
    converted: 12,
    revenue: 960,
    cost: 45,
    startDate: '2024-12-01'
  },
  {
    id: '2',
    name: 'Newsletter Dezembro',
    type: 'email',
    status: 'active',
    target: 'Todos os clientes',
    sent: 520,
    delivered: 505,
    opened: 189,
    clicked: 67,
    converted: 23,
    revenue: 1840,
    cost: 0,
    startDate: '2024-12-05'
  },
  {
    id: '3',
    name: 'Lembrete Agendamento',
    type: 'whatsapp',
    status: 'completed',
    target: 'Agendamentos da semana',
    sent: 85,
    delivered: 85,
    opened: 82,
    clicked: 78,
    converted: 72,
    revenue: 3600,
    cost: 25,
    startDate: '2024-12-02',
    endDate: '2024-12-08'
  },
  {
    id: '4',
    name: 'Aniversariantes do Mês',
    type: 'whatsapp',
    status: 'paused',
    target: 'Aniversariantes Dezembro',
    sent: 25,
    delivered: 25,
    opened: 18,
    clicked: 12,
    converted: 5,
    revenue: 400,
    cost: 8,
    startDate: '2024-12-01'
  },
  {
    id: '5',
    name: 'Campanha VIP',
    type: 'email',
    status: 'draft',
    target: 'Clientes VIP (R$ 500+)',
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    revenue: 0,
    cost: 0,
    startDate: '2024-12-15'
  }
]

const statusConfig = {
  active: { color: 'bg-green-500', label: 'Ativa', icon: Play },
  paused: { color: 'bg-amber-500', label: 'Pausada', icon: Pause },
  completed: { color: 'bg-blue-500', label: 'Concluída', icon: Target },
  draft: { color: 'bg-slate-400', label: 'Rascunho', icon: Settings }
}

const typeConfig = {
  whatsapp: { icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  sms: { icon: Send, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' }
}

interface MarketingCampaignWidgetProps {
  accountId?: string | null
}

export function MarketingCampaignWidget({ accountId }: MarketingCampaignWidgetProps) {
  const [campaigns, setCampaigns] = useState(mockCampaigns)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const totalRevenue = campaigns.reduce((acc, c) => acc + c.revenue, 0)
  const totalCost = campaigns.reduce((acc, c) => acc + c.cost, 0)
  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost * 100).toFixed(0) : '0'

  const toggleCampaign = (id: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'active' ? 'paused' : 'active' }
      }
      return c
    }))
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Campanhas de Marketing</CardTitle>
              <CardDescription>{activeCampaigns.length} campanhas ativas</CardDescription>
            </div>
          </div>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-1" />
            Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ROI Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Receita</span>
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              R$ {totalRevenue.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600">Investido</span>
            </div>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
              R$ {totalCost.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-violet-600" />
              <span className="text-xs text-violet-600">ROI</span>
            </div>
            <p className="text-lg font-bold text-violet-700 dark:text-violet-400">
              {roi}%
            </p>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="space-y-3 max-h-72 overflow-y-auto">
          <AnimatePresence>
            {campaigns.map((campaign, index) => {
              const typeConf = typeConfig[campaign.type]
              const statusConf = statusConfig[campaign.status]
              const TypeIcon = typeConf.icon
              const StatusIcon = statusConf.icon
              const deliveryRate = campaign.sent > 0 ? (campaign.delivered / campaign.sent * 100) : 0
              const openRate = campaign.delivered > 0 ? (campaign.opened / campaign.delivered * 100) : 0
              const clickRate = campaign.opened > 0 ? (campaign.clicked / campaign.opened * 100) : 0
              const conversionRate = campaign.clicked > 0 ? (campaign.converted / campaign.clicked * 100) : 0

              return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    campaign.status === 'active' 
                      ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : 'bg-card hover:border-muted-foreground/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg shrink-0', typeConf.bg)}>
                      <TypeIcon className={cn('w-4 h-4', typeConf.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{campaign.name}</h4>
                        <Badge variant="outline" className={cn('text-xs shrink-0', statusConf.color, 'text-white')}>
                          {statusConf.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{campaign.target}</p>
                      
                      {/* Metrics Row */}
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-xs font-medium text-green-600">{openRate.toFixed(0)}%</p>
                          <p className="text-[10px] text-muted-foreground">Abertura</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-blue-600">{clickRate.toFixed(0)}%</p>
                          <p className="text-[10px] text-muted-foreground">Cliques</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-violet-600">{conversionRate.toFixed(0)}%</p>
                          <p className="text-[10px] text-muted-foreground">Conversão</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-amber-600">
                            R$ {campaign.revenue.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Receita</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {campaign.status === 'active' && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{campaign.delivered}/{campaign.sent}</span>
                          </div>
                          <Progress value={deliveryRate} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    {(campaign.status === 'active' || campaign.status === 'paused') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => toggleCampaign(campaign.id)}
                      >
                        {campaign.status === 'active' ? (
                          <Pause className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Play className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Quick Stats Footer */}
        <div className="flex items-center justify-between pt-3 border-t text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{campaigns.reduce((a, c) => a + c.opened, 0)}</span>
              <span className="text-muted-foreground text-xs">visualizações</span>
            </div>
            <div className="flex items-center gap-1">
              <MousePointerClick className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{campaigns.reduce((a, c) => a + c.clicked, 0)}</span>
              <span className="text-muted-foreground text-xs">cliques</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs">
            Ver relatório
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function MarketingCampaignMini({ accountId }: MarketingCampaignWidgetProps) {
  const activeCount = mockCampaigns.filter(c => c.status === 'active').length
  const totalRevenue = mockCampaigns.reduce((acc, c) => acc + c.revenue, 0)

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <Megaphone className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Campanhas</p>
          <p className="text-xs text-muted-foreground">
            {activeCount} ativas • R$ {totalRevenue.toLocaleString('pt-BR')} gerado
          </p>
        </div>
        <Button size="sm" variant="ghost">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
