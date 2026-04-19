'use client';

import { motion } from 'framer-motion';
import { 
  Calendar, Users, DollarSign, TrendingUp, 
  Clock, CheckCircle, AlertCircle, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatItem {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}

interface QuickStatsSummaryWidgetProps {
  accountId?: string | null;
  variant?: 'default' | 'mini';
}

export function QuickStatsSummaryWidget({ accountId, variant = 'default' }: QuickStatsSummaryWidgetProps) {
  // Mock data - in production, this would come from API
  const stats: StatItem[] = [
    {
      icon: Calendar,
      label: 'Agendamentos Hoje',
      value: 12,
      change: '+3',
      trend: 'up',
      color: 'text-blue-500',
    },
    {
      icon: CheckCircle,
      label: 'Confirmados',
      value: 8,
      change: '67%',
      trend: 'neutral',
      color: 'text-green-500',
    },
    {
      icon: Clock,
      label: 'Pendentes',
      value: 3,
      change: '-2',
      trend: 'down',
      color: 'text-amber-500',
    },
    {
      icon: AlertCircle,
      label: 'Cancelados',
      value: 1,
      change: '-50%',
      trend: 'down',
      color: 'text-red-500',
    },
    {
      icon: Users,
      label: 'Novos Clientes',
      value: 5,
      change: '+2',
      trend: 'up',
      color: 'text-purple-500',
    },
    {
      icon: DollarSign,
      label: 'Receita Hoje',
      value: 'R$ 1.250',
      change: '+18%',
      trend: 'up',
      color: 'text-emerald-500',
    },
  ];

  if (variant === 'mini') {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Resumo Rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {stats.slice(0, 4).map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon className={cn('h-3 w-3', stat.color)} />
                  <span className="text-[10px] text-muted-foreground truncate">{stat.label}</span>
                </div>
                <div className="text-lg font-bold">{stat.value}</div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BarChart3 className="h-5 w-5 text-primary" />
          </motion.div>
          Resumo Rápido do Dia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="relative group"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-muted/80 to-muted border border-border/50 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-md">
                {/* Icon and Label */}
                <div className="flex items-center gap-2 mb-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.2, type: 'spring', stiffness: 300 }}
                    className={cn('p-1.5 rounded-lg bg-background/80', stat.color)}
                  >
                    <stat.icon className="h-3.5 w-3.5" />
                  </motion.div>
                  <span className="text-xs text-muted-foreground font-medium truncate">
                    {stat.label}
                  </span>
                </div>

                {/* Value */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  className="text-2xl font-bold tracking-tight"
                >
                  {stat.value}
                </motion.div>

                {/* Change indicator */}
                {stat.change && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.4 }}
                    className={cn(
                      'text-xs mt-1.5 flex items-center gap-0.5',
                      stat.trend === 'up' && 'text-green-600 dark:text-green-400',
                      stat.trend === 'down' && 'text-red-600 dark:text-red-400',
                      stat.trend === 'neutral' && 'text-muted-foreground'
                    )}
                  >
                    {stat.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                    {stat.trend === 'down' && <TrendingUp className="h-3 w-3 rotate-180" />}
                    <span>{stat.change}</span>
                  </motion.div>
                )}

                {/* Decorative gradient on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Dados atualizados em tempo real</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Última atualização: agora</span>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

// Export a mini variant for sidebar
export function QuickStatsSummaryMini() {
  return <QuickStatsSummaryWidget variant="mini" />;
}
