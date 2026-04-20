'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Gift, Award, Star, TrendingUp, ChevronUp, ChevronDown, 
  Plus, Edit, Trash2, Crown, Users, Minus
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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
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

const mockLoyaltyClients: LoyaltyClient[] = [
  { id: '1', name: 'Maria Silva', phone: '(11) 98765-4321', points: 450, tier: 'gold', totalSpent: 2450, visits: 18, lastVisit: new Date('2025-04-10') },
  { id: '2', name: 'João Santos', phone: '(11) 91234-5678', points: 320, tier: 'gold', totalSpent: 1800, visits: 12, lastVisit: new Date('2025-04-08') },
  { id: '3', name: 'Ana Oliveira', phone: '(11) 92345-6789', points: 120, tier: 'silver', totalSpent: 680, visits: 8, lastVisit: new Date('2025-04-05') },
  { id: '4', name: 'Carlos Lima', phone: '(11) 93456-7890', points: 85, tier: 'bronze', totalSpent: 420, visits: 5, lastVisit: new Date('2025-04-01') },
  { id: '5', name: 'Patricia Costa', phone: '(11) 94567-8901', points: 580, tier: 'platinum', totalSpent: 3200, visits: 24, lastVisit: new Date('2025-04-12') },
]

export function LoyaltyProgram() {
  const [clients, setClients] = useState<LoyaltyClient[]>(mockLoyaltyClients)
  const [selectedClient, setSelectedClient] = useState<LoyaltyClient | null>(null)
  const [pointsToAdd, setPointsToAdd] = useState(0)
  const [showAddPointsDialog, setShowAddPointsDialog] = useState(false)
  const [filter, setFilter] = useState<'all' | 'bronze' | 'silver' | 'gold' | 'platinum'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const getTierFromPoints = (points: number): LoyaltyTier => {
    return loyaltyTiers.find(tier => points >= tier.minPoints) || loyaltyTiers[loyaltyTiers.length - 1]
  }

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
    averagePoints: Math.round(clients.reduce((sum, c) => sum + c.points, 0) / clients.length),
    platinumCount: clients.filter(c => c.tier === 'platinum').length,
    goldCount: clients.filter(c => c.tier === 'gold').length,
  }

  const handleAddPoints = (clientId: string, points: number) => {
    setClients(prev => prev.map(c => 
      c.id === clientId 
        ? { ...c, points: c.points + points }
        : c
    ))
    toast.success(`Adicionados ${points} pontos para o cliente!`)
    setShowAddPointsDialog(false)
    setPointsToAdd(0)
  }

  const handleRemovePoints = (clientId: string, points: number) => {
    setClients(prev => prev.map(c => 
      c.id === clientId 
        ? { ...c, points: Math.max(0, c.points - points) }
        : c
    ))
    toast.success(`Removidos ${points} pontos`)
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
            <Button onClick={() => handleAddPoints(selectedClient!.id, pointsToAdd)}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
