'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  AlertTriangle,
  TrendingDown,
  CheckCircle,
  Clock,
  ShoppingCart,
  ChevronRight,
  Plus,
  RefreshCw,
  Box,
  Droplet,
  Scissors,
  Sparkles,
  Pill,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface InventoryItem {
  id: string
  name: string
  category: 'product' | 'supply' | 'tool'
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  lastRestock: string
  avgConsumption: number // per week
  status: 'low' | 'critical' | 'ok' | 'overstock'
  cost: number
  supplier?: string
}

const mockInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Shampoo Profissional 1L',
    category: 'product',
    currentStock: 3,
    minStock: 5,
    maxStock: 20,
    unit: 'un',
    lastRestock: '2024-12-01',
    avgConsumption: 2,
    status: 'critical',
    cost: 45,
    supplier: 'Distribuidora Beleza'
  },
  {
    id: '2',
    name: 'Condicionador Hidratante 500ml',
    category: 'product',
    currentStock: 8,
    minStock: 5,
    maxStock: 15,
    unit: 'un',
    lastRestock: '2024-12-05',
    avgConsumption: 1.5,
    status: 'ok',
    cost: 38,
    supplier: 'Distribuidora Beleza'
  },
  {
    id: '3',
    name: 'Tinta de Cabelo (Várias cores)',
    category: 'product',
    currentStock: 4,
    minStock: 10,
    maxStock: 30,
    unit: 'un',
    lastRestock: '2024-11-20',
    avgConsumption: 5,
    status: 'critical',
    cost: 25
  },
  {
    id: '4',
    name: 'Luvas Descartáveis (100 un)',
    category: 'supply',
    currentStock: 15,
    minStock: 5,
    maxStock: 20,
    unit: 'cx',
    lastRestock: '2024-12-08',
    avgConsumption: 2,
    status: 'ok',
    cost: 35
  },
  {
    id: '5',
    name: 'Toalhas de Papel',
    category: 'supply',
    currentStock: 2,
    minStock: 3,
    maxStock: 10,
    unit: 'pct',
    lastRestock: '2024-11-25',
    avgConsumption: 1,
    status: 'low',
    cost: 22
  },
  {
    id: '6',
    name: 'Tesoura Profissional',
    category: 'tool',
    currentStock: 5,
    minStock: 3,
    maxStock: 8,
    unit: 'un',
    lastRestock: '2024-10-15',
    avgConsumption: 0.1,
    status: 'ok',
    cost: 120
  },
  {
    id: '7',
    name: 'Máscara Capilar Premium',
    category: 'product',
    currentStock: 25,
    minStock: 5,
    maxStock: 15,
    unit: 'un',
    lastRestock: '2024-12-01',
    avgConsumption: 1,
    status: 'overstock',
    cost: 55,
    supplier: 'Cosméticos Elite'
  },
  {
    id: '8',
    name: 'Álcool em Gel 500ml',
    category: 'supply',
    currentStock: 1,
    minStock: 3,
    maxStock: 10,
    unit: 'un',
    lastRestock: '2024-11-10',
    avgConsumption: 0.5,
    status: 'critical',
    cost: 12
  }
]

const categoryConfig = {
  product: { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Produto' },
  supply: { icon: Droplet, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Insumo' },
  tool: { icon: Scissors, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Ferramenta' }
}

const statusConfig = {
  critical: { color: 'bg-red-500', label: 'Crítico', textColor: 'text-red-600' },
  low: { color: 'bg-amber-500', label: 'Baixo', textColor: 'text-amber-600' },
  ok: { color: 'bg-green-500', label: 'Normal', textColor: 'text-green-600' },
  overstock: { color: 'bg-blue-500', label: 'Excesso', textColor: 'text-blue-600' }
}

interface InventoryTrackerWidgetProps {
  accountId?: string | null
}

export function InventoryTrackerWidget({ accountId }: InventoryTrackerWidgetProps) {
  const [inventory, setInventory] = useState(mockInventory)
  const [filter, setFilter] = useState<'all' | 'critical' | 'low'>('all')

  const filteredInventory = inventory.filter(item => {
    if (filter === 'critical') return item.status === 'critical'
    if (filter === 'low') return item.status === 'critical' || item.status === 'low'
    return true
  })

  const criticalCount = inventory.filter(i => i.status === 'critical').length
  const lowCount = inventory.filter(i => i.status === 'low').length
  const totalValue = inventory.reduce((acc, i) => acc + (i.currentStock * i.cost), 0)
  
  // Items to reorder
  const reorderItems = inventory.filter(i => i.currentStock <= i.minStock)
  const reorderCost = reorderItems.reduce((acc, i) => acc + ((i.maxStock - i.currentStock) * i.cost), 0)

  const getStockPercentage = (item: InventoryItem) => {
    return Math.round((item.currentStock / item.maxStock) * 100)
  }

  const getDaysUntilEmpty = (item: InventoryItem) => {
    if (item.avgConsumption === 0) return Infinity
    return Math.round(item.currentStock / item.avgConsumption * 7)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Controle de Estoque</CardTitle>
              <CardDescription>{inventory.length} itens cadastrados</CardDescription>
            </div>
          </div>
          {(criticalCount > 0 || lowCount > 0) && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {criticalCount + lowCount} alertas
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-600">Críticos</span>
            </div>
            <p className="text-xl font-bold text-red-700 dark:text-red-400">{criticalCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600">Baixos</span>
            </div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{lowCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Normais</span>
            </div>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">
              {inventory.filter(i => i.status === 'ok').length}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'low', 'critical'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={cn(
                'text-xs',
                filter === f && 'bg-teal-600 hover:bg-teal-700'
              )}
            >
              {f === 'all' ? 'Todos' : f === 'low' ? 'Baixos' : 'Críticos'}
            </Button>
          ))}
        </div>

        {/* Inventory List */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filteredInventory.map((item, index) => {
              const catConfig = categoryConfig[item.category]
              const statConfig = statusConfig[item.status]
              const CatIcon = catConfig.icon
              const daysLeft = getDaysUntilEmpty(item)

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    item.status === 'critical' 
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                      : item.status === 'low'
                      ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                      : 'bg-card hover:border-muted-foreground/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg shrink-0', catConfig.bg)}>
                      <CatIcon className={cn('w-4 h-4', catConfig.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                        <Badge variant="outline" className={cn('text-xs shrink-0', statConfig.color, 'text-white')}>
                          {statConfig.label}
                        </Badge>
                      </div>
                      
                      {/* Stock Progress */}
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Estoque</span>
                          <span className="font-medium">
                            {item.currentStock}/{item.maxStock} {item.unit}
                          </span>
                        </div>
                        <Progress 
                          value={getStockPercentage(item)} 
                          className={cn('h-2', item.status === 'critical' && '[&>div]:bg-red-500')}
                        />
                      </div>

                      {/* Days until empty */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className={cn(
                            daysLeft < 7 ? 'text-red-600 font-medium' : 'text-muted-foreground'
                          )}>
                            {daysLeft === Infinity ? 'Sem consumo' : `~${daysLeft} dias`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">R$</span>
                          <span className="font-medium">{(item.currentStock * item.cost).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Reorder Action */}
        {reorderItems.length > 0 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
                  Pedido de reposição sugerido
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-500">
                  {reorderItems.length} itens • Estimativa: R$ {reorderCost.toLocaleString('pt-BR')}
                </p>
              </div>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                <ShoppingCart className="w-4 h-4 mr-1" />
                Gerar pedido
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function InventoryTrackerMini({ accountId }: InventoryTrackerWidgetProps) {
  const alertCount = mockInventory.filter(i => i.status === 'critical' || i.status === 'low').length
  const totalItems = mockInventory.length

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
          <Package className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Estoque</p>
          <p className="text-xs text-muted-foreground">
            {alertCount > 0 ? `${alertCount} itens precisam atenção` : 'Todos os itens OK'}
          </p>
        </div>
        <Button size="sm" variant="ghost">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
