'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Bell,
  Calendar,
  DollarSign,
  MessageSquare,
  Star,
  Zap,
  Gift
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'appointment' | 'payment' | 'message' | 'review' | 'achievement' | 'reward'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToastNotifications() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastNotifications must be used within ToastProvider')
  }
  return context
}

const toastConfig: Record<ToastType, { 
  icon: React.ElementType
  className: string
  gradient: string
}> = {
  success: {
    icon: CheckCircle,
    className: 'border-green-500/30',
    gradient: 'from-green-500/10 via-green-500/5 to-transparent'
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-500/30',
    gradient: 'from-red-500/10 via-red-500/5 to-transparent'
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-500/30',
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent'
  },
  info: {
    icon: Info,
    className: 'border-blue-500/30',
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent'
  },
  appointment: {
    icon: Calendar,
    className: 'border-violet-500/30',
    gradient: 'from-violet-500/10 via-violet-500/5 to-transparent'
  },
  payment: {
    icon: DollarSign,
    className: 'border-emerald-500/30',
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent'
  },
  message: {
    icon: MessageSquare,
    className: 'border-sky-500/30',
    gradient: 'from-sky-500/10 via-sky-500/5 to-transparent'
  },
  review: {
    icon: Star,
    className: 'border-yellow-500/30',
    gradient: 'from-yellow-500/10 via-yellow-500/5 to-transparent'
  },
  achievement: {
    icon: Zap,
    className: 'border-purple-500/30',
    gradient: 'from-purple-500/10 via-purple-500/5 to-transparent'
  },
  reward: {
    icon: Gift,
    className: 'border-pink-500/30',
    gradient: 'from-pink-500/10 via-pink-500/5 to-transparent'
  }
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const config = toastConfig[toast.type]
  const Icon = config.icon
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={cn(
        'relative w-full max-w-sm overflow-hidden rounded-xl border bg-card shadow-lg',
        config.className
      )}
    >
      {/* Gradient background */}
      <div className={cn('absolute inset-0 bg-gradient-to-r opacity-50', config.gradient)} />
      
      {/* Content */}
      <div className="relative flex items-start gap-3 p-4">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="flex-shrink-0"
        >
          <div className={cn(
            'p-2 rounded-lg',
            toast.type === 'success' ? 'bg-green-500/20 text-green-500' :
            toast.type === 'error' ? 'bg-red-500/20 text-red-500' :
            toast.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
            toast.type === 'info' ? 'bg-blue-500/20 text-blue-500' :
            toast.type === 'appointment' ? 'bg-violet-500/20 text-violet-500' :
            toast.type === 'payment' ? 'bg-emerald-500/20 text-emerald-500' :
            toast.type === 'message' ? 'bg-sky-500/20 text-sky-500' :
            toast.type === 'review' ? 'bg-yellow-500/20 text-yellow-500' :
            toast.type === 'achievement' ? 'bg-purple-500/20 text-purple-500' :
            'bg-pink-500/20 text-pink-500'
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </motion.div>
        
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        
        {/* Close button */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      
      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-primary/50"
        initial={{ width: '100%' }}
        animate={{ width: 0 }}
        transition={{ duration: toast.duration || 5000, ease: 'linear' }}
        onAnimationComplete={onRemove}
      />
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  
  const clearAll = useCallback(() => {
    setToasts([])
  }, [])
  
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem
                toast={toast}
                onRemove={() => removeToast(toast.id)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// Preset toast functions
export const toastPresets = {
  appointmentCreated: (clientName: string) => ({
    type: 'appointment' as ToastType,
    title: 'Agendamento criado!',
    description: `${clientName} foi agendado com sucesso.`
  }),
  
  paymentReceived: (amount: number) => ({
    type: 'payment' as ToastType,
    title: 'Pagamento recebido!',
    description: `R$ ${amount.toFixed(2)} foram creditados.`
  }),
  
  newMessage: (from: string) => ({
    type: 'message' as ToastType,
    title: 'Nova mensagem',
    description: `Mensagem de ${from}.`
  }),
  
  newReview: (stars: number) => ({
    type: 'review' as ToastType,
    title: 'Nova avaliação!',
    description: `${stars} estrelas recebidas.`
  }),
  
  achievement: (achievement: string) => ({
    type: 'achievement' as ToastType,
    title: 'Conquista desbloqueada!',
    description: achievement
  }),
  
  rewardEarned: (points: number) => ({
    type: 'reward' as ToastType,
    title: 'Recompensa ganha!',
    description: `+${points} pontos de fidelidade.`
  })
}
