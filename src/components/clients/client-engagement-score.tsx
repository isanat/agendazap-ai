'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  MessageSquare, 
  Calendar,
  Award,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface EngagementScore {
  overall: number
  trend: 'up' | 'down' | 'stable'
  trendValue: number
  categories: {
    appointments: { score: number; change: number }
    communication: { score: number; change: number }
    loyalty: { score: number; change: number }
    satisfaction: { score: number; change: number }
  }
  recentActivity: {
    type: 'appointment' | 'message' | 'review' | 'loyalty'
    description: string
    timestamp: string
  }[]
}

const defaultEngagement: EngagementScore = {
  overall: 87,
  trend: 'up',
  trendValue: 12,
  categories: {
    appointments: { score: 92, change: 8 },
    communication: { score: 78, change: -3 },
    loyalty: { score: 85, change: 15 },
    satisfaction: { score: 94, change: 5 }
  },
  recentActivity: [
    { type: 'review', description: 'Avaliação 5 estrelas recebida', timestamp: '2h atrás' },
    { type: 'appointment', description: 'Agendamento confirmado', timestamp: '4h atrás' },
    { type: 'loyalty', description: 'Pontos de fidelidade ganhos', timestamp: '1d atrás' }
  ]
}

// Animated score counter with easing
function AnimatedScore({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  
  useEffect(() => {
    let startTime: number
    let animationFrame: number
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Elastic ease out
      const easeOutElastic = (x: number): number => {
        const c4 = (2 * Math.PI) / 3
        return x === 0
          ? 0
          : x === 1
          ? 1
          : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1
      }
      
      setDisplayValue(Math.floor(easeOutElastic(progress) * value))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])
  
  return <span>{displayValue}</span>
}

// Score ring with gradient
function ScoreRing({ 
  score, 
  size = 120, 
  strokeWidth = 10,
  label 
}: { 
  score: number
  size?: number
  strokeWidth?: number
  label: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference
  
  // Determine color based on score
  const getScoreColor = (s: number) => {
    if (s >= 80) return { stroke: '#10B981', bg: 'from-green-500/20 to-emerald-500/20', text: 'text-green-600' }
    if (s >= 60) return { stroke: '#3B82F6', bg: 'from-blue-500/20 to-indigo-500/20', text: 'text-blue-600' }
    if (s >= 40) return { stroke: '#F59E0B', bg: 'from-yellow-500/20 to-amber-500/20', text: 'text-yellow-600' }
    return { stroke: '#EF4444', bg: 'from-red-500/20 to-rose-500/20', text: 'text-red-600' }
  }
  
  const colors = getScoreColor(score)
  
  return (
    <div className="relative flex flex-col items-center">
      <svg className="transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.stroke} />
          </linearGradient>
        </defs>
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
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          stroke={`url(#gradient-${label})`}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className={cn('text-2xl font-bold', colors.text)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <AnimatedScore value={score} />
        </motion.span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

// Category bar with animation
function CategoryBar({ 
  label, 
  score, 
  change, 
  icon: Icon 
}: { 
  label: string
  score: number
  change: number
  icon: React.ElementType
}) {
  const isPositive = change > 0
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-muted/50">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{score}%</span>
          <Badge 
            variant="outline" 
            className={cn(
              'text-[10px] px-1.5 py-0 h-4',
              isPositive ? 'border-green-500/50 text-green-600' : 
                change < 0 ? 'border-red-500/50 text-red-600' : 
                'border-gray-500/50 text-gray-600'
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
            ) : change < 0 ? (
              <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />
            ) : (
              <Minus className="w-2.5 h-2.5 mr-0.5" />
            )}
            {Math.abs(change)}%
          </Badge>
        </div>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            score >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
            score >= 60 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
            score >= 40 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
            'bg-gradient-to-r from-red-400 to-rose-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </div>
    </motion.div>
  )
}

// Activity item
function ActivityItem({ 
  type, 
  description, 
  timestamp 
}: { 
  type: string
  description: string
  timestamp: string
}) {
  const icons = {
    appointment: Calendar,
    message: MessageSquare,
    review: Star,
    loyalty: Award
  }
  
  const colors = {
    appointment: 'text-blue-500 bg-blue-500/10',
    message: 'text-purple-500 bg-purple-500/10',
    review: 'text-yellow-500 bg-yellow-500/10',
    loyalty: 'text-green-500 bg-green-500/10'
  }
  
  const Icon = icons[type as keyof typeof icons] || Calendar
  const colorClass = colors[type as keyof typeof colors] || 'text-gray-500 bg-gray-500/10'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-2"
    >
      <div className={cn('p-2 rounded-lg', colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{description}</p>
        <p className="text-xs text-muted-foreground">{timestamp}</p>
      </div>
    </motion.div>
  )
}

export function ClientEngagementScore({ 
  clientId 
}: { 
  clientId?: string 
}) {
  const [engagement, setEngagement] = useState<EngagementScore>(defaultEngagement)
  
  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/5 to-purple-500/5">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" />
          Engajamento do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Main Score */}
        <div className="flex items-center justify-center">
          <ScoreRing score={engagement.overall} size={140} strokeWidth={12} label="Score" />
        </div>
        
        {/* Trend Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center justify-center gap-2 py-2 px-4 rounded-full',
            engagement.trend === 'up' ? 'bg-green-500/10' :
            engagement.trend === 'down' ? 'bg-red-500/10' : 'bg-gray-500/10'
          )}
        >
          {engagement.trend === 'up' ? (
            <>
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                +{engagement.trendValue}% este mês
              </span>
            </>
          ) : engagement.trend === 'down' ? (
            <>
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">
                -{engagement.trendValue}% este mês
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-gray-600">Estável</span>
          )}
        </motion.div>
        
        {/* Category Breakdown */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Detalhamento
          </h4>
          <CategoryBar 
            label="Agendamentos" 
            score={engagement.categories.appointments.score} 
            change={engagement.categories.appointments.change}
            icon={Calendar}
          />
          <CategoryBar 
            label="Comunicação" 
            score={engagement.categories.communication.score} 
            change={engagement.categories.communication.change}
            icon={MessageSquare}
          />
          <CategoryBar 
            label="Fidelidade" 
            score={engagement.categories.loyalty.score} 
            change={engagement.categories.loyalty.change}
            icon={Award}
          />
          <CategoryBar 
            label="Satisfação" 
            score={engagement.categories.satisfaction.score} 
            change={engagement.categories.satisfaction.change}
            icon={Star}
          />
        </div>
        
        {/* Recent Activity */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Atividade Recente
          </h4>
          <div className="space-y-1">
            {engagement.recentActivity.map((activity, index) => (
              <ActivityItem
                key={index}
                type={activity.type}
                description={activity.description}
                timestamp={activity.timestamp}
              />
            ))}
          </div>
        </div>
        
        {/* Engagement Tip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-start gap-2 p-3 rounded-lg bg-gradient-to-r from-pink-500/5 to-purple-500/5 border border-pink-500/20"
        >
          <Sparkles className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-pink-600">Dica:</span> Envie uma mensagem personalizada para aumentar o engajamento!
          </p>
        </motion.div>
      </CardContent>
    </Card>
  )
}
