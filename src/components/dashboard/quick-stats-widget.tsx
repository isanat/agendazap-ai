'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Calendar, 
  Users, 
  DollarSign,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/auth-fetch'

interface QuickStatsWidgetProps {
  accountId?: string | null
}

interface WidgetStats {
  todayGoal: number
  todayCompleted: number
  weekGoal: number
  weekCompleted: number
  streak: number
  efficiency: number
  topService: string
  topProfessional: string
}

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number
    let animationFrame: number
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * end))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration])
  
  return count
}

// Animated progress ring
function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 8,
  color = '#10B981'
}: { 
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="text-muted stroke-current"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <motion.circle
          className="transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span 
          className="text-lg font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {progress}%
        </motion.span>
      </div>
    </div>
  )
}

// Stat item with animation
function StatItem({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendUp,
  color = 'text-green-500'
}: {
  icon: React.ElementType
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  color?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className={cn('p-2 rounded-lg bg-muted/50', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <div className="flex items-center gap-1">
          <span className="font-semibold">{value}</span>
          {trend && (
            <span className={cn(
              'text-xs flex items-center gap-0.5',
              trendUp ? 'text-green-500' : 'text-red-500'
            )}>
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function QuickStatsWidget({ accountId }: QuickStatsWidgetProps) {
  const [stats, setStats] = useState<WidgetStats>({
    todayGoal: 0,
    todayCompleted: 0,
    weekGoal: 0,
    weekCompleted: 0,
    streak: 0,
    efficiency: 0,
    topService: '-',
    topProfessional: '-'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const res = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()

        if (cancelled) return

        const todayGoal = (data.stats?.totalProfessionals || 0) * 8 || 10
        const weekGoal = todayGoal * 6 || 50

        setStats({
          todayCompleted: data.stats?.todayAppointments || 0,
          todayGoal,
          weekCompleted: data.stats?.weekAppointments || 0,
          weekGoal,
          efficiency: data.stats?.occupancyRate || 0,
          topService: data.stats?.topService || '-',
          topProfessional: data.stats?.topProfessional || '-',
          streak: 0
        })
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [accountId])

  const todayProgress = stats.todayGoal > 0 ? (stats.todayCompleted / stats.todayGoal) * 100 : 0
  const weekProgress = stats.weekGoal > 0 ? (stats.weekCompleted / stats.weekGoal) * 100 : 0
  
  const animatedToday = useAnimatedCounter(stats.todayCompleted)
  const animatedWeek = useAnimatedCounter(stats.weekCompleted)

  const isEmpty = !loading && stats.todayCompleted === 0 && stats.weekCompleted === 0 && stats.efficiency === 0

  if (loading) {
    return (
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-500" />
            Resumo Rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (isEmpty) {
    return (
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-500" />
            Resumo Rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[200px] text-center">
          <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum dado disponível ainda</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Os dados aparecerão quando houver agendamentos</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 text-green-500" />
          Resumo Rápido
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Progress Rings */}
        <div className="flex justify-around items-center">
          <motion.div 
            className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <ProgressRing progress={Math.min(todayProgress, 100)} size={70} strokeWidth={6} />
            <p className="text-xs text-muted-foreground mt-2">Meta de Hoje</p>
            <p className="text-sm font-semibold">
              {animatedToday}/{stats.todayGoal}
            </p>
          </motion.div>
          
          <div className="h-16 w-px bg-border" />
          
          <motion.div 
            className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <ProgressRing 
              progress={Math.min(weekProgress, 100)} 
              size={70} 
              strokeWidth={6} 
              color="#3B82F6"
            />
            <p className="text-xs text-muted-foreground mt-2">Meta Semanal</p>
            <p className="text-sm font-semibold">
              {animatedWeek}/{stats.weekGoal}
            </p>
          </motion.div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-dashed" />
        
        {/* Quick Stats */}
        <div className="space-y-1">
          <StatItem
            icon={Award}
            label="Sequência de dias"
            value={`${stats.streak} dias`}
            color="text-yellow-500"
          />
          <StatItem
            icon={Target}
            label="Eficiência"
            value={`${stats.efficiency}%`}
            color="text-green-500"
          />
          <StatItem
            icon={TrendingUp}
            label="Serviço mais pedido"
            value={stats.topService}
            color="text-blue-500"
          />
        </div>
        
        {/* Streak Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
        >
          <div className="flex">
            {[...Array(Math.min(stats.streak, 5))].map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="text-lg"
              >
                🔥
              </motion.span>
            ))}
          </div>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {stats.streak} dias consecutivos!
          </span>
        </motion.div>
      </CardContent>
    </Card>
  )
}
