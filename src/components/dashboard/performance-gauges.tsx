'use client';

import { motion } from 'framer-motion';
import { 
  Gauge, TrendingUp, TrendingDown, Minus,
  Zap, Clock, Users, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GaugeMetric {
  id: string;
  label: string;
  value: number;
  max: number;
  unit: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  color: string;
  icon: React.ElementType;
}

const metrics: GaugeMetric[] = [
  {
    id: 'occupancy',
    label: 'Ocupação',
    value: 78,
    max: 100,
    unit: '%',
    trend: 'up',
    trendValue: '+5%',
    color: '#22c55e',
    icon: Target,
  },
  {
    id: 'response',
    label: 'Resposta',
    value: 92,
    max: 100,
    unit: '%',
    trend: 'up',
    trendValue: '+12%',
    color: '#3b82f6',
    icon: Zap,
  },
  {
    id: 'satisfaction',
    label: 'Satisfação',
    value: 4.8,
    max: 5,
    unit: '★',
    trend: 'neutral',
    trendValue: '0',
    color: '#eab308',
    icon: Users,
  },
  {
    id: 'efficiency',
    label: 'Eficiência',
    value: 85,
    max: 100,
    unit: '%',
    trend: 'up',
    trendValue: '+8%',
    color: '#8b5cf6',
    icon: Clock,
  },
];

interface PerformanceGaugesProps {
  accountId?: string | null;
  variant?: 'default' | 'mini';
}

export function PerformanceGauges({ accountId, variant = 'default' }: PerformanceGaugesProps) {
  // Calculate the arc path for SVG gauge
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const getAngle = (value: number, max: number) => {
    return (value / max) * 180;
  };

  if (variant === 'mini') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <metric.icon className="h-3 w-3" style={{ color: metric.color }} />
                  <span className="text-[10px] text-muted-foreground">{metric.label}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: metric.color }}>
                  {metric.value}{metric.unit}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <motion.div
            initial={{ rotate: -180 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.8, type: 'spring' }}
          >
            <Gauge className="h-5 w-5 text-primary" />
          </motion.div>
          Indicadores de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const angle = getAngle(metric.value, metric.max);
            
            return (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15, duration: 0.4 }}
                className="relative flex flex-col items-center"
              >
                {/* SVG Gauge */}
                <div className="relative w-24 h-12 overflow-hidden">
                  <svg
                    viewBox="0 0 100 60"
                    className="w-full h-full"
                  >
                    {/* Background arc */}
                    <path
                      d={describeArc(50, 55, 40, 0, 180)}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/30"
                    />
                    {/* Value arc */}
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: metric.value / metric.max }}
                      transition={{ duration: 1.5, delay: index * 0.15, ease: 'easeOut' }}
                      d={describeArc(50, 55, 40, 0, angle)}
                      fill="none"
                      stroke={metric.color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      style={{ pathLength: metric.value / metric.max }}
                    />
                  </svg>
                  
                  {/* Center icon */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.15 + 0.5, type: 'spring' }}
                      className="p-1.5 rounded-full bg-background shadow-md"
                    >
                      <metric.icon className="h-3 w-3" style={{ color: metric.color }} />
                    </motion.div>
                  </div>
                </div>

                {/* Value */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.15 + 0.3 }}
                  className="mt-3 text-center"
                >
                  <div className="text-2xl font-bold" style={{ color: metric.color }}>
                    {metric.value}
                    <span className="text-sm font-normal ml-0.5">{metric.unit}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{metric.label}</div>
                  
                  {/* Trend indicator */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15 + 0.6 }}
                    className={cn(
                      'flex items-center justify-center gap-0.5 mt-1 text-[10px] font-medium',
                      metric.trend === 'up' && 'text-green-600',
                      metric.trend === 'down' && 'text-red-600',
                      metric.trend === 'neutral' && 'text-muted-foreground'
                    )}
                  >
                    {metric.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                    {metric.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                    {metric.trend === 'neutral' && <Minus className="h-3 w-3" />}
                    {metric.trendValue}
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Overall score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-4 pt-3 border-t border-border/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Score Geral</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '86%' }}
                  transition={{ duration: 1, delay: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                />
              </div>
              <span className="text-sm font-bold text-green-600">86%</span>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

// Export mini variant
export function PerformanceGaugesMini() {
  return <PerformanceGauges variant="mini" />;
}
