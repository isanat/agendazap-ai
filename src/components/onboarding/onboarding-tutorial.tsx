'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, ChevronLeft, ChevronRight, Sparkles, Calendar, 
  MessageSquare, CreditCard, Users, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao AgendaZap! 🎉',
    description: 'Transforme seu WhatsApp em uma recepcionista 24 horas. Vamos fazer um tour rápido pelo sistema.',
    icon: Sparkles,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'appointments',
    title: 'Agendamentos Inteligentes',
    description: 'Gerencie todos os agendamentos em um calendário visual. Arraste e solte para remarcar, clique para ver detalhes.',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Automático',
    description: 'Conecte seu WhatsApp e deixe a Luna, nossa IA, responder automaticamente seus clientes.',
    icon: MessageSquare,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'payments',
    title: 'Cobrança de No-Show',
    description: 'Cobre automaticamente clientes que não comparecem via PIX com Mercado Pago.',
    icon: CreditCard,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'clients',
    title: 'Gestão de Clientes',
    description: 'Veja o score de risco de cada cliente, histórico de agendamentos e muito mais.',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
]

interface OnboardingTutorialProps {
  onComplete?: () => void
}

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Check visibility on mount
  useEffect(() => {
    // Check if user has already seen onboarding
    const hasSeenOnboarding = localStorage.getItem('agendazap-onboarding-seen')
    if (hasSeenOnboarding !== 'true') {
      // Small delay to prevent flash
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    try {
      localStorage.setItem('agendazap-onboarding-seen', 'true')
    } catch (e) {
      console.error('Failed to save onboarding state:', e)
    }
    setIsVisible(false)
    setIsDismissed(true)
    onComplete?.()
  }

  const handleSkip = () => {
    handleComplete()
  }

  // Don't show if already seen or dismissed
  if (isDismissed || !isVisible) return null

  const step = onboardingSteps[currentStep]
  const Icon = step.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-lg"
        >
          <Card className="border-0 shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                <button
                  onClick={handleSkip}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center justify-center mb-4">
                  <motion.div
                    key={step.id}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className={cn(
                      'w-20 h-20 rounded-2xl flex items-center justify-center',
                      step.bgColor
                    )}
                  >
                    <Icon className={cn('w-10 h-10', step.color)} />
                  </motion.div>
                </div>
                
                <motion.h2
                  key={`title-${step.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold text-center"
                >
                  {step.title}
                </motion.h2>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <motion.p
                  key={`desc-${step.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-muted-foreground text-lg mb-6"
                >
                  {step.description}
                </motion.p>
                
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {onboardingSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        'w-2.5 h-2.5 rounded-full transition-all',
                        index === currentStep 
                          ? 'w-8 bg-green-500' 
                          : index < currentStep
                            ? 'bg-green-300'
                            : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Pular
                  </Button>
                  
                  <div className="flex gap-2">
                    {currentStep > 0 && (
                      <Button
                        variant="outline"
                        onClick={handlePrev}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Voltar
                      </Button>
                    )}
                    
                    <Button
                      onClick={handleNext}
                      className="bg-gradient-to-r from-green-500 to-emerald-600"
                    >
                      {currentStep === onboardingSteps.length - 1 ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Começar
                        </>
                      ) : (
                        <>
                          Próximo
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
