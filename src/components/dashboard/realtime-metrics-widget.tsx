'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Users, Calendar, 
  DollarSign, Clock, Activity, Zap,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MetricData {
  label: string;
  value: number;
  previousValue: number;
  unit?: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: number;
  color: string;
  icon: React.ReactNode;
}

interface RealtimeMetric {
  name: string;
  current: number;
  previous: number;
  change: number;
  status: 'good' | 'warning' | 'critical';
}

const initialMetrics: MetricData[] = [
  {
    label: 'Agendamentos Hoje',
    value: 12,
    previousValue: 10,
    unit: '',
    trend: 'up',
    trendValue: 20,
    color: 'emerald',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    label: 'Taxa de Ocupação',
    value: 78,
    previousValue: 72,
    unit: '%',
    trend: 'up',
    trendValue: 8.3,
    color: 'blue',
    icon: <Activity className="h-4 w-4" />,
  },
  {
    label: 'Receita do Dia',
    value: 2450,
    previousValue: 2100,
    unit: 'R$',
    trend: 'up',
    trendValue: 16.7,
    color: 'green',
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    label: 'Tempo Médio',
    value: 45,
    previousValue: 50,
    unit: 'min',
    trend: 'down',
    trendValue: -10,
    color: 'purple',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    label: 'Clientes Atendidos',
    value: 8,
    previousValue: 9,
    unit: '',
    trend: 'down',
    trendValue: -11.1,
    color: 'amber',
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: 'Eficiência',
    value: 94,
    previousValue: 90,
    unit: '%',
    trend: 'up',
    trendValue: 4.4,
    color: 'cyan',
    icon: <Zap className="h-4 w-4" />,
  },
];

// Animated counter component
function AnimatedCounter({ 
  value, 
  previousValue, 
  unit, 
  duration = 1000 
}: { 
  value: number; 
  previousValue: number;
  unit?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(previousValue);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    const difference = endValue - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + difference * eased);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, displayValue]);

  const formatValue = (val: number) => {
    if (unit === 'R$') {
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return `${val.toLocaleString('pt-BR')}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <span className="font-mono tabular-nums">
      {formatValue(displayValue)}
    </span>
  );
}

export function RealtimeMetricsWidget({ accountId }: { accountId?: string | null }) {
  const [metrics, setMetrics] = useState<MetricData[]>(initialMetrics);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time updates
  const simulateUpdate = useCallback(() => {
    setMetrics(prev => prev.map(metric => {
      const change = Math.floor(Math.random() * 5) - 2;
      const newValue = Math.max(0, metric.value + change);
      const trendValue = ((newValue - metric.previousValue) / metric.previousValue) * 100;
      
      return {
        ...metric,
        value: newValue,
        trend: trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral',
        trendValue: Math.round(trendValue * 10) / 10,
      };
    }));
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(simulateUpdate, 5000);
    return () => clearInterval(interval);
  }, [isLive, simulateUpdate]);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
      emerald: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        gradient: 'from-emerald-500 to-emerald-600',
      },
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        gradient: 'from-blue-500 to-blue-600',
      },
      green: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        gradient: 'from-green-500 to-green-600',
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
        gradient: 'from-purple-500 to-purple-600',
      },
      amber: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        gradient: 'from-amber-500 to-amber-600',
      },
      cyan: {
        bg: 'bg-cyan-100 dark:bg-cyan-900/30',
        text: 'text-cyan-600 dark:text-cyan-400',
        border: 'border-cyan-200 dark:border-cyan-800',
        gradient: 'from-cyan-500 to-cyan-600',
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            Métricas em Tempo Real
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLive && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 bg-green-500 rounded-full"
              />
            )}
            <Badge 
              variant={isLive ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? 'AO VIVO' : 'PAUSADO'}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric, index) => {
            const colorClasses = getColorClasses(metric.color);
            
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "p-3 rounded-lg border",
                  colorClasses.bg,
                  colorClasses.border
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("p-1.5 rounded-md", colorClasses.bg)}>
                    <span className={colorClasses.text}>{metric.icon}</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-0.5 text-xs font-medium",
                    metric.trend === 'up' && 'text-green-600 dark:text-green-400',
                    metric.trend === 'down' && 'text-red-600 dark:text-red-400',
                    metric.trend === 'neutral' && 'text-muted-foreground'
                  )}>
                    {metric.trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
                    {metric.trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
                    {metric.trend === 'neutral' && <Minus className="h-3 w-3" />}
                    {Math.abs(metric.trendValue).toFixed(1)}%
                  </div>
                </div>
                
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className={cn("text-lg font-bold", colorClasses.text)}>
                    <AnimatedCounter 
                      value={metric.value} 
                      previousValue={metric.previousValue}
                      unit={metric.unit}
                    />
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Live indicator bar */}
        <motion.div 
          className="mt-4 h-1 rounded-full overflow-hidden bg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {isLive && (
            <motion.div
              className={cn("h-full bg-gradient-to-r", "from-green-500 to-emerald-500")}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ width: '50%' }}
            />
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

// Mini version for dashboard
export function RealtimeMetricsMini({ accountId }: { accountId?: string | null }) {
  const [appointments, setAppointments] = useState(12);
  const [revenue, setRevenue] = useState(2450);

  useEffect(() => {
    const interval = setInterval(() => {
      setAppointments(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
      setRevenue(prev => Math.max(0, prev + Math.floor(Math.random() * 200) - 100));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Agora</p>
              <p className="text-sm font-medium">
                {appointments} agendamentos
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="text-sm font-bold text-green-600">
              {revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
