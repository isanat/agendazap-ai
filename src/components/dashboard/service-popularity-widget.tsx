'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scissors,
  Sparkles,
  Palette,
  Heart,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  ChevronRight,
  DollarSign,
  Clock,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ServiceData {
  id: string
  name: string
  category: string
  bookings: number
  revenue: number
  growth: number
  avgDuration: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
  color: string
}

interface ServicePopularityWidgetProps {
  accountId?: string | null
}

const categoryIcons: Record<string, typeof Scissors> = {
  'Corte': Scissors,
  'Tratamento': Sparkles,
  'Coloração': Palette,
  'Beleza': Heart,
  'Outros': Sparkles
}

const serviceColors = [
  { gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  { gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
  { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
  { gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-500' },
]

const generateServiceData = (): ServiceData[] => [
  {
    id: '1',
    name: 'Corte Feminino',
    category: 'Corte',
    bookings: 145,
    revenue: 11600,
    growth: 12,
    avgDuration: 45,
    percentage: 28,
    trend: 'up',
    color: 'green'
  },
  {
    id: '2',
    name: 'Coloração',
    category: 'Coloração',
    bookings: 98,
    revenue: 14700,
    growth: 8,
    avgDuration: 120,
    percentage: 22,
    trend: 'up',
    color: 'blue'
  },
  {
    id: '3',
    name: 'Hidratação',
    category: 'Tratamento',
    bookings: 87,
    revenue: 5220,
    growth: -3,
    avgDuration: 60,
    percentage: 18,
    trend: 'down',
    color: 'purple'
  },
  {
    id: '4',
    name: 'Manicure',
    category: 'Beleza',
    bookings: 76,
    revenue: 3040,
    growth: 5,
    avgDuration: 45,
    percentage: 15,
    trend: 'up',
    color: 'amber'
  },
  {
    id: '5',
    name: 'Escova',
    category: 'Corte',
    bookings: 65,
    revenue: 2600,
    growth: 0,
    avgDuration: 30,
    percentage: 12,
    trend: 'stable',
    color: 'rose'
  }
]

export function ServicePopularityWidget({ accountId }: ServicePopularityWidgetProps) {
  const [services, setServices] = useState<ServiceData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart')
  const [selectedService, setSelectedService] = useState<string | null>(null)

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 700))
      setServices(generateServiceData())
      setLoading(false)
    }
    fetchServices()
  }, [accountId])

  const totalBookings = services.reduce((acc, s) => acc + s.bookings, 0)
  const totalRevenue = services.reduce((acc, s) => acc + s.revenue, 0)
  const topService = services[0]

  const colorMap: Record<string, { gradient: string; bg: string }> = {
    green: { gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
    blue: { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
    purple: { gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
    amber: { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
    rose: { gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-500' },
  }

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            Serviços Populares
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('chart')}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('list')}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
            <p className="text-lg font-bold text-green-600">{totalBookings}</p>
            <p className="text-[10px] text-muted-foreground">Agendamentos</p>
          </div>
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
            <p className="text-lg font-bold text-blue-600">
              R$ {(totalRevenue / 1000).toFixed(1)}k
            </p>
            <p className="text-[10px] text-muted-foreground">Receita</p>
          </div>
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
            <p className="text-lg font-bold text-amber-600">{topService?.name.split(' ')[0]}</p>
            <p className="text-[10px] text-muted-foreground">Top serviço</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : viewMode === 'chart' ? (
          /* Chart View - Horizontal Bar Chart */
          <div className="space-y-3">
            {services.map((service, index) => {
              const colorStyle = colorMap[service.color] || colorMap.green
              const isSelected = selectedService === service.id

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={cn(
                    'cursor-pointer transition-all rounded-lg',
                    isSelected && 'ring-2 ring-primary/20'
                  )}
                  onClick={() => setSelectedService(isSelected ? null : service.id)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate max-w-[120px]">
                        {service.name}
                      </span>
                      {service.trend === 'up' && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px] bg-green-500/10 text-green-600 border-green-200">
                          +{service.growth}%
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {service.percentage}%
                    </span>
                  </div>

                  {/* Animated Bar */}
                  <div className="relative h-8 rounded-lg bg-muted/50 overflow-hidden">
                    <motion.div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r',
                        colorStyle.gradient
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${service.percentage * 2}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                    >
                      <div className="absolute inset-0 bg-white/10" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs font-medium">
                        {service.bookings}
                      </div>
                    </motion.div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 p-2 rounded-lg bg-muted/30 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs font-medium text-green-600">
                              R$ {service.revenue.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Receita</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-blue-600">
                              {service.avgDuration}min
                            </p>
                            <p className="text-[10px] text-muted-foreground">Duração</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-amber-600">
                              {service.growth > 0 ? '+' : ''}{service.growth}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">Crescimento</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {services.map((service, index) => {
              const colorStyle = colorMap[service.color] || colorMap.green

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-all cursor-pointer group"
                  whileHover={{ x: 4 }}
                >
                  {/* Rank Badge */}
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                    index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                    'bg-muted'
                  )}>
                    {index + 1}
                  </div>

                  {/* Service Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {service.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" />
                        {service.bookings}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-2.5 h-2.5" />
                        R$ {service.revenue.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {service.avgDuration}min
                      </span>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className={cn(
                    'flex items-center gap-1 shrink-0',
                    service.trend === 'up' ? 'text-green-600' :
                    service.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                  )}>
                    {service.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : service.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <span className="text-xs">→</span>
                    )}
                    <span className="text-xs font-medium">
                      {service.growth > 0 ? '+' : ''}{service.growth}%
                    </span>
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

export function ServicePopularityMini({ accountId }: { accountId?: string | null }) {
  const services = generateServiceData().slice(0, 3)

  return (
    <div className="space-y-2">
      {services.map((service, index) => {
        const colorStyle = serviceColors[index]

        return (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-2.5 rounded-lg border hover:shadow-sm transition-all"
          >
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 bg-gradient-to-br',
              colorStyle.gradient
            )}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{service.name}</p>
              <p className="text-[10px] text-muted-foreground">{service.bookings} agendamentos</p>
            </div>
            <div className={cn(
              'flex items-center gap-0.5 text-[10px]',
              service.trend === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              {service.trend === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(service.growth)}%</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
