'use client'

import { motion } from 'framer-motion'
import { Calendar, Plus, Clock, Users, Sparkles, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  type: 'appointments' | 'clients' | 'services' | 'professionals' | 'messages' | 'noshow' | 'plans'
  onAction?: () => void
  actionLabel?: string
  className?: string
}

const emptyStateConfig = {
  appointments: {
    icon: Calendar,
    title: 'Nenhum agendamento',
    description: 'Não há agendamentos para esta data. Clique para adicionar um novo agendamento.',
    actionLabel: 'Novo Agendamento',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500',
    bgIconColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  clients: {
    icon: Users,
    title: 'Nenhum cliente',
    description: 'Sua base de clientes está vazia. Adicione seu primeiro cliente para começar.',
    actionLabel: 'Novo Cliente',
    gradient: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-500',
    bgIconColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  services: {
    icon: Sparkles,
    title: 'Nenhum serviço',
    description: 'Cadastre seus serviços para começar a receber agendamentos.',
    actionLabel: 'Novo Serviço',
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-500',
    bgIconColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
  professionals: {
    icon: Users,
    title: 'Nenhum profissional',
    description: 'Adicione membros à sua equipe para gerenciar agendamentos.',
    actionLabel: 'Novo Profissional',
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-500',
    bgIconColor: 'bg-green-100 dark:bg-green-900/30'
  },
  messages: {
    icon: Clock,
    title: 'Nenhuma mensagem',
    description: 'Não há mensagens recentes. Suas conversas aparecerão aqui.',
    actionLabel: 'Nova Mensagem',
    gradient: 'from-teal-500/20 to-cyan-500/20',
    iconColor: 'text-teal-500',
    bgIconColor: 'bg-teal-100 dark:bg-teal-900/30'
  },
  noshow: {
    icon: Calendar,
    title: 'Nenhum no-show',
    description: 'Não há taxas de no-show pendentes. Ótimo trabalho!',
    actionLabel: undefined,
    gradient: 'from-red-500/20 to-orange-500/20',
    iconColor: 'text-red-500',
    bgIconColor: 'bg-red-100 dark:bg-red-900/30'
  },
  plans: {
    icon: Package,
    title: 'Nenhum plano',
    description: 'Crie planos de assinatura para seus clientes.',
    actionLabel: 'Novo Plano',
    gradient: 'from-indigo-500/20 to-purple-500/20',
    iconColor: 'text-indigo-500',
    bgIconColor: 'bg-indigo-100 dark:bg-indigo-900/30'
  }
}

export function EmptyState({ type, onAction, actionLabel, className }: EmptyStateProps) {
  const config = emptyStateConfig[type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className={cn(
          'relative w-24 h-24 rounded-2xl flex items-center justify-center mb-6',
          config.bgIconColor
        )}
      >
        <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-50', config.gradient)} />
        <Icon className={cn('w-10 h-10 relative z-10', config.iconColor)} />
        
        {/* Decorative elements */}
        <motion.div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-gray-800 shadow-md"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-white dark:bg-gray-800 shadow-md"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
      </motion.div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {config.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {config.description}
      </p>

      {onAction && (actionLabel || config.actionLabel) && (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={onAction}
            className={cn(
              'gap-2 shadow-lg hover:shadow-xl transition-shadow',
              type === 'appointments' && 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
              type === 'clients' && 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
              type === 'services' && 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
              type === 'professionals' && 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
              type === 'messages' && 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600',
              type === 'plans' && 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
            )}
          >
            <Plus className="w-4 h-4" />
            {actionLabel || config.actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}

export function EmptyStateCompact({ 
  message, 
  icon: Icon = Calendar,
  className 
}: { 
  message: string
  icon?: React.ElementType
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('flex items-center justify-center gap-2 py-4 text-muted-foreground', className)}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{message}</span>
    </motion.div>
  )
}
