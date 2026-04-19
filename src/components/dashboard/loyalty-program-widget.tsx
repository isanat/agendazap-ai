'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift,
  Crown,
  Star,
  Award,
  TrendingUp,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Heart,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  Medal,
  Trophy,
  Flame
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoyaltyTier {
  name: string
  minPoints: number
  maxPoints: number
  discount: number
  color: string
  bgGradient: string
  icon: React.ElementType
}

const tiers: LoyaltyTier[] = [
  { name: 'Bronze', minPoints: 0, maxPoints: 199, discount: 5, color: 'text-amber-700', bgGradient: 'from-amber-600 to-orange-700', icon: Medal },
  { name: 'Prata', minPoints: 200, maxPoints: 499, discount: 10, color: 'text-slate-500', bgGradient: 'from-slate-400 to-slate-600', icon: Award },
  { name: 'Ouro', minPoints: 500, maxPoints: 999, discount: 15, color: 'text-yellow-600', bgGradient: 'from-yellow-500 to-amber-600', icon: Trophy },
  { name: 'Diamante', minPoints: 1000, maxPoints: Infinity, discount: 20, color: 'text-cyan-500', bgGradient: 'from-cyan-400 to-blue-600', icon: Crown }
]

interface LoyaltyClient {
  id: string
  name: string
  avatar?: string
  currentPoints: number
  totalEarned: number
  totalRedeemed: number
  tier: string
  nextTier: string
  pointsToNextTier: number
  visits: number
  lastVisit: string
  rewardsAvailable: number
}

const mockLoyaltyClients: LoyaltyClient[] = [
  {
    id: '1',
    name: 'Ana Carolina Silva',
    currentPoints: 850,
    totalEarned: 1200,
    totalRedeemed: 350,
    tier: 'Ouro',
    nextTier: 'Diamante',
    pointsToNextTier: 150,
    visits: 45,
    lastVisit: '2024-12-10',
    rewardsAvailable: 3
  },
  {
    id: '2',
    name: 'Maria Fernanda Costa',
    currentPoints: 320,
    totalEarned: 500,
    totalRedeemed: 180,
    tier: 'Prata',
    nextTier: 'Ouro',
    pointsToNextTier: 180,
    visits: 28,
    lastVisit: '2024-12-08',
    rewardsAvailable: 1
  },
  {
    id: '3',
    name: 'Carlos Eduardo Lima',
    currentPoints: 1250,
    totalEarned: 1800,
    totalRedeemed: 550,
    tier: 'Diamante',
    nextTier: 'Diamante',
    pointsToNextTier: 0,
    visits: 72,
    lastVisit: '2024-12-09',
    rewardsAvailable: 5
  },
  {
    id: '4',
    name: 'Juliana Santos',
    currentPoints: 150,
    totalEarned: 250,
    totalRedeemed: 100,
    tier: 'Bronze',
    nextTier: 'Prata',
    pointsToNextTier: 50,
    visits: 12,
    lastVisit: '2024-12-05',
    rewardsAvailable: 0
  },
  {
    id: '5',
    name: 'Patricia Oliveira',
    currentPoints: 680,
    totalEarned: 900,
    totalRedeemed: 220,
    tier: 'Ouro',
    nextTier: 'Diamante',
    pointsToNextTier: 320,
    visits: 38,
    lastVisit: '2024-12-07',
    rewardsAvailable: 2
  }
]

interface LoyaltyStats {
  totalMembers: number
  activeMembers: number
  pointsIssued: number
  pointsRedeemed: number
  rewardsClaimed: number
  retentionRate: number
}

const mockStats: LoyaltyStats = {
  totalMembers: 245,
  activeMembers: 189,
  pointsIssued: 45600,
  pointsRedeemed: 23400,
  rewardsClaimed: 156,
  retentionRate: 78.5
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getTierConfig(tierName: string) {
  return tiers.find(t => t.name === tierName) || tiers[0]
}

interface LoyaltyProgramWidgetProps {
  accountId?: string | null
}

export function LoyaltyProgramWidget({ accountId }: LoyaltyProgramWidgetProps) {
  const [clients] = useState(mockLoyaltyClients)
  const [sortBy, setSortBy] = useState<'points' | 'visits'>('points')

  const sortedClients = [...clients].sort((a, b) => {
    if (sortBy === 'points') return b.currentPoints - a.currentPoints
    return b.visits - a.visits
  })

  const tierDistribution = tiers.map(tier => ({
    ...tier,
    count: clients.filter(c => c.tier === tier.name).length
  }))

  const totalRewardsAvailable = clients.reduce((a, c) => a + c.rewardsAvailable, 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Programa de Fidelidade</CardTitle>
              <CardDescription>{mockStats.totalMembers} membros</CardDescription>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-rose-500 to-pink-600 text-white">
            <Flame className="w-3 h-3 mr-1" />
            {mockStats.retentionRate}% retenção
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-center">
            <Users className="w-4 h-4 text-rose-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{mockStats.activeMembers}</p>
            <p className="text-[10px] text-rose-600">Ativos</p>
          </div>
          <div className="p-2 rounded-lg bg-pink-50 dark:bg-pink-900/20 text-center">
            <Star className="w-4 h-4 text-pink-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-pink-700 dark:text-pink-400">{(mockStats.pointsIssued / 1000).toFixed(1)}k</p>
            <p className="text-[10px] text-pink-600">Pontos</p>
          </div>
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
            <Gift className="w-4 h-4 text-purple-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-purple-700 dark:text-purple-400">{mockStats.rewardsClaimed}</p>
            <p className="text-[10px] text-purple-600">Resgates</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
            <Award className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{totalRewardsAvailable}</p>
            <p className="text-[10px] text-amber-600">Prêmios</p>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Distribuição por Nível</p>
          <div className="flex gap-2">
            {tierDistribution.map((tier) => {
              const TierIcon = tier.icon
              const percentage = (tier.count / clients.length) * 100
              return (
                <div
                  key={tier.name}
                  className={cn(
                    'flex-1 p-2 rounded-lg text-center',
                    tier.bg,
                    'bg-opacity-20'
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${tier.bgGradient.includes('amber') ? 'rgba(245, 158, 11, 0.15)' : tier.bgGradient.includes('slate') ? 'rgba(100, 116, 139, 0.15)' : tier.bgGradient.includes('yellow') ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 211, 238, 0.15)'})`
                  }}
                >
                  <TierIcon className={cn('w-4 h-4 mx-auto mb-1', tier.color)} />
                  <p className="text-xs font-bold">{tier.count}</p>
                  <p className="text-[10px] text-muted-foreground">{tier.name}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Members */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Top Membros</p>
            <div className="flex gap-1">
              <Button
                variant={sortBy === 'points' ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => setSortBy('points')}
              >
                Pontos
              </Button>
              <Button
                variant={sortBy === 'visits' ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => setSortBy('visits')}
              >
                Visitas
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {sortedClients.slice(0, 5).map((client, index) => {
                const tierConfig = getTierConfig(client.tier)
                const TierIcon = tierConfig.icon
                const progressPercent = client.pointsToNextTier > 0
                  ? ((tierConfig.maxPoints - client.pointsToNextTier) / tierConfig.maxPoints) * 100
                  : 100

                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-center w-5 text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={client.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{client.name}</p>
                        <TierIcon className={cn('w-3 h-3 shrink-0', tierConfig.color)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progressPercent} className="h-1 flex-1" />
                        {client.pointsToNextTier > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {client.pointsToNextTier} pts
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{client.currentPoints}</p>
                      <p className="text-[10px] text-muted-foreground">pontos</p>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1 text-xs">
            <Users className="w-3 h-3 mr-1" />
            Ver todos
          </Button>
          <Button size="sm" className="flex-1 text-xs bg-rose-600 hover:bg-rose-700">
            <Gift className="w-3 h-3 mr-1" />
            Nova recompensa
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function LoyaltyProgramMini({ accountId }: LoyaltyProgramWidgetProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
          <Gift className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Fidelidade</p>
          <p className="text-xs text-muted-foreground">
            {mockStats.activeMembers} ativos • {mockStats.retentionRate}% retenção
          </p>
        </div>
        <Button size="sm" variant="ghost">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
