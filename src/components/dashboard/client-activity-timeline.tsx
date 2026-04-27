'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Phone, MessageSquare, Calendar, 
  DollarSign, Clock, ChevronRight, Activity,
  TrendingUp, Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'appointment' | 'message' | 'payment' | 'call' | 'review';
  client: string;
  description: string;
  timestamp: Date;
  value?: string;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'appointment',
    client: 'Maria Silva',
    description: 'Agendou corte de cabelo',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    value: 'R$ 80',
  },
  {
    id: '2',
    type: 'message',
    client: 'João Santos',
    description: 'Enviou mensagem via WhatsApp',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: '3',
    type: 'payment',
    client: 'Ana Costa',
    description: 'Pagamento confirmado',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    value: 'R$ 150',
  },
  {
    id: '4',
    type: 'call',
    client: 'Carlos Oliveira',
    description: 'Ligação atendida - 5min',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    id: '5',
    type: 'review',
    client: 'Patricia Lima',
    description: 'Avaliação 5 estrelas',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    value: '★★★★★',
  },
];

interface ClientActivityTimelineProps {
  accountId?: string | null;
  variant?: 'default' | 'compact';
}

export function ClientActivityTimeline({ accountId, variant = 'default' }: ClientActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // In production, fetch from API
    const loadActivities = async () => {
      // Simulating async fetch
      await Promise.resolve();
      setActivities(mockActivities);
    };
    loadActivities();
  }, [accountId]);

  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      appointment: Calendar,
      message: MessageSquare,
      payment: DollarSign,
      call: Phone,
      review: Star,
    };
    return icons[type];
  };

  const getActivityColor = (type: Activity['type']) => {
    const colors = {
      appointment: 'bg-blue-500',
      message: 'bg-green-500',
      payment: 'bg-emerald-500',
      call: 'bg-purple-500',
      review: 'bg-yellow-500',
    };
    return colors[type];
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const displayedActivities = isExpanded ? activities : activities.slice(0, 3);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Activity className="h-5 w-5 text-primary" />
            </motion.div>
            Atividade Recente
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            {activities.length} hoje
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-primary/10" />

          {/* Activity items */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayedActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    layout
                    className="relative flex items-start gap-3 pl-2"
                  >
                    {/* Icon bubble */}
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className={cn(
                        'relative z-10 p-2 rounded-full text-white shadow-lg',
                        getActivityColor(activity.type)
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {activity.client}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                      {activity.value && (
                        <Badge variant="outline" className="mt-1.5 text-[10px] h-5">
                          {activity.value}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Expand/Collapse button */}
          {activities.length > 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 pt-2 border-t border-border/50"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-xs gap-1"
              >
                {isExpanded ? 'Ver menos' : `Ver mais ${activities.length - 3} atividades`}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="h-3 w-3 rotate-90" />
                </motion.div>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Stats footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-2"
        >
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {activities.filter(a => a.type === 'payment').length}
            </div>
            <div className="text-[10px] text-muted-foreground">Pagamentos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {activities.filter(a => a.type === 'appointment').length}
            </div>
            <div className="text-[10px] text-muted-foreground">Agendamentos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {activities.filter(a => a.type === 'message' || a.type === 'call').length}
            </div>
            <div className="text-[10px] text-muted-foreground">Contatos</div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
