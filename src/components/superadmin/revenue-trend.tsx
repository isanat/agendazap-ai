'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Calendar, Download, LineChart
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface RevenueTrendProps {
  className?: string
  mrr?: number
  arr?: number
  growthRate?: number
}

export function RevenueTrend({ className, mrr = 0, arr = 0, growthRate = 0 }: RevenueTrendProps) {
  const [period, setPeriod] = useState('12')

  // If no real revenue data, show empty state
  if (mrr === 0) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            Tendência de Receita
          </CardTitle>
          <CardDescription>
            Evolução do MRR ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <LineChart className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Sem dados de receita</p>
            <p className="text-sm text-center max-w-md">
              Configure planos de assinatura e comece a receber pagamentos
              para visualizar a tendência de receita do sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            Tendência de Receita
          </CardTitle>
          <CardDescription>
            Evolução do MRR ao longo do tempo
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="24">24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl">
            <p className="text-sm text-muted-foreground">MRR Atual</p>
            <p className="text-2xl font-bold text-green-600">
              R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            {growthRate > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="w-3 h-3 text-green-500" />
                <span className="text-xs font-medium text-green-500">
                  +{growthRate}%
                </span>
              </div>
            )}
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl">
            <p className="text-sm text-muted-foreground">ARR Projetado</p>
            <p className="text-2xl font-bold text-purple-600">
              R$ {(arr / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-muted-foreground mt-1">Anualizado</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl">
            <p className="text-sm text-muted-foreground">Crescimento</p>
            <p className="text-2xl font-bold text-amber-600">
              +{growthRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ao mês</p>
          </div>
        </div>

        {/* Empty Chart Placeholder */}
        <div className="flex flex-col items-center justify-center h-[200px] bg-muted/20 rounded-lg">
          <LineChart className="w-12 h-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Gráfico será exibido quando houver dados históricos
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
