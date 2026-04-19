'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CreditCard,
  Wallet,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PieChart
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FinancialMetric {
  label: string
  value: number
  previousValue: number
  target?: number
  format: 'currency' | 'number' | 'percent'
  trend: 'up' | 'down' | 'stable'
}

interface FinancialHealth {
  revenue: FinancialMetric
  expenses: FinancialMetric
  profit: FinancialMetric
  profitMargin: FinancialMetric
  pendingPayments: FinancialMetric
  avgTicket: FinancialMetric
}

const mockFinancialHealth: FinancialHealth = {
  revenue: {
    label: 'Receita do Mês',
    value: 28450,
    previousValue: 24800,
    target: 30000,
    format: 'currency',
    trend: 'up'
  },
  expenses: {
    label: 'Despesas',
    value: 8200,
    previousValue: 7800,
    format: 'currency',
    trend: 'up'
  },
  profit: {
    label: 'Lucro Líquido',
    value: 20250,
    previousValue: 17000,
    target: 20000,
    format: 'currency',
    trend: 'up'
  },
  profitMargin: {
    label: 'Margem de Lucro',
    value: 71.2,
    previousValue: 68.5,
    target: 70,
    format: 'percent',
    trend: 'up'
  },
  pendingPayments: {
    label: 'Pagamentos Pendentes',
    value: 3250,
    previousValue: 2800,
    format: 'currency',
    trend: 'down'
  },
  avgTicket: {
    label: 'Ticket Médio',
    value: 87.50,
    previousValue: 82.30,
    target: 90,
    format: 'currency',
    trend: 'up'
  }
}

interface ExpenseBreakdown {
  category: string
  amount: number
  percentage: number
  color: string
}

const mockExpenses: ExpenseBreakdown[] = [
  { category: 'Salários', amount: 4500, percentage: 55, color: 'bg-blue-500' },
  { category: 'Produtos', amount: 1800, percentage: 22, color: 'bg-purple-500' },
  { category: 'Aluguel', amount: 1200, percentage: 15, color: 'bg-amber-500' },
  { category: 'Outros', amount: 700, percentage: 8, color: 'bg-slate-400' }
]

const formatValue = (value: number, format: 'currency' | 'number' | 'percent') => {
  switch (format) {
    case 'currency':
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    case 'percent':
      return `${value.toFixed(1)}%`
    default:
      return value.toLocaleString('pt-BR')
  }
}

const getChangePercent = (current: number, previous: number) => {
  if (previous === 0) return 0
  return ((current - previous) / previous * 100).toFixed(1)
}

const getHealthScore = (data: FinancialHealth): { score: number; status: 'excellent' | 'good' | 'warning' | 'critical' } => {
  let score = 0
  
  // Revenue growth (25 points)
  if (data.revenue.value > data.revenue.previousValue) score += 25
  
  // Profit margin (25 points)
  if (data.profitMargin.value >= 70) score += 25
  else if (data.profitMargin.value >= 60) score += 15
  else if (data.profitMargin.value >= 50) score += 10
  
  // Target achievement (25 points)
  if (data.profit.value >= (data.profit.target || 0)) score += 25
  else if (data.profit.value >= (data.profit.target || 0) * 0.9) score += 15
  
  // Pending payments (25 points)
  if (data.pendingPayments.value < 3000) score += 25
  else if (data.pendingPayments.value < 5000) score += 15
  else if (data.pendingPayments.value < 7000) score += 10
  
  if (score >= 90) return { score, status: 'excellent' }
  if (score >= 70) return { score, status: 'good' }
  if (score >= 50) return { score, status: 'warning' }
  return { score, status: 'critical' }
}

interface FinancialHealthWidgetProps {
  accountId?: string | null
}

export function FinancialHealthWidget({ accountId }: FinancialHealthWidgetProps) {
  const [financial] = useState(mockFinancialHealth)
  const healthScore = getHealthScore(financial)

  const healthConfig = {
    excellent: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Excelente', icon: CheckCircle2 },
    good: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Bom', icon: TrendingUp },
    warning: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Atenção', icon: AlertTriangle },
    critical: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Crítico', icon: TrendingDown }
  }

  const currentConfig = healthConfig[healthScore.status]
  const StatusIcon = currentConfig.icon

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Saúde Financeira</CardTitle>
              <CardDescription>Análise mensal do negócio</CardDescription>
            </div>
          </div>
          <Badge className={cn('text-white', 
            healthScore.status === 'excellent' ? 'bg-green-500' :
            healthScore.status === 'good' ? 'bg-blue-500' :
            healthScore.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
          )}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {currentConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score Circle */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/30"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${healthScore.score * 2.26} 226`}
                className={cn(
                  healthScore.status === 'excellent' ? 'text-green-500' :
                  healthScore.status === 'good' ? 'text-blue-500' :
                  healthScore.status === 'warning' ? 'text-amber-500' : 'text-red-500'
                )}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{healthScore.score}</span>
            </div>
          </div>
          <div>
            <p className="font-medium text-emerald-700 dark:text-emerald-400">Score de Saúde</p>
            <p className="text-sm text-muted-foreground">
              {healthScore.status === 'excellent' ? 'Suas finanças estão ótimas!' :
               healthScore.status === 'good' ? 'Bom progresso, continue assim!' :
               healthScore.status === 'warning' ? 'Alguns pontos precisam de atenção' :
               'Ação imediata necessária'}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Receita</span>
              {financial.revenue.trend === 'up' && (
                <ArrowUpRight className="w-3 h-3 text-green-500" />
              )}
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              {formatValue(financial.revenue.value, 'currency')}
            </p>
            <p className="text-xs text-green-600">
              +{getChangePercent(financial.revenue.value, financial.revenue.previousValue)}% vs mês anterior
            </p>
          </motion.div>

          {/* Expenses */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-600">Despesas</span>
              {financial.expenses.trend === 'up' && (
                <ArrowUpRight className="w-3 h-3 text-red-500" />
              )}
            </div>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">
              {formatValue(financial.expenses.value, 'currency')}
            </p>
            <p className="text-xs text-red-600">
              +{getChangePercent(financial.expenses.value, financial.expenses.previousValue)}% vs mês anterior
            </p>
          </motion.div>

          {/* Profit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600">Lucro</span>
              {financial.profit.trend === 'up' && (
                <ArrowUpRight className="w-3 h-3 text-blue-500" />
              )}
            </div>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {formatValue(financial.profit.value, 'currency')}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Progress 
                value={(financial.profit.value / (financial.profit.target || 1)) * 100} 
                className="h-1.5 flex-1" 
              />
              <span className="text-xs text-muted-foreground">
                {Math.round((financial.profit.value / (financial.profit.target || 1)) * 100)}%
              </span>
            </div>
          </motion.div>

          {/* Profit Margin */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-600">Margem</span>
            </div>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {formatValue(financial.profitMargin.value, 'percent')}
            </p>
            <p className="text-xs text-purple-600">
              Meta: {formatValue(financial.profitMargin.target || 0, 'percent')}
            </p>
          </motion.div>
        </div>

        {/* Expense Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Distribuição de Despesas</span>
            <span className="text-sm text-muted-foreground">
              Total: R$ {mockExpenses.reduce((a, e) => a + e.amount, 0).toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="space-y-2">
            {mockExpenses.map((expense, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{expense.category}</span>
                  <span className="font-medium">R$ {expense.amount.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={expense.percentage} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">{expense.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Payments Alert */}
        {financial.pendingPayments.value > 3000 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Pagamentos Pendentes
                </p>
                <p className="text-xs text-amber-600">
                  {formatValue(financial.pendingPayments.value, 'currency')} aguardando recebimento
                </p>
              </div>
              <Button size="sm" variant="outline" className="text-amber-700 border-amber-300">
                Ver detalhes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function FinancialHealthMini({ accountId }: FinancialHealthWidgetProps) {
  const profit = mockFinancialHealth.profit.value
  const margin = mockFinancialHealth.profitMargin.value

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <PiggyBank className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Financeiro</p>
          <p className="text-xs text-muted-foreground">
            R$ {profit.toLocaleString('pt-BR')} lucro • {margin.toFixed(0)}% margem
          </p>
        </div>
        <Button size="sm" variant="ghost">
          <ArrowUpRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
