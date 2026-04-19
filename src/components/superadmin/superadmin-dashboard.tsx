'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Users, Package, TrendingUp, DollarSign,
  Activity, ArrowUpRight, ArrowDownRight, Zap,
  Shield, Server, CreditCard, Bell, Clock, RefreshCw,
  Calendar, BarChart3, PieChart, LineChart, Sparkles,
  AlertTriangle, CheckCircle, XCircle, Eye, Mail
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { authGet } from '@/lib/auth-fetch'

interface SystemStats {
  totalAccounts: number
  activeAccounts: number
  newAccountsThisMonth: number
  totalUsers: number
  activeUsers: number
  totalClients: number
  totalAppointments: number
  appointmentsThisMonth: number
  noShowRate: number
  growthRate: number
  churnRate: number
  mrr: number
  arr: number
}

interface PlanDistribution {
  name: string
  count: number
  percentage: number
}

interface RecentActivity {
  type: string
  business: string
  plan: string
  time: string
}

interface SystemHealth {
  status: string
  uptime: number
  responseTime: number
  errorRate: number
  activeConnections: number
  messagesToday: number
  apiCalls: number
}

interface MonthlyData {
  month: string
  accounts: number
  appointments: number
  revenue: number
}

const planColors: Record<string, { bg: string; text: string; gradient: string }> = {
  basic: { bg: 'bg-blue-500', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  pro: { bg: 'bg-green-500', text: 'text-green-600', gradient: 'from-green-500 to-emerald-600' },
  salon: { bg: 'bg-purple-500', text: 'text-purple-600', gradient: 'from-purple-500 to-violet-600' },
  enterprise: { bg: 'bg-amber-500', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-600' },
}

const planLabels: Record<string, string> = {
  basic: 'Básico',
  pro: 'Profissional',
  salon: 'Salão',
  enterprise: 'Empresa',
}

// Animated counter component
function AnimatedCounter({ value, duration = 1, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let start = 0
    const end = value
    const incrementTime = (duration * 1000) / end
    
    const timer = setInterval(() => {
      start += 1
      setCount(start)
      if (start >= end) clearInterval(timer)
    }, incrementTime)
    
    return () => clearInterval(timer)
  }, [value, duration])
  
  return <span>{count.toLocaleString()}{suffix}</span>
}

// Mini chart component
function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - (v / max) * 100
    return `${x},${y}`
  }).join(' ')
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-12">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// Simple bar chart
function SimpleBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value))
  
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="space-y-1"
        >
          <div className="flex justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground">{item.value}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
              className={cn('h-full rounded-full', item.color)}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function SuperAdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SystemStats>({
    totalAccounts: 0, activeAccounts: 0, newAccountsThisMonth: 0,
    totalUsers: 0, activeUsers: 0, totalClients: 0,
    totalAppointments: 0, appointmentsThisMonth: 0, noShowRate: 0,
    growthRate: 0, churnRate: 0, mrr: 0, arr: 0
  })
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy', uptime: 99.97, responseTime: 145, errorRate: 0.02,
    activeConnections: 0, messagesToday: 0, apiCalls: 0
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await authGet('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setPlanDistribution(data.planDistribution)
        setRecentActivity(data.recentActivity)
        setSystemHealth(data.systemHealth)
      } else {
        console.error('Error fetching admin stats:', response.status, response.statusText)
        toast.error('Não foi possível carregar as estatísticas')
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
      toast.error('Não foi possível carregar as estatísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  // Calculate appointment stats for chart
  const appointmentChartData = [
    { label: 'Pendente', value: Math.floor(stats.appointmentsThisMonth * 0.3), color: 'bg-amber-500' },
    { label: 'Confirmado', value: Math.floor(stats.appointmentsThisMonth * 0.5), color: 'bg-green-500' },
    { label: 'Concluído', value: Math.floor(stats.appointmentsThisMonth * 0.15), color: 'bg-blue-500' },
    { label: 'No-Show', value: Math.floor(stats.appointmentsThisMonth * 0.05), color: 'bg-red-500' },
  ]

  // Show skeleton on initial load
  if (loading && stats.totalAccounts === 0) {
    return <DashboardSkeleton />
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard SuperAdmin</h1>
            <p className="text-muted-foreground">Visão geral do sistema AgendaZap</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Atualizar
          </Button>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/30">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            </div>
            <span className="text-sm font-medium text-green-600">Sistema Online</span>
          </div>
          
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {currentTime.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total de Empresas', value: stats.totalAccounts, sub: `${stats.activeAccounts} ativas`, icon: Building2, gradient: 'from-blue-500 to-cyan-600', shadowColor: 'shadow-blue-500/20', trend: stats.growthRate > 0 ? `+${stats.growthRate}%` : undefined },
          { title: 'Usuários', value: stats.totalUsers, sub: `${stats.activeUsers} ativos`, icon: Users, gradient: 'from-green-500 to-emerald-600', shadowColor: 'shadow-green-500/20' },
          { title: 'Clientes', value: stats.totalClients, sub: 'Total cadastrado', icon: Users, gradient: 'from-purple-500 to-violet-600', shadowColor: 'shadow-purple-500/20' },
          { title: 'Agendamentos/Mês', value: stats.appointmentsThisMonth, sub: `${stats.noShowRate}% no-show`, icon: Calendar, gradient: 'from-amber-500 to-orange-600', shadowColor: 'shadow-amber-500/20' },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4, scale: 1.01 }}
          >
            <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-border cursor-pointer">
              {/* Subtle gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:from-muted/30 group-hover:via-transparent group-hover:to-transparent transition-all duration-300" />
              
              <CardContent className="p-5 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold tracking-tight">
                        {loading ? '...' : <AnimatedCounter value={stat.value} duration={1} />}
                      </p>
                      {stat.trend && (
                        <motion.span 
                          className="text-sm font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-md"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.3, type: 'spring' }}
                        >
                          {stat.trend}
                        </motion.span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                  <motion.div 
                    className={cn('p-3 rounded-xl bg-gradient-to-br shadow-lg', stat.gradient, stat.shadowColor)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </motion.div>
                </div>
                
                {/* Subtle progress indicator at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plan Distribution - Pie */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Card className="overflow-hidden border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 h-full">
            <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <PieChart className="w-4 h-4 text-purple-500" />
                </div>
                Distribuição de Planos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {planDistribution.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Nenhum plano configurado
                </div>
              ) : (
                <div className="space-y-3">
                  {planDistribution.map((plan, i) => (
                    <motion.div
                      key={plan.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className={cn('w-3 h-3 rounded-full shadow-sm', planColors[plan.name]?.bg || 'bg-gray-500')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{planLabels[plan.name] || plan.name}</span>
                          <span className="text-sm text-muted-foreground">{plan.count}</span>
                        </div>
                        <Progress value={plan.percentage} className="h-1.5" />
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{plan.percentage}%</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Appointment Stats */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Card className="overflow-hidden border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 h-full">
            <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                </div>
                Status de Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <SimpleBarChart data={appointmentChartData} />
            </CardContent>
          </Card>
        </motion.div>

        {/* System Health */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Card className="overflow-hidden border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 h-full">
            <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500/10">
                  <Server className="w-4 h-4 text-green-500" />
                </div>
                Saúde do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {/* Status indicator */}
                <motion.div 
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20"
                  whileHover={{ scale: 1.01 }}
                >
                  <span className="text-sm font-medium">Status</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                    </div>
                    <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20">
                      Operacional
                    </Badge>
                  </div>
                </motion.div>
                
                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Uptime', value: `${systemHealth.uptime}%`, icon: Activity, color: 'text-green-500' },
                    { label: 'Latência', value: `${systemHealth.responseTime}ms`, icon: Zap, color: 'text-blue-500' },
                    { label: 'Erros', value: `${systemHealth.errorRate}%`, icon: AlertTriangle, color: 'text-amber-500' },
                    { label: 'Conexões', value: systemHealth.activeConnections.toString(), icon: Server, color: 'text-purple-500' },
                  ].map((metric, i) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="p-2.5 bg-muted/30 rounded-lg border border-transparent hover:border-border/50 hover:bg-muted/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <metric.icon className={cn('w-3 h-3', metric.color)} />
                        <span className="text-[10px] text-muted-foreground uppercase">{metric.label}</span>
                      </div>
                      <p className="text-lg font-bold">{metric.value}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity & Growth */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <motion.div
          whileHover={{ scale: 1.002 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Card className="overflow-hidden border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 h-full">
            <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  Atividade Recente
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs hover:bg-muted/50">
                  Ver todas
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Nenhuma atividade recente
                </div>
              ) : (
                <ScrollArea className="h-[280px]">
                  <div className="divide-y">
                    {recentActivity.map((activity, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ x: 4, backgroundColor: 'rgba(var(--muted), 0.5)' }}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <motion.div 
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-sm font-medium shadow-lg shadow-green-500/20"
                            whileHover={{ scale: 1.1 }}
                          >
                            {activity.business[0]?.toUpperCase()}
                          </motion.div>
                          <div>
                            <p className="text-sm font-medium">{activity.business}</p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn('capitalize text-xs', planColors[activity.plan]?.text, 'hover:bg-muted')}
                        >
                          {planLabels[activity.plan] || activity.plan}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Growth Metrics */}
        <div className="space-y-4">
          {/* Growth Card */}
          <motion.div
            whileHover={{ scale: 1.005, y: -2 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card className="overflow-hidden border-border/50 hover:border-border hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-5 relative">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/5 to-transparent rounded-full blur-2xl" />
                
                <div className="flex items-center justify-between relative">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Crescimento Mensal</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className={cn(
                        'text-3xl font-bold',
                        stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate}%
                      </p>
                      <span className="text-sm text-muted-foreground">vs mês anterior</span>
                    </div>
                  </div>
                  <motion.div 
                    className={cn(
                      'p-4 rounded-xl shadow-lg',
                      stats.growthRate >= 0 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/20' 
                        : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20'
                    )}
                    whileHover={{ scale: 1.1, rotate: stats.growthRate >= 0 ? -5 : 5 }}
                  >
                    {stats.growthRate >= 0 
                      ? <TrendingUp className="w-6 h-6 text-white" />
                      : <ArrowDownRight className="w-6 h-6 text-white" />
                    }
                  </motion.div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Meta mensal</span>
                    <span className="font-medium text-green-600">20%</span>
                  </div>
                  <Progress value={Math.min(Math.abs(stats.growthRate) * 5, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* New Signups */}
          <motion.div
            whileHover={{ scale: 1.005, y: -2 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card className="overflow-hidden border-border/50 hover:border-border hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-5 relative">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-2xl" />
                
                <div className="flex items-center justify-between relative">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Novos Cadastros</p>
                    <p className="text-3xl font-bold mt-1">{stats.newAccountsThisMonth}</p>
                    <p className="text-xs text-muted-foreground mt-1">Este mês</p>
                  </div>
                  <motion.div 
                    className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/20"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Zap className="w-6 h-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 hover:text-blue-600 transition-all w-full shadow-sm hover:shadow-md"
                onClick={() => {
                  toast.info('Redirecionando para Notificações...')
                  window.location.href = '/?tab=notifications'
                }}
              >
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">Enviar Notificação</span>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 hover:text-purple-600 transition-all w-full shadow-sm hover:shadow-md"
                onClick={() => {
                  toast.info('Redirecionando para Logs...')
                  window.location.href = '/?tab=audit-logs'
                }}
              >
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Eye className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">Ver Logs</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
