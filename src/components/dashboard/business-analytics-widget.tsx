'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Calendar,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { authFetch } from '@/lib/auth-fetch';

interface BusinessAnalyticsWidgetProps {
  accountId?: string | null;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: typeof DollarSign;
  iconColor: string;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, change, changeLabel, icon: Icon, iconColor, trend = 'neutral' }: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-xl bg-card border border-border/50 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        {change !== undefined && (
          <Badge 
            variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}
            className={`text-[10px] ${trend === 'up' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}`}
          >
            {trend === 'up' && <ArrowUpRight className="h-3 w-3 mr-0.5" />}
            {trend === 'down' && <ArrowDownRight className="h-3 w-3 mr-0.5" />}
            {change > 0 ? '+' : ''}{change}%
          </Badge>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        {changeLabel && (
          <p className="text-[10px] text-muted-foreground mt-1">{changeLabel}</p>
        )}
      </div>
    </motion.div>
  );
}

export function BusinessAnalyticsWidget({ accountId }: BusinessAnalyticsWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    weekRevenue: 0,
    avgTicket: 0,
    newClients: 0,
    returnRate: 0,
    monthlyGoal: 0,  // Will be populated from API when available
    monthlyProgress: 0
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const fetchData = async () => {
    if (!accountId) {
      setLoading(false);
      return;
    }

    try {
      const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`);
      if (response.ok) {
        const data = await response.json();
        // Calculate average ticket from total revenue and completed appointments
        const completedAppointments = data.stats?.completedAppointments || data.stats?.totalAppointments || 0;
        const monthRevenue = data.stats?.monthRevenue || 0;
        const avgTicket = completedAppointments > 0 ? Math.round(monthRevenue / completedAppointments) : 0;
        
        // Calculate return rate from returning vs new clients
        const totalClients = data.stats?.totalClients || 0;
        const newClientsThisMonth = data.stats?.newClientsThisMonth || 0;
        const returningClients = totalClients > newClientsThisMonth ? totalClients - newClientsThisMonth : 0;
        const returnRate = totalClients > 0 ? Math.round((returningClients / totalClients) * 100) : 0;
        
        setStats({
          weekRevenue: monthRevenue,
          avgTicket,
          newClients: newClientsThisMonth,
          returnRate,
          monthlyGoal: data.stats?.monthlyGoal || 0,
          monthlyProgress: monthRevenue
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accountId]);

  const progressPercentage = stats.monthlyGoal > 0 
    ? Math.min(Math.round((stats.monthlyProgress / stats.monthlyGoal) * 100), 100)
    : 0;

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Análise do Negócio
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Análise do Negócio
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            title="Receita do Mês"
            value={`R$ ${stats.weekRevenue.toLocaleString('pt-BR')}`}
            icon={DollarSign}
            iconColor="bg-green-100 text-green-600 dark:bg-green-900/30"
            trend="neutral"
          />
          <MetricCard
            title="Ticket Médio"
            value={`R$ ${stats.avgTicket}`}
            icon={TrendingUp}
            iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
            trend="neutral"
          />
          <MetricCard
            title="Novos Clientes"
            value={stats.newClients}
            changeLabel="este mês"
            icon={Users}
            iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30"
            trend="neutral"
          />
          <MetricCard
            title="Taxa de Retorno"
            value={`${stats.returnRate}%`}
            icon={Calendar}
            iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30"
            trend="neutral"
          />
        </div>

        {/* Performance Indicators - Only show if goal is set */}
        {stats.monthlyGoal > 0 && stats.weekRevenue > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Meta Mensal</span>
              <span className="text-xs font-medium">
                R$ {stats.monthlyProgress.toLocaleString('pt-BR')} / R$ {stats.monthlyGoal.toLocaleString('pt-BR')}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{progressPercentage}% alcançado</span>
              <span className="text-green-600 font-medium">
                R$ {(stats.monthlyGoal - stats.monthlyProgress).toLocaleString('pt-BR')} restantes
              </span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.weekRevenue === 0 && stats.newClients === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Sem dados suficientes</p>
            <p className="text-sm">Complete agendamentos para ver análises</p>
          </div>
        )}

        {/* Quick Insights */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            Cadastre serviços e profissionais
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
