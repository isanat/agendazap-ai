'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Ticket, Percent, DollarSign, Calendar, Users, Gift, 
  Plus, Copy, CheckCircle, XCircle, Edit2, Trash2, 
  Clock, TrendingUp, Sparkles, Tag
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface PromoCode {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minPurchase: number
  maxUses: number
  currentUses: number
  validFrom: string
  validUntil: string
  status: 'active' | 'expired' | 'disabled'
  applicableServices: string[]
  description?: string
}

const mockPromoCodes: PromoCode[] = [
  {
    id: '1',
    code: 'PRIMEIRA10',
    discountType: 'percentage',
    discountValue: 10,
    minPurchase: 50,
    maxUses: 100,
    currentUses: 67,
    validFrom: '2026-04-01',
    validUntil: '2026-04-30',
    status: 'active',
    applicableServices: ['all'],
    description: '10% de desconto na primeira visita'
  },
  {
    id: '2',
    code: 'CORTA15',
    discountType: 'percentage',
    discountValue: 15,
    minPurchase: 80,
    maxUses: 50,
    currentUses: 50,
    validFrom: '2026-03-01',
    validUntil: '2026-04-15',
    status: 'active',
    applicableServices: ['Corte Feminino', 'Corte Masculino'],
    description: '15% em cortes'
  },
  {
    id: '3',
    code: 'NATAL2025',
    discountType: 'fixed',
    discountValue: 20,
    minPurchase: 100,
    maxUses: 200,
    currentUses: 200,
    validFrom: '2025-12-01',
    validUntil: '2025-12-31',
    status: 'expired',
    applicableServices: ['all'],
    description: 'R$ 20 de desconto natalino'
  },
  {
    id: '4',
    code: 'INDICA5',
    discountType: 'fixed',
    discountValue: 5,
    minPurchase: 0,
    maxUses: 1000,
    currentUses: 234,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    status: 'active',
    applicableServices: ['all'],
    description: 'Desconto por indicação'
  },
]

interface PromotionalCodesWidgetProps {
  accountId?: string | null
}

export function PromotionalCodesWidget({ accountId }: PromotionalCodesWidgetProps) {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(mockPromoCodes)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all')
  const { toast } = useToast()

  const activeCount = promoCodes.filter(p => p.status === 'active').length
  const totalSavings = promoCodes.reduce((acc, p) => acc + (p.discountValue * p.currentUses), 0)
  const totalUses = promoCodes.reduce((acc, p) => acc + p.currentUses, 0)

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: 'Copiado!',
      description: `Código ${code} copiado para a área de transferência`,
    })
  }

  const handleToggleStatus = (id: string) => {
    setPromoCodes(prev => prev.map(p => 
      p.id === id ? { 
        ...p, 
        status: p.status === 'active' ? 'disabled' as const : 'active' as const 
      } : p
    ))
  }

  const handleDelete = (id: string) => {
    setPromoCodes(prev => prev.filter(p => p.id !== id))
    toast({
      title: 'Removido',
      description: 'Código promocional removido',
    })
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const filteredCodes = promoCodes.filter(p => {
    if (filter === 'all') return true
    return p.status === filter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Ativo</Badge>
      case 'expired':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Expirado</Badge>
      case 'disabled':
        return <Badge variant="secondary" className="bg-red-100 text-red-600">Desativado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Ticket className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Códigos Promocionais</CardTitle>
              <CardDescription>{activeCount} códigos ativos</CardDescription>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Código Promocional</DialogTitle>
                <DialogDescription>
                  Crie um novo código de desconto para seus clientes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <div className="flex gap-2">
                    <Input placeholder="ex: PROMO20" className="flex-1" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => toast({
                        title: 'Código gerado',
                        description: generateRandomCode()
                      })}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo de Desconto</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentagem</SelectItem>
                        <SelectItem value="fixed">Valor Fixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input type="number" placeholder="10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Compra Mínima</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Usos Máximos</Label>
                    <Input type="number" placeholder="100" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Válido De</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Válido Até</Label>
                    <Input type="date" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setShowAddDialog(false)}>
                    Criar Código
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-green-600">{totalUses}</p>
            <p className="text-xs text-muted-foreground">Usos</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-blue-600">
              R$ {totalSavings.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-muted-foreground">Economia</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'active', 'expired'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="text-xs"
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Expirados'}
            </Button>
          ))}
        </div>

        {/* Promo Codes List */}
        <ScrollArea className="h-[280px] pr-4">
          <AnimatePresence>
            {filteredCodes.map((promo, index) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 mb-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded font-mono text-sm font-bold text-purple-700 dark:text-purple-300">
                      {promo.code}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCopyCode(promo.code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {getStatusBadge(promo.status)}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    {promo.discountType === 'percentage' ? (
                      <>
                        <Percent className="h-4 w-4" />
                        {promo.discountValue}% OFF
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4" />
                        R$ {promo.discountValue}
                      </>
                    )}
                  </div>
                  {promo.minPurchase > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Mín: R$ {promo.minPurchase}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-2">
                  {promo.description}
                </p>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Usos</span>
                    <span>{promo.currentUses}/{promo.maxUses}</span>
                  </div>
                  <Progress 
                    value={(promo.currentUses / promo.maxUses) * 100} 
                    className="h-1"
                  />
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(promo.validUntil).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {promo.applicableServices[0] === 'all' ? 'Todos serviços' : promo.applicableServices.length + ' serviços'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => handleToggleStatus(promo.id)}
                  >
                    {promo.status === 'active' ? (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ativar
                      </>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 text-xs text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(promo.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export function PromotionalCodesMini({ accountId }: PromotionalCodesWidgetProps) {
  const activeCount = mockPromoCodes.filter(p => p.status === 'active').length
  const totalUses = mockPromoCodes.reduce((acc, p) => acc + p.currentUses, 0)

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Ticket className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Códigos Promocionais</p>
              <p className="text-xs text-muted-foreground">{activeCount} ativos • {totalUses} usos</p>
            </div>
          </div>
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
            <Tag className="h-3 w-3 mr-1" />
            Promo
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
