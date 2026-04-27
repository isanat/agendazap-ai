'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Gift, Award, Star, TrendingUp, ChevronUp, ChevronDown, 
  Plus, Edit, Trash2, Crown, Users, Minus, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { authFetch } from '@/lib/auth-fetch'
import { EmptyState } from '@/components/ui/empty-state'

interface LoyaltyTier {
  id: string
  name: string
  minPoints: number
  discountPercent: number
  color: string
  benefits: string[]
  icon: string
}

interface LoyaltyClient {
  id: string
  name: string
  phone: string
  points: number
  tier: string
  totalSpent: number
  visits: number
  lastVisit: Date
}

const loyaltyTiers: LoyaltyTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    discountPercent: 5,
    color: 'from-amber-600 to-amber-700',
    benefits: ['5% de desconto', 'Lembretes prioritários'],
    icon: '🥉'
  },
  {
    id: 'silver',
    name: 'Prata',
    minPoints: 100,
    discountPercent: 10,
    color: 'from-gray-400 to-gray-500',
    benefits: ['10% de desconto', 'Lembretes + brindes', 'Agendamentos priority'],
    icon: '🥈'
  },
  {
    id: 'gold',
    name: 'Ouro',
    minPoints: 300,
    discountPercent: 15,
    color: 'from-yellow-500 to-amber-500',
    benefits: ['15% de desconto', 'Todos os benefícios anteriores', 'Ofertas exclusivas', 'Acesso VIP'],
    icon: '🥇'
  },
  {
    id: 'platinum',
    name: 'Platinum',
    minPoints: 500,
    discountPercent: 20,
    color: 'from-cyan-400 to-slate-400',
    benefits: ['20% de desconto', 'Todos os benefícios anteriores', 'Suporte 24/7', 'Membros do clube exclusivo'],
    icon: '💎'
  }
]

export function LoyaltyProgram() {
  const [clients, setClients] = useState<LoyaltyClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<LoyaltyClient | null>(null)
  const [pointsToAdd, setPointsToAdd] = useState(0)
  const [showAddPointsDialog, setShowAddPointsDialog] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'bronze' | 'silver' | 'gold' | 'platinum'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const getTierFromPoints = (points: number): LoyaltyTier => {
    const sorted = [...loyaltyTiers].sort((a, b) => b.minPoints - a.minPoints)
    return sorted.find(tier => points >= tier.minPoints) || loyaltyTiers[0]
  }

  const fetchClients = async () => {
    setIsLoading(true)
    try {
      const response = await authFetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        const mapped = (data.clients || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          points: c.loyaltyPoints || 0,
          tier: getTierFromPoints(c.loyaltyPoints || 0).id,
          totalSpent: 0,
          visits: c.totalAppointments || 0,
          lastVisit: c.lastVisit ? new Date(c.lastVisit) : new Date(),
        }))
        setClients(mapped)
      } else {
        toast.error('Erro ao carregar clientes')
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      toast.error('Erro ao carregar clientes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filteredClients = clients
    .filter(client => filter === 'all' || client.tier === filter)
    .filter(client => 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery)
    )
    .sort((a, b) => b.points - a.points)

  const stats = {
    totalClients: clients.length,
    totalPoints: clients.reduce((sum, c) => sum + c.points, 0),
    averagePoints: clients.length > 0 ? Math.round(clients.reduce((sum, c) => sum + c.points, 0) / clients.length) : 0,
    platinumCount: clients.filter(c => c.tier === 'platinum').length,
    goldCount: clients.filter(c => c.tier === 'gold').length,
  }

  const handleAddPoints = async (clientId: string, points: number) => {
    setIsAdjusting(true)
    try {
      const response = await authFetch('/api/loyalty/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          points,
          type: 'bonus',
          description: 'Ajuste manual de pontos',
        }),
      })
      if (response.ok) {
        toast.success(`Adicionados ${points} pontos para o cliente!`)
        setShowAddPointsDialog(false)
        setPointsToAdd(0)
        fetchClients()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao adicionar pontos')
      }
    } catch (error) {
      toast.error('Erro ao adicionar pontos')
    } finally {
      setIsAdjusting(false)
    }
  }

  const handleRemovePoints = async (clientId: string, points: number) => {
    try {
      const response = await authFetch('/api/loyalty/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          points,
          type: 'redeem',
          description: 'Remoção manual de pontos',
        }),
      })
      if (response.ok) {
        toast.success(`Removidos ${points} pontos`)
        fetchClients()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao remover pontos')
      }
    } catch (error) {
      toast.error('Erro ao remover pontos')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Programa de Fidelidade
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie pontos e recompensas para clientes fiéis
          </p>
        </div>
        
        <Button className="bg-gradient-to-r from-yellow-500 to-amber-600" onClick={() => toast.info('Em desenvolvimento')}>
          <Gift className="w-4 h-4 mr-2" />
          Nova Promoção
        </Button>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loyaltyTiers.map((tier, index) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              filter === tier.id && "ring-2 ring-offset-2"
            )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
                    `bg-gradient-to-r ${tier.color}`
                  )}>
                    {tier.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tier.minPoints}+ pts
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {tier.benefits.slice(0, 2).map((benefit, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalClients}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Total Pontos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalPoints.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Média Pontos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.averagePoints}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🥇</span>
              <span className="text-xs text-muted-foreground">Ouro</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.goldCount}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-500/5 to-slate-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <span className="text-xs text-muted-foreground">Platinum</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.platinumCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Buscar cliente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            Todos
          </Badge>
          {loyaltyTiers.map(tier => (
            <Badge
              key={tier.id}
              variant={filter === tier.id ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter(tier.id as 'all' | 'bronze' | 'silver' | 'gold' | 'platinum')}
            >
              {tier.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Clients List */}
      <Card>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState type="clients" />
            </div>
          ) : (
            <div className="divide-y">
              {filteredClients.map((client, index) => {
                const tier = getTierFromPoints(client.points)
                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 flex items-center gap-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                        `bg-gradient-to-r ${tier.color}`
                      )}>
                        {tier.icon}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold">{client.points}</p>
                        <p className="text-xs text-muted-foreground">pontos</p>
                      </div>
                      
                      <div className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {tier.discountPercent}% off
                        </Badge>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client)
                            setShowAddPointsDialog(true)
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemovePoints(client.id, 10)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Points Dialog */}
      <Dialog open={showAddPointsDialog} onOpenChange={setShowAddPointsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Pontos</DialogTitle>
            <DialogDescription>
              Adicionar pontos para {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label>Quantidade de pontos</Label>
            <Input
              type="number"
              value={pointsToAdd}
              onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
              className="mt-2"
            />
            
            <div className="flex gap-2 mt-4">
              {[5, 10, 25, 50, 100].map(amount => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setPointsToAdd(amount)}
                >
                  +{amount}
                </Button>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPointsDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleAddPoints(selectedClient!.id, pointsToAdd)}
              disabled={isAdjusting || pointsToAdd <= 0}
            >
              {isAdjusting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ajustando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
