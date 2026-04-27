'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Trophy,
  Flame,
  Star,
  Zap,
  ChevronRight,
  Award,
  Crown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Goal {
  id: string
  title: string
  current: number
  target: number
  unit: string
  prefix?: string
  suffix?: string
  trend?: number
  color: string
  icon: typeof DollarSign
}

interface GoalsProgressWidgetProps {
  accountId?: string | null
}

const goals: Goal[] = [
  {
    id: 'revenue',
    title: 'Meta de Faturamento',
    current: 12500,
    target: 15000,
    unit: 'R$',
    prefix: 'R$ ',
    trend: 12,
    color: 'green',
    icon: DollarSign
  },
  {
    id: 'clients',
    title: 'Novos Clientes',
    current: 28,
    target: 40,
    unit: 'clientes',
    trend: 5,
    color: 'blue',
    icon: Users
  },
  {
    id: 'appointments',
    title: 'Agendamentos do Mês',
    current: 145,
    target: 180,
    unit: 'agendamentos',
    trend: -3,
    color: 'purple',
    icon: Calendar
  },
]

const colorClasses = {
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    progress: 'bg-green-500',
    gradient: 'from-green-500 to-emerald-500'
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    progress: 'bg-blue-500',
    gradient: 'from-blue-500 to-cyan-500'
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    progress: 'bg-purple-500',
    gradient: 'from-purple-500 to-pink-500'
  },
}

function AnimatedProgress({ value, color }: { value: number; color: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(value), 100)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
      <motion.div
        className={cn('absolute inset-y-0 left-0 rounded-full', colorClasses[color as keyof typeof colorClasses].progress)}
        initial={{ width: 0 }}
        animate={{ width: `${displayValue}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-white/20"
        initial={{ width: 0 }}
        animate={{ width: `${displayValue}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  )
}

export function GoalsProgressWidget({ accountId }: GoalsProgressWidgetProps) {
  const [streak, setStreak] = useState(7)
  const [level, setLevel] = useState(3)

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
              <Target className="w-4 h-4 text-white" />
            </div>
            Metas e Progresso
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs">
              <Flame className="w-3.5 h-3.5" />
              <span className="font-medium">{streak} dias</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Level Progress */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Nível {level}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              2.450 / 3.000 XP
            </span>
          </div>
          <AnimatedProgress value={82} color="green" />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            550 XP para o próximo nível
          </p>
        </div>

        {/* Goals */}
        <div className="space-y-3">
          {goals.map((goal, index) => {
            const percentage = Math.min((goal.current / goal.target) * 100, 100)
            const colors = colorClasses[goal.color as keyof typeof colorClasses]
            const Icon = goal.icon

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn('p-1.5 rounded-md', colors.bg)}>
                      <Icon className={cn('w-3.5 h-3.5', colors.text)} />
                    </div>
                    <span className="text-sm font-medium">{goal.title}</span>
                  </div>
                  {goal.trend !== undefined && (
                    <div className={cn(
                      'flex items-center gap-1 text-xs',
                      goal.trend >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {goal.trend >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{Math.abs(goal.trend)}%</span>
                    </div>
                  )}
                </div>

                <AnimatedProgress value={percentage} color={goal.color} />

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {goal.prefix || ''}{goal.current.toLocaleString('pt-BR')}{goal.suffix || ''} / {goal.prefix || ''}{goal.target.toLocaleString('pt-BR')}{goal.suffix || ''}
                  </span>
                  <span className={cn('text-xs font-medium', colors.text)}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Achievement Preview */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
          <div className="flex -space-x-1">
            {[Star, Trophy, Award, Zap].map((Icon, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className={cn(
                  'p-1.5 rounded-full border-2 border-background',
                  i < 2 ? 'bg-amber-500' : 'bg-muted'
                )}
              >
                <Icon className="w-3 h-3 text-white" />
              </motion.div>
            ))}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium">4 conquistas</p>
            <p className="text-[10px] text-muted-foreground">2 bloqueadas</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Ver todas
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function GoalsProgressMini({ accountId }: { accountId?: string | null }) {
  const goal = goals[0]
  const percentage = Math.min((goal.current / goal.target) * 100, 100)
  const colors = colorClasses[goal.color as keyof typeof colorClasses]

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-md', colors.bg)}>
            <goal.icon className={cn('w-3.5 h-3.5', colors.text)} />
          </div>
          <span className="text-xs font-medium">{goal.title}</span>
        </div>
        <span className={cn('text-xs font-medium', colors.text)}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <AnimatedProgress value={percentage} color={goal.color} />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground">
          R$ {goal.current.toLocaleString('pt-BR')} / R$ {goal.target.toLocaleString('pt-BR')}
        </span>
        <div className="flex items-center gap-1 text-[10px] text-green-600">
          <TrendingUp className="w-2.5 h-2.5" />
          <span>+12%</span>
        </div>
      </div>
    </div>
  )
}
