'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Search, MoreVertical, Calendar, Clock,
  CheckCircle, XCircle, AlertTriangle, TrendingUp, DollarSign,
  RefreshCw, Download, ArrowUpRight, ArrowDownRight, Crown,
  Zap, Building, Pause, Play, Ban, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { authGet, authFetch } from '@/lib/auth-fetch'

interface Subscription {
  id: string
  accountName: string
  ownerName: string
  ownerEmail: string
  planName: string
  planPrice: number
  billingCycle: 'monthly' | 'yearly'
  status: 'active' | 'past_due' | 'canceled' | 'pending'
  startDate: string
  renewalDate: string
  paymentMethod: string
  mrr: number
  features: string[]
}

interface SubscriptionStats {
  total: number
  active: number
  pastDue: number
  canceled: number
  mrr: number
  arr: number
  yearlyPlans: number
  churnRate: number
}

export function SubscriptionsManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    pastDue: 0,
    canceled: 0,
    mrr: 0,
    arr: 0,
    yearlyPlans: 0,
    churnRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [availablePlans, setAvailablePlans] = useState<{id: string; name: string; displayName: string; priceMonthly: number}[]>([])

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (planFilter !== 'all') params.append('plan', planFilter)
      if (search) params.append('search', search)

      const response = await authGet(`/api/admin/subscriptions?${params.toString()}`)
      
      if (!response.ok) throw new Error('Failed to fetch subscriptions')
      
      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
      setStats(data.stats || {
        total: 0,
        active: 0,
        pastDue: 0,
        canceled: 0,
        mrr: 0,
        arr: 0,
        yearlyPlans: 0,
        churnRate: 0
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching subscriptions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, planFilter, search])

  useEffect(() => {
    fetchSubscriptions()
    fetchPlans()
  }, [fetchSubscriptions])

  const fetchPlans = async () => {
    try {
      const response = await authGet('/api/admin/plans')
      if (response.ok) {
        const data = await response.json()
        setAvailablePlans(data.plans || [])
      }
    } catch (err) {
      console.error('Error fetching plans:', err)
    }
  }

  // Filter subscriptions (client-side)
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.accountName.toLowerCase().includes(search.toLowerCase()) ||
      sub.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      sub.ownerEmail.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter
    const matchesPlan = planFilter === 'all' || sub.planName.toLowerCase() === planFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesPlan
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ativa
          </Badge>
        )
      case 'past_due':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Atrasada
          </Badge>
        )
      case 'canceled':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelada
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'básico':
        return (
          <Badge variant="outline" className="border-slate-500 text-slate-600">
            Básico
          </Badge>
        )
      case 'profissional':
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            <Zap className="w-3 h-3 mr-1" />
            Profissional
          </Badge>
        )
      case 'salão':
        return (
          <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white">
            <Building className="w-3 h-3 mr-1" />
            Salão
          </Badge>
        )
      case 'empresa':
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <Crown className="w-3 h-3 mr-1" />
            Empresa
          </Badge>
        )
      default:
        return <Badge variant="secondary">{plan}</Badge>
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const exportToCSV = () => {
    const headers = ['Empresa', 'Proprietário', 'Email', 'Plano', 'Valor', 'Ciclo', 'Status', 'Renovação']
    const rows = filteredSubscriptions.map(s => [
      s.accountName,
      s.ownerName,
      s.ownerEmail,
      s.planName,
      s.planPrice.toString(),
      s.billingCycle,
      s.status,
      s.renewalDate
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'assinaturas.csv'
    a.click()
    
    toast.success('Lista de assinaturas exportada!')
  }

  const getDaysUntilRenewal = (date: string) => {
    const renewal = new Date(date)
    const now = new Date()
    const diff = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  // Subscription actions
  const handleSubscriptionAction = async (subscriptionId: string, action: 'pause' | 'cancel' | 'reactivate' | 'regularize') => {
    setActionLoading(subscriptionId)
    try {
      const statusMap: Record<string, string> = {
        pause: 'paused',
        cancel: 'canceled',
        reactivate: 'active',
        regularize: 'active'
      }

      const response = await authFetch('/api/admin/subscriptions', {
        method: 'PUT',
        body: { id: subscriptionId, status: statusMap[action] }
      })

      if (response.ok) {
        toast.success(`Assinatura ${action === 'cancel' ? 'cancelada' : action === 'pause' ? 'pausada' : action === 'reactivate' ? 'reativada' : 'regularizada'} com sucesso!`)
        fetchSubscriptions()
        setShowSubscriptionDialog(false)
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao processar ação')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar ação')
    } finally {
      setActionLoading(null)
    }
  }

  const handleChangePlan = async () => {
    if (!selectedSubscription || !selectedPlanId) return
    
    setActionLoading(selectedSubscription.id)
    try {
      const response = await authFetch('/api/admin/subscriptions', {
        method: 'PUT',
        body: { id: selectedSubscription.id, planId: selectedPlanId }
      })

      if (response.ok) {
        toast.success('Plano alterado com sucesso!')
        fetchSubscriptions()
        setShowChangePlanDialog(false)
        setShowSubscriptionDialog(false)
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao alterar plano')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar plano')
    } finally {
      setActionLoading(null)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <CreditCard className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar assinaturas</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchSubscriptions}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            label: 'MRR Total', 
            value: formatCurrency(stats.mrr), 
            icon: DollarSign, 
            color: 'from-green-500 to-emerald-500',
            trend: `${stats.active} assinaturas ativas`
          },
          { 
            label: 'ARR Projetado', 
            value: formatCurrency(stats.arr), 
            icon: TrendingUp, 
            color: 'from-blue-500 to-cyan-500',
            trend: 'Receita anual'
          },
          { 
            label: 'Taxa de Churn', 
            value: `${stats.churnRate}%`, 
            icon: ArrowDownRight, 
            color: 'from-amber-500 to-orange-500',
            trend: `${stats.canceled} canceladas`
          },
          { 
            label: 'Planos Anuais', 
            value: stats.yearlyPlans, 
            icon: Calendar, 
            color: 'from-violet-500 to-purple-500',
            trend: 'Compromissos longos'
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      {stats.mrr > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Receita Recorrente (MRR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-4xl font-bold">{formatCurrency(stats.mrr)}</p>
                <p className="text-sm text-muted-foreground">Por mês</p>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <ArrowUpRight className="w-5 h-5" />
                <span className="font-medium">Mensal</span>
              </div>
            </div>
            
            {/* Distribution by Plan */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              {['Básico', 'Profissional', 'Salão', 'Empresa'].map((plan) => {
                const planSubs = subscriptions.filter(s => s.planName === plan && s.status === 'active')
                const planMrr = planSubs.reduce((sum, s) => sum + s.mrr, 0)
                const percentage = stats.mrr > 0 ? Math.round((planMrr / stats.mrr) * 100) : 0
                
                return (
                  <div key={plan} className="text-center">
                    <p className="text-sm text-muted-foreground">{plan}</p>
                    <p className="text-lg font-bold">{formatCurrency(planMrr)}</p>
                    <Progress value={percentage} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">{planSubs.length} assinaturas</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empresa, proprietário ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="past_due">Atrasadas</SelectItem>
                <SelectItem value="canceled">Canceladas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                <SelectItem value="básico">Básico</SelectItem>
                <SelectItem value="profissional">Profissional</SelectItem>
                <SelectItem value="salão">Salão</SelectItem>
                <SelectItem value="empresa">Empresa</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Assinaturas
            <Badge variant="secondary" className="ml-2">
              {filteredSubscriptions.length} encontradas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSubscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhuma assinatura encontrada</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Renovação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredSubscriptions.map((sub, index) => {
                      const daysUntilRenewal = getDaysUntilRenewal(sub.renewalDate)
                      
                      return (
                        <motion.tr
                          key={sub.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="group hover:bg-muted/50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500">
                                <AvatarFallback className="bg-transparent text-white font-medium">
                                  {sub.accountName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{sub.accountName}</p>
                                <p className="text-sm text-muted-foreground">{sub.ownerName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getPlanBadge(sub.planName)}</TableCell>
                          <TableCell>
                            <p className="font-medium">{formatCurrency(sub.planPrice)}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.billingCycle === 'yearly' ? '/ano' : '/mês'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {sub.billingCycle === 'yearly' ? 'Anual' : 'Mensal'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{new Date(sub.renewalDate).toLocaleDateString('pt-BR')}</p>
                              {sub.status === 'active' && (
                                <p className={cn(
                                  "text-xs",
                                  daysUntilRenewal <= 7 ? "text-amber-600" : "text-muted-foreground"
                                )}>
                                  em {daysUntilRenewal} dias
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  setSelectedSubscription(sub)
                                  setShowSubscriptionDialog(true)
                                }}>
                                  Ver Detalhes
                                </DropdownMenuItem>
                                {sub.status === 'active' && (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedSubscription(sub)
                                      setSelectedPlanId('')
                                      setShowChangePlanDialog(true)
                                    }}>
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                      Alterar Plano
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSubscriptionAction(sub.id, 'pause')}>
                                      <Pause className="w-4 h-4 mr-2" />
                                      Pausar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => handleSubscriptionAction(sub.id, 'cancel')}>
                                      <Ban className="w-4 h-4 mr-2" />
                                      Cancelar
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {sub.status === 'past_due' && (
                                  <DropdownMenuItem className="text-green-600" onClick={() => handleSubscriptionAction(sub.id, 'regularize')}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Regularizar
                                  </DropdownMenuItem>
                                )}
                                {sub.status === 'canceled' && (
                                  <DropdownMenuItem className="text-green-600" onClick={() => handleSubscriptionAction(sub.id, 'reactivate')}>
                                    <Play className="w-4 h-4 mr-2" />
                                    Reativar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Subscription Detail Dialog */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Detalhes da Assinatura
            </DialogTitle>
            <DialogDescription>
              Informações completas da assinatura
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-6">
              {/* Subscription Header */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-500">
                  <AvatarFallback className="bg-transparent text-white text-xl font-bold">
                    {selectedSubscription.accountName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedSubscription.accountName}</h3>
                  <p className="text-muted-foreground">{selectedSubscription.ownerEmail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getPlanBadge(selectedSubscription.planName)}
                    {getStatusBadge(selectedSubscription.status)}
                  </div>
                </div>
              </div>
              
              {/* Subscription Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-bold text-xl">{formatCurrency(selectedSubscription.planPrice)}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSubscription.billingCycle === 'yearly' ? 'por ano' : 'por mês'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">MRR</p>
                  <p className="font-bold text-xl">{formatCurrency(selectedSubscription.mrr)}</p>
                  <p className="text-xs text-muted-foreground">receita mensal</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Início</p>
                  <p className="font-medium">{new Date(selectedSubscription.startDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Renovação</p>
                  <p className="font-medium">{new Date(selectedSubscription.renewalDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pagamento</p>
                  <p className="font-medium">{selectedSubscription.paymentMethod}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ciclo</p>
                  <p className="font-medium">{selectedSubscription.billingCycle === 'yearly' ? 'Anual' : 'Mensal'}</p>
                </div>
              </div>
              
              {/* Features */}
              {selectedSubscription.features.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Features Inclusas</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubscription.features.map((feature) => (
                      <Badge key={feature} variant="outline">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowSubscriptionDialog(false)
                    setShowChangePlanDialog(true)
                    setSelectedPlanId('')
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Alterar Plano
                </Button>
                {selectedSubscription.status === 'active' && (
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => handleSubscriptionAction(selectedSubscription.id, 'cancel')}
                    disabled={actionLoading === selectedSubscription.id}
                  >
                    {actionLoading === selectedSubscription.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4 mr-2" />
                    )}
                    Cancelar
                  </Button>
                )}
                {selectedSubscription.status === 'canceled' && (
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={() => handleSubscriptionAction(selectedSubscription.id, 'reactivate')}
                    disabled={actionLoading === selectedSubscription.id}
                  >
                    {actionLoading === selectedSubscription.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Reativar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Alterar Plano
            </DialogTitle>
            <DialogDescription>
              Selecione o novo plano para {selectedSubscription?.accountName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Novo Plano</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.displayName} - {formatCurrency(plan.priceMonthly)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowChangePlanDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleChangePlan}
                disabled={!selectedPlanId || actionLoading !== null}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
