'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface PeriodFilterProps {
  value: string
  onChange: (value: string) => void
  onCustomRange?: () => void
}

const periods = [
  { value: 'today', label: 'Hoje', shortLabel: 'Hoje' },
  { value: 'yesterday', label: 'Ontem', shortLabel: 'Ontem' },
  { value: 'week', label: 'Esta Semana', shortLabel: 'Semana' },
  { value: 'last_week', label: 'Semana Passada', shortLabel: 'Sem. Passada' },
  { value: 'month', label: 'Este Mês', shortLabel: 'Mês' },
  { value: 'last_month', label: 'Mês Passado', shortLabel: 'Mês Passado' },
  { value: 'quarter', label: 'Este Trimestre', shortLabel: 'Trimestre' },
  { value: 'year', label: 'Este Ano', shortLabel: 'Ano' },
]

export function PeriodFilter({ value, onChange, onCustomRange }: PeriodFilterProps) {
  const selectedPeriod = periods.find(p => p.value === value) || periods[2]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 h-9 bg-background/50 hover:bg-background/80 border-muted-foreground/20"
        >
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="hidden sm:inline">{selectedPeriod.label}</span>
          <span className="sm:hidden">{selectedPeriod.shortLabel}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Selecionar Período
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {periods.map((period) => (
          <DropdownMenuItem
            key={period.value}
            onClick={() => onChange(period.value)}
            className={cn(
              'cursor-pointer',
              value === period.value && 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span>{period.label}</span>
              {value === period.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-green-500"
                />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onCustomRange}
          className="cursor-pointer text-green-600 dark:text-green-400"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Período Personalizado...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PeriodComparison({ 
  currentValue, 
  previousValue, 
  label 
}: { 
  currentValue: number
  previousValue: number
  label: string 
}) {
  const diff = currentValue - previousValue
  const percentage = previousValue > 0 ? ((diff / previousValue) * 100).toFixed(1) : '0'
  const isPositive = diff >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        isPositive 
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span>{isPositive ? '+' : ''}{percentage}%</span>
      <span className="text-muted-foreground font-normal">{label}</span>
    </motion.div>
  )
}
