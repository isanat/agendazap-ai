'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Phone,
  Mail,
  Calendar,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  MessageSquare,
  Award,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Target,
  Heart,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ClientCardProps {
  client: {
    id: string
    name: string
    email: string
    phone: string
    avatar?: string
    totalAppointments: number
    noShowCount: number
    noShowScore: number
    lastVisit: string | null
    totalSpent: number
    loyaltyPoints: number
    preferredServices: string[]
    nextAppointment?: {
      date: string
      service: string
    }
  }
  onSendMessage?: () => void
  onScheduleAppointment?: () => void
}

// Animated counter
function AnimatedValue({ 
  value, 
  prefix = '', 
  suffix = '' 
}: { 
  value: number
  prefix?: string
  suffix?: string 
}) {
  const [displayValue, setDisplayValue] = useState(0)
  
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onAnimationStart={() => {
        let start = 0
        const duration = 1000
        const increment = value / (duration / 16)
        
        const animate = () => {
          start += increment
          if (start < value) {
            setDisplayValue(Math.floor(start))
            requestAnimationFrame(animate)
          } else {
            setDisplayValue(value)
          }
        }
        
        animate()
      }}
    >
      {prefix}{displayValue.toLocaleString('pt-BR')}{suffix}
    </motion.span>
  )
}

// Risk score gauge
function RiskGauge({ score }: { score: number }) {
  const getRiskLevel = (s: number) => {
    if (s >= 70) return { label: 'Alto', color: 'text-red-500', bg: 'bg-red-500' }
    if (s >= 40) return { label: 'Médio', color: 'text-amber-500', bg: 'bg-amber-500' }
    return { label: 'Baixo', color: 'text-green-500', bg: 'bg-green-500' }
  }
  
  const risk = getRiskLevel(score)
  
  return (
    <div className="relative w-24 h-12">
      {/* Gauge background */}
      <svg className="w-full h-full" viewBox="0 0 100 50">
        <defs>
          <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d="M 10 45 A 40 40 0 0 1 90 45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <motion.path
          d="M 10 45 A 40 40 0 0 1 90 45"
          fill="none"
          stroke="url(#riskGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: score / 100 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {/* Needle */}
        <motion.g
          initial={{ rotate: -90 }}
          animate={{ rotate: -90 + (score / 100) * 180 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ transformOrigin: '50px 45px' }}
        >
          <line
            x1="50"
            y1="45"
            x2="50"
            y2="20"
            stroke="currentColor"
            strokeWidth="2"
            className={risk.color}
          />
          <circle cx="50" cy="45" r="4" className={risk.color} fill="currentColor" />
        </motion.g>
      </svg>
      
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
        <span className={cn('text-xs font-medium', risk.color)}>{score}%</span>
      </div>
    </div>
  )
}

export function EnhancedClientCard({ 
  client,
  onSendMessage,
  onScheduleAppointment
}: ClientCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  const getRiskBadge = (score: number) => {
    if (score >= 70) return { label: 'Alto Risco', variant: 'destructive' as const }
    if (score >= 40) return { label: 'Risco Médio', variant: 'secondary' as const }
    return { label: 'Baixo Risco', variant: 'default' as const }
  }
  
  const riskBadge = getRiskBadge(client.noShowScore)
  const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md">
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 to-purple-500/0 group-hover:from-violet-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none" />
        
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative"
            >
              <Avatar className="w-14 h-14 border-2 border-background shadow-lg">
                <AvatarImage src={client.avatar} />
                <AvatarFallback className={cn(
                  'text-lg font-semibold',
                  client.noShowScore >= 70 ? 'bg-gradient-to-br from-red-400 to-rose-500' :
                  client.noShowScore >= 40 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                  'bg-gradient-to-br from-green-400 to-emerald-500'
                )}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              {/* Online indicator */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background bg-green-500"
              />
            </motion.div>
            
            {/* Client info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base truncate">{client.name}</CardTitle>
                {client.loyaltyPoints > 100 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                  </motion.div>
                )}
              </div>
              
              <div className="flex items-center gap-3 mt-1">
                <Badge variant={riskBadge.variant} className="text-[10px] px-2 py-0 h-5">
                  {riskBadge.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {client.totalAppointments} agendamentos
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-2 rounded-lg bg-muted/50 text-center"
            >
              <DollarSign className="w-4 h-4 mx-auto text-green-500" />
              <p className="text-sm font-semibold mt-1">
                R$ {(client.totalSpent / 1000).toFixed(1)}k
              </p>
              <p className="text-[10px] text-muted-foreground">Total gasto</p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-2 rounded-lg bg-muted/50 text-center"
            >
              <Calendar className="w-4 h-4 mx-auto text-blue-500" />
              <p className="text-sm font-semibold mt-1">{client.totalAppointments}</p>
              <p className="text-[10px] text-muted-foreground">Visitas</p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-2 rounded-lg bg-muted/50 text-center"
            >
              <Award className="w-4 h-4 mx-auto text-purple-500" />
              <p className="text-sm font-semibold mt-1">{client.loyaltyPoints}</p>
              <p className="text-[10px] text-muted-foreground">Pontos</p>
            </motion.div>
          </div>
          
          {/* Risk gauge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Score de Risco</span>
            </div>
            <RiskGauge score={client.noShowScore} />
          </div>
          
          {/* Preferred services */}
          {client.preferredServices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Serviços Preferidos</p>
              <div className="flex flex-wrap gap-1">
                {client.preferredServices.slice(0, 3).map((service, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Badge variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  </motion.div>
                ))}
                {client.preferredServices.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{client.preferredServices.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Next appointment */}
          {client.nextAppointment && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500/20">
                  <Calendar className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Próximo agendamento</p>
                  <p className="text-sm font-medium">{client.nextAppointment.date}</p>
                </div>
                <p className="text-xs text-green-600 font-medium">{client.nextAppointment.service}</p>
              </div>
            </motion.div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onSendMessage}
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Mensagem
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              onClick={onScheduleAppointment}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Agendar
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
