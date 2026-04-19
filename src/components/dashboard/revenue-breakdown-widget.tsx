'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { 
  DollarSign, CreditCard, Banknote, Smartphone, TrendingUp,
  TrendingDown, Wallet, Building2, ArrowUpRight, ArrowDownRight,
  Calendar, Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const paymentMethodData = [
  { name: 'PIX', value: 45, amount: 12500, color: '#22c55e', trend: 12 },
  { name: 'Cartão Crédito', value: 30, amount: 8300, color: '#8b5cf6', trend: -3 },
  { name: 'Cartão Débito', value: 15, amount: 4150, color: '#3b82f6', trend: 5 },
  { name: 'Dinheiro', value: 8, amount: 2200, color: '#f59e0b', trend: -8 },
  { name: 'Vale Presente', value: 2, amount: 550, color: '#ec4899', trend: 25 },
]

const serviceRevenueData = [
  { name: 'Cortes', revenue: 8500, appointments: 170 },
  { name: 'Coloração', revenue: 6200, appointments: 62 },
  { name: 'Manicure', revenue: 3800, appointments: 95 },
  { name: 'Pedicure', revenue: 2400, appointments: 60 },
  { name: 'Barba', revenue: 1800, appointments: 72 },
  { name: 'Tratamentos', revenue: 3500, appointments: 35 },
]

const professionalRevenueData = [
  { name: 'Ana', revenue: 9200, appointments: 184, goal: 10000 },
  { name: 'Pedro', revenue: 7800, appointments: 156, goal: 8000 },
  { name: 'Luísa', revenue: 6500, appointments: 130, goal: 7000 },
  { name: 'Carlos', revenue: 5200, appointments: 104, goal: 6000 },
]

interface RevenueBreakdownWidgetProps {
  accountId?: string | null
}

// CustomTooltip defined outside the component to avoid render issues
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-2 shadow-lg">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          R$ {payload[0].value.toLocaleString('pt-BR')}
        </p>
      </div>
    )
  }
  return null
}

export function RevenueBreakdownWidget({ accountId }: RevenueBreakdownWidgetProps) {
  const [period, setPeriod] = useState('month')
  const [viewMode, setViewMode] = useState<'payment' | 'service' | 'professional'>('payment')

  const totalRevenue = paymentMethodData.reduce((acc, p) => acc + p.amount, 0)
  const totalAppointments = serviceRevenueData.reduce((acc, s) => acc + s.appointments, 0)
  const avgTicket = totalRevenue / totalAppointments

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'PIX': return <Smartphone className="h-4 w-4" />
      case 'Cartão Crédito': return <CreditCard className="h-4 w-4" />
      case 'Cartão Débito': return <CreditCard className="h-4 w-4" />
      case 'Dinheiro': return <Banknote className="h-4 w-4" />
      case 'Vale Presente': return <Wallet className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Análise de Receita</CardTitle>
              <CardDescription>R$ {totalRevenue.toLocaleString('pt-BR')} no período</CardDescription>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-emerald-600">
              R$ {(totalRevenue / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-blue-600">{totalAppointments}</p>
            <p className="text-xs text-muted-foreground">Atendimentos</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-purple-600">
              R$ {avgTicket.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          {([
            { value: 'payment', label: 'Pagamento' },
            { value: 'service', label: 'Serviço' },
            { value: 'professional', label: 'Profissional' },
          ] as const).map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={viewMode === tab.value ? 'default' : 'outline'}
              onClick={() => setViewMode(tab.value)}
              className="text-xs"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Payment Methods View */}
        {viewMode === 'payment' && (
          <div className="space-y-3">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2">
              {paymentMethodData.map((method) => (
                <div 
                  key={method.name} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-1.5 rounded"
                      style={{ backgroundColor: `${method.color}20`, color: method.color }}
                    >
                      {getPaymentIcon(method.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{method.name}</p>
                      <p className="text-xs text-muted-foreground">{method.value}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      R$ {method.amount.toLocaleString('pt-BR')}
                    </p>
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs",
                      method.trend >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {method.trend >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(method.trend)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services View */}
        {viewMode === 'service' && (
          <div className="space-y-3">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceRevenueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={70} className="text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {serviceRevenueData.map((service) => (
                <div 
                  key={service.name} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.appointments} atendimentos
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">
                    R$ {service.revenue.toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Professionals View */}
        {viewMode === 'professional' && (
          <div className="space-y-3">
            {professionalRevenueData.map((prof) => {
              const goalProgress = (prof.revenue / prof.goal) * 100
              return (
                <div key={prof.name} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{prof.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {prof.appointments} atendimentos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        R$ {prof.revenue.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Meta: R$ {prof.goal.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Meta</span>
                      <span className={cn(
                        "font-medium",
                        goalProgress >= 100 ? "text-green-500" : 
                        goalProgress >= 70 ? "text-yellow-500" : "text-red-500"
                      )}>
                        {goalProgress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={Math.min(goalProgress, 100)} className="h-2" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function RevenueBreakdownMini({ accountId }: RevenueBreakdownWidgetProps) {
  const totalRevenue = paymentMethodData.reduce((acc, p) => acc + p.amount, 0)
  const pixPercent = paymentMethodData.find(p => p.name === 'PIX')?.value || 0

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Análise de Receita</p>
              <p className="text-xs text-muted-foreground">
                R$ {(totalRevenue / 1000).toFixed(1)}k total
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
