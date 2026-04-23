'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  CalendarPlus, 
  UserPlus, 
  MessageSquare, 
  DollarSign,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuickAction {
  icon: typeof CalendarPlus
  label: string
  description: string
  color: string
  bgColor: string
  hoverColor: string
  href: string
}

const quickActions: QuickAction[] = [
  {
    icon: CalendarPlus,
    label: 'Novo Agendamento',
    description: 'Agendar cliente',
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    hoverColor: 'hover:bg-green-500/20',
    href: '/?tab=appointments'
  },
  {
    icon: UserPlus,
    label: 'Novo Cliente',
    description: 'Cadastrar cliente',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    hoverColor: 'hover:bg-blue-500/20',
    href: '/?tab=clients'
  },
  {
    icon: MessageSquare,
    label: 'Enviar Mensagem',
    description: 'WhatsApp em massa',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    hoverColor: 'hover:bg-purple-500/20',
    href: '/?tab=whatsapp'
  },
  {
    icon: DollarSign,
    label: 'Cobrar Taxa',
    description: 'No-show pendente',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    hoverColor: 'hover:bg-orange-500/20',
    href: '/?tab=noshow'
  },
]

export function QuickActions() {
  const router = useRouter()

  return (
    <Card className="border-0 shadow-lg overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/5 to-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-4 h-4 text-green-600" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="ghost"
                className={cn(
                  'w-full h-auto flex flex-col items-center gap-2 p-4 rounded-xl transition-all',
                  action.bgColor,
                  action.hoverColor
                )}
                onClick={() => router.push(action.href)}
              >
                <div className={cn('p-2 rounded-lg', action.bgColor)}>
                  <action.icon className={cn('w-5 h-5', action.color)} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickActionsCompact() {
  const router = useRouter()

  return (
    <div className="flex flex-wrap gap-2">
      {quickActions.slice(0, 4).map((action, index) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-2', action.bgColor, action.hoverColor)}
            onClick={() => router.push(action.href)}
          >
            <action.icon className={cn('w-4 h-4', action.color)} />
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        </motion.div>
      ))}
    </div>
  )
}
