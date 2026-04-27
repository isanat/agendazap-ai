'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Star,
  Calendar,
  DollarSign,
  Clock,
  Award,
  Crown,
  Zap,
  Target,
  ChevronRight,
  Briefcase,
  Medal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  name: string
  avatar?: string
  role: string
  appointments: number
  revenue: number
  rating: number
  hoursWorked: number
  growth: number
  status: 'top' | 'rising' | 'stable' | 'declining'
  color: string
  specialties: string[]
  occupancy: number
}

interface TeamPerformanceWidgetProps {
  accountId?: string | null
}

const statusConfig = {
  top: { icon: Crown, label: 'Top Performer', color: 'amber' },
  rising: { icon: TrendingUp, label: 'Em Alta', color: 'green' },
  stable: { icon: Target, label: 'Estável', color: 'blue' },
  declining: { icon: TrendingDown, label: 'Atenção', color: 'red' }
}

const colorStyles = {
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/30',
    gradient: 'from-green-500 to-emerald-500'
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    gradient: 'from-blue-500 to-cyan-500'
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    gradient: 'from-purple-500 to-violet-500'
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    gradient: 'from-amber-500 to-orange-500'
  },
  rose: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    gradient: 'from-rose-500 to-pink-500'
  }
}

const generateTeam = (): TeamMember[] => [
  {
    id: '1',
    name: 'Maria Silva',
    role: 'Cabelereira Senior',
    appointments: 87,
    revenue: 12450,
    rating: 4.9,
    hoursWorked: 160,
    growth: 15,
    status: 'top',
    color: 'amber',
    specialties: ['Coloração', 'Corte Feminino', 'Mecânica'],
    occupancy: 92
  },
  {
    id: '2',
    name: 'Ana Costa',
    role: 'Cabelereira',
    appointments: 72,
    revenue: 8640,
    rating: 4.7,
    hoursWorked: 160,
    growth: 8,
    status: 'rising',
    color: 'green',
    specialties: ['Corte Feminino', 'Escova', 'Hidratação'],
    occupancy: 78
  },
  {
    id: '3',
    name: 'Carla Santos',
    role: 'Manicure',
    appointments: 95,
    revenue: 4750,
    rating: 4.8,
    hoursWorked: 140,
    growth: 12,
    status: 'rising',
    color: 'purple',
    specialties: ['Manicure', 'Pedicure', 'Design'],
    occupancy: 85
  },
  {
    id: '4',
    name: 'Julia Lima',
    role: 'Cabelereira',
    appointments: 45,
    revenue: 5400,
    rating: 4.5,
    hoursWorked: 120,
    growth: -5,
    status: 'declining',
    color: 'rose',
    specialties: ['Corte Masculino', 'Barba'],
    occupancy: 55
  }
]

export function TeamPerformanceWidget({ accountId }: TeamPerformanceWidgetProps) {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'revenue' | 'appointments' | 'rating'>('revenue')

  useEffect(() => {
    const fetchTeam = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 600))
      setTeam(generateTeam())
      setLoading(false)
    }
    fetchTeam()
  }, [accountId])

  const sortedTeam = [...team].sort((a, b) => b[sortBy] - a[sortBy])

  const totalRevenue = team.reduce((acc, m) => acc + m.revenue, 0)
  const totalAppointments = team.reduce((acc, m) => acc + m.appointments, 0)
  const avgRating = team.reduce((acc, m) => acc + m.rating, 0) / team.length
  const avgOccupancy = team.reduce((acc, m) => acc + m.occupancy, 0) / team.length

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
              <Users className="w-4 h-4 text-white" />
            </div>
            Performance da Equipe
          </CardTitle>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-200">
            {team.length} membros
          </Badge>
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 mt-3">
          {(['revenue', 'appointments', 'rating'] as const).map((sort) => (
            <Button
              key={sort}
              variant={sortBy === sort ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy(sort)}
            >
              {sort === 'revenue' ? 'Receita' :
               sort === 'appointments' ? 'Agendamentos' : 'Avaliação'}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {/* Team Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 text-center">
            <p className="text-sm font-bold text-green-600">
              R$ {(totalRevenue / 1000).toFixed(1)}k
            </p>
            <p className="text-[9px] text-muted-foreground">Receita Total</p>
          </div>
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 text-center">
            <p className="text-sm font-bold text-blue-600">{totalAppointments}</p>
            <p className="text-[9px] text-muted-foreground">Agendamentos</p>
          </div>
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 text-center">
            <p className="text-sm font-bold text-amber-600">{avgRating.toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground">Avaliação Média</p>
          </div>
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20 text-center">
            <p className="text-sm font-bold text-purple-600">{avgOccupancy.toFixed(0)}%</p>
            <p className="text-[9px] text-muted-foreground">Ocupação Média</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTeam.map((member, index) => {
              const status = statusConfig[member.status]
              const StatusIcon = status.icon
              const colors = colorStyles[member.color as keyof typeof colorStyles]
              const isExpanded = expandedMember === member.id
              const revenuePercent = (member.revenue / totalRevenue) * 100

              return (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className={cn(
                    'relative overflow-hidden rounded-lg border transition-all cursor-pointer',
                    colors.border,
                    'hover:shadow-md',
                    isExpanded && 'ring-2 ring-primary/20'
                  )}
                  onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                >
                  <div className={cn('absolute inset-0 bg-gradient-to-r opacity-30', colors.gradient)} />

                  <div className="relative p-3">
                    <div className="flex items-center gap-3">
                      {/* Rank Badge */}
                      <motion.div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                          index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                          index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                          'bg-muted'
                        )}
                        whileHover={{ scale: 1.1, rotate: 10 }}
                      >
                        {index === 0 ? <Crown className="w-3.5 h-3.5" /> : index + 1}
                      </motion.div>

                      {/* Avatar */}
                      <Avatar className="h-9 w-9 border-2 border-white/50">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className={cn('text-white text-xs font-medium bg-gradient-to-br', colors.gradient)}>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-4 px-1 text-[9px] shrink-0',
                              status.color === 'amber' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                              status.color === 'green' ? 'bg-green-500/10 text-green-600 border-green-200' :
                              status.color === 'red' ? 'bg-red-500/10 text-red-600 border-red-200' :
                              'bg-blue-500/10 text-blue-600 border-blue-200'
                            )}
                          >
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {member.role}
                        </p>
                      </div>

                      {/* Quick Stats */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">
                          R$ {member.revenue.toLocaleString()}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span className="text-xs text-muted-foreground">{member.rating}</span>
                        </div>
                      </div>

                      <ChevronRight className={cn(
                        'w-4 h-4 text-muted-foreground shrink-0 transition-transform',
                        isExpanded && 'rotate-90'
                      )} />
                    </div>

                    {/* Occupancy Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Taxa de Ocupação</span>
                        <span className={cn('font-medium', member.occupancy >= 80 ? 'text-green-600' : 'text-amber-600')}>
                          {member.occupancy}%
                        </span>
                      </div>
                      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', colors.gradient)}
                          initial={{ width: 0 }}
                          animate={{ width: `${member.occupancy}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                        />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-3 border-t border-border/50"
                        >
                          <div className="grid grid-cols-4 gap-2 text-center mb-3">
                            <div className="p-2 rounded-lg bg-muted/30">
                              <p className="text-xs font-bold text-green-600">{member.appointments}</p>
                              <p className="text-[9px] text-muted-foreground">Agendamentos</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/30">
                              <p className="text-xs font-bold text-blue-600">{member.hoursWorked}h</p>
                              <p className="text-[9px] text-muted-foreground">Trabalhadas</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/30">
                              <p className="text-xs font-bold text-purple-600">
                                {member.growth > 0 ? '+' : ''}{member.growth}%
                              </p>
                              <p className="text-[9px] text-muted-foreground">Crescimento</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/30">
                              <p className="text-xs font-bold text-amber-600">{revenuePercent.toFixed(0)}%</p>
                              <p className="text-[9px] text-muted-foreground">Do Total</p>
                            </div>
                          </div>

                          {/* Specialties */}
                          <div className="flex flex-wrap gap-1">
                            {member.specialties.map((spec, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="h-5 px-1.5 text-[10px]"
                              >
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TeamPerformanceMini({ accountId }: { accountId?: string | null }) {
  const team = generateTeam().slice(0, 3)

  return (
    <div className="space-y-2">
      {team.map((member, index) => {
        const colors = colorStyles[member.color as keyof typeof colorStyles]

        return (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-2.5 rounded-lg border hover:shadow-sm transition-all cursor-pointer"
          >
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 bg-gradient-to-br',
              index === 0 ? 'from-amber-400 to-amber-600' :
              index === 1 ? 'from-gray-300 to-gray-500' :
              'from-amber-600 to-amber-800'
            )}>
              {index === 0 ? <Crown className="w-3 h-3" /> : index + 1}
            </div>
            <Avatar className="h-7 w-7">
              <AvatarFallback className={cn('text-white text-[10px] bg-gradient-to-br', colors.gradient)}>
                {member.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{member.name}</p>
              <p className="text-[10px] text-muted-foreground">R$ {member.revenue.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="text-xs">{member.rating}</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
