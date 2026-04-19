'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronRight, X, Sparkles, TrendingUp, Users, Calendar, MessageSquare, DollarSign, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tips = [
  {
    id: 1,
    icon: TrendingUp,
    title: 'Reduza No-Shows em 30%',
    description: 'Envie lembretes 24h antes do agendamento. Nossa IA mostra que isso reduz faltas significativamente.',
    category: 'Dica Pro',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 2,
    icon: Users,
    title: 'Fidelize seus Clientes',
    description: 'Clientes que retornam em 30 dias gastam 67% mais. Ofereça um desconto na próxima visita!',
    category: 'Retenção',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 3,
    icon: Calendar,
    title: 'Horários Estratégicos',
    description: '09h-11h e 14h-16h são os horários mais procurados. Considere adicionar profissionais nesses turnos.',
    category: 'Ocupação',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    id: 4,
    icon: MessageSquare,
    title: 'WhatsApp Automático',
    description: 'Configure mensagens automáticas para confirmação. Economize até 2h por dia em atendimento!',
    category: 'Automação',
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    id: 5,
    icon: DollarSign,
    title: 'Aumente seu Faturamento',
    description: 'Serviços complementares podem aumentar o ticket médio em 40%. Sugira combo de serviços!',
    category: 'Vendas',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 6,
    icon: Sparkles,
    title: 'Luna IA está aprendendo',
    description: 'Quanto mais você usar a Luna, mais ela entende seus clientes. Responda às mensagens!',
    category: 'IA',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    id: 7,
    icon: Zap,
    title: 'Pix Antecipado',
    description: 'Cobrar taxa de no-show via Pix aumenta a taxa de comparecimento em 45%.',
    category: 'Pagamentos',
    gradient: 'from-cyan-500 to-blue-500',
  },
];

export function TipOfTheDay() {
  // Initialize with tip based on day
  const getInitialTip = () => {
    const today = new Date().getDate();
    return tips[today % tips.length];
  };

  const getInitialDismissed = () => {
    if (typeof window === 'undefined') return false;
    const dismissedDate = localStorage.getItem('tipDismissedDate');
    const todayStr = new Date().toDateString();
    return dismissedDate === todayStr;
  };

  const [currentTip, setCurrentTip] = useState(getInitialTip);
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(getInitialDismissed);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('tipDismissedDate', new Date().toDateString());
  };

  const handleNextTip = () => {
    const currentIndex = tips.findIndex(t => t.id === currentTip.id);
    const nextIndex = (currentIndex + 1) % tips.length;
    setCurrentTip(tips[nextIndex]);
  };

  if (isDismissed) return null;

  const Icon = currentTip.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="relative overflow-hidden border-0 shadow-lg">
            <div className={`absolute inset-0 bg-gradient-to-r ${currentTip.gradient} opacity-10`} />
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <motion.div
                  className={`p-3 rounded-xl bg-gradient-to-r ${currentTip.gradient} shadow-lg`}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${currentTip.gradient} text-white`}>
                      {currentTip.category}
                    </span>
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{currentTip.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentTip.description}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextTip}
                      className="text-xs hover:bg-primary/10"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Próxima dica
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                      className="text-xs text-muted-foreground hover:bg-muted"
                    >
                      Não mostrar hoje
                    </Button>
                  </div>
                </div>

                {/* Dismiss Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Decorative Elements */}
                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-r from-primary/5 to-transparent blur-2xl" />
                <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-gradient-to-r from-transparent to-primary/5 blur-2xl" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
