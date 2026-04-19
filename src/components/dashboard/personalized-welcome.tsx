'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Calendar, Clock, Sun, Moon, CloudSun } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { authFetch } from '@/lib/auth-fetch'

interface PersonalizedWelcomeProps {
  accountId?: string | null
}

// Calculate greeting based on current hour
function getGreeting() {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 12) {
    return { text: 'Bom dia', Icon: Sun }
  } else if (hour >= 12 && hour < 18) {
    return { text: 'Boa tarde', Icon: CloudSun }
  } else {
    return { text: 'Boa noite', Icon: Moon }
  }
}

export function PersonalizedWelcome({ accountId }: PersonalizedWelcomeProps) {
  const { user } = useAppStore()
  const [appointmentsToday, setAppointmentsToday] = useState(0)
  
  // Fetch appointments count
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!accountId) return
      
      try {
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const data = await response.json()
          setAppointmentsToday(data.stats?.todayAppointments || 0)
        }
      } catch (error) {
        console.error('Error fetching appointments:', error)
      }
    }
    
    fetchAppointments()
  }, [accountId])
  
  // Use useMemo to calculate greeting without setState in effect
  const { text: greeting, Icon } = useMemo(() => {
    return getGreeting()
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'Usuário'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div>
          <motion.h1 
            className="text-3xl font-bold"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {greeting}, <span className="text-green-600">{firstName}</span>! 👋
          </motion.h1>
          <motion.p 
            className="text-muted-foreground mt-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {appointmentsToday > 0 
              ? `Você tem ${appointmentsToday} agendamento${appointmentsToday > 1 ? 's' : ''} hoje`
              : 'Nenhum agendamento para hoje'}
          </motion.p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="hidden sm:block"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-3 h-3 text-amber-800" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function DashboardQuickInfo() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const formatDate = () => {
    return currentTime.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  const formatTime = () => {
    return currentTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get timezone info
  const getTimezoneInfo = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const offset = -currentTime.getTimezoneOffset()
    const offsetHours = Math.floor(Math.abs(offset) / 60)
    const offsetMinutes = Math.abs(offset) % 60
    const sign = offset >= 0 ? '+' : '-'
    return {
      name: timezone.split('/').pop()?.replace('_', ' ') || timezone,
      offset: `UTC${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`
    }
  }

  const timezoneInfo = getTimezoneInfo()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground"
    >
      <div className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4" />
        <span className="capitalize">{formatDate()}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4" />
        <span>{formatTime()}</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50">
        <span className="text-xs">{timezoneInfo.name}</span>
        <span className="text-xs font-mono">({timezoneInfo.offset})</span>
      </div>
    </motion.div>
  )
}
