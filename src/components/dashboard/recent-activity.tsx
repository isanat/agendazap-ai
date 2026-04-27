'use client'

import { motion } from 'framer-motion'
import {
  CalendarCheck,
  MessageSquare,
  DollarSign,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface ActivityItem {
  id: string
  type: 'appointment' | 'message' | 'payment' | 'client' | 'noshow' | 'completed'
  title: string
  description: string
  timestamp: string
}

interface RecentActivityProps {
  accountId?: string | null
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min atrás`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h atrás`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d atrás`
}

const iconMap = {
  appointment: CalendarCheck,
  message: MessageSquare,
  payment: DollarSign,
  client: UserPlus,
  noshow: AlertTriangle,
  completed: CheckCircle
}

const colorMap = {
  appointment: { color: 'text-green-600', bgColor: 'bg-green-500/10' },
  message: { color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  payment: { color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  client: { color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  noshow: { color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
  completed: { color: 'text-green-600', bgColor: 'bg-green-500/10' }
}

export function RecentActivity({ accountId }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const data = await response.json()
          setActivities(data.recentActivity || [])
          setStats({
            today: data.stats?.todayAppointments || 0,
            week: data.stats?.weekAppointments || 0,
            month: data.stats?.monthAppointments || 0
          })
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  return (
    <Card className="border-0 shadow-lg overflow-hidden relative">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-blue-600" />
            Atividade Recente
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => window.location.href = '/?tab=reports'}>
            Ver Todas
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">Nenhuma atividade recente</p>
            <p className="text-sm">As atividades aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
            {activities.map((activity, index) => {
              const Icon = iconMap[activity.type] || CalendarCheck
              const colors = colorMap[activity.type] || colorMap.appointment

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl transition-all',
                    'hover:bg-muted/50 cursor-pointer group'
                  )}
                >
                  <div className={cn('p-2 rounded-lg shrink-0', colors.bgColor)}>
                    <Icon className={cn('w-4 h-4', colors.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate group-hover:text-green-600 transition-colors">
                        {activity.title}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {activity.description}
                    </p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all shrink-0 mt-1" />
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-green-600">{stats.today}</p>
            <p className="text-[10px] text-muted-foreground">Hoje</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-blue-600">{stats.week}</p>
            <p className="text-[10px] text-muted-foreground">Semana</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-purple-600">{stats.month}</p>
            <p className="text-[10px] text-muted-foreground">Mês</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ActivityFeedCompact({ accountId }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const data = await response.json()
          setActivities((data.recentActivity || []).slice(0, 3))
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  if (loading || activities.length === 0) return null

  return (
    <div className="space-y-2">
      {activities.map((activity, index) => {
        const Icon = iconMap[activity.type] || CalendarCheck
        const colors = colorMap[activity.type] || colorMap.appointment

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2 text-sm"
          >
            <div className={cn('p-1 rounded', colors.bgColor)}>
              <Icon className={cn('w-3 h-3', colors.color)} />
            </div>
            <span className="truncate flex-1">{activity.title}</span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(activity.timestamp)}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
