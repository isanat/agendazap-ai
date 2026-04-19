'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, Plus, Edit, Trash2, Gift, Percent, 
  ChevronDown, ChevronUp, Sparkles, DollarSign,
  Clock, Tag, Check, X, Eye, Copy
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Service {
  id: string
  name: string
  price: number
  durationMinutes: number
}

interface ServicePackage {
  id: string
  name: string
  description: string
  services: { id: string; name: string; price: number; durationMinutes: number }[]
  originalPrice: number
  discountedPrice: number
  discountPercent: number
  validDays: number
  isActive: boolean
  isFeatured: boolean
  maxUses: number | null
  currentUses: number
  createdAt: Date
}

interface ServicePackagesProps {
  services: Service[]
  onAddPackage?: (pkg: Partial<ServicePackage>) => void
}

// Mock packages for demonstration
const mockPackages: ServicePackage[] = [
  {
    id: '1',
    name: 'Pacote Noiva',
    description: 'Tudo que a noiva precisa para o grande dia',
    services: [
      { id: '1', name: 'Corte Feminino', price: 80, durationMinutes: 45 },
      { id: '2', name: 'Hidratação', price: 120, durationMinutes: 60 },
      { id: '3', name: 'Escova', price: 70, durationMinutes: 45 },
      { id: '4', name: 'Maquiagem', price: 150, durationMinutes: 60 },
    ],
    originalPrice: 420,
    discountedPrice: 349,
    discountPercent: 17,
    validDays: 30,
    isActive: true,
    isFeatured: true,
    maxUses: 10,
    currentUses: 3,
    createdAt: new Date('2025-04-01'),
  },
  {
    id: '2',
    name: 'Combo Barba',
    description: 'Barba perfeita com tratamento incluído',
    services: [
      { id: '5', name: 'Barba Completa', price: 45, durationMinutes: 30 },
      { id: '6', name: 'Toalha Quente', price: 25, durationMinutes: 15 },
    ],
    originalPrice: 70,
    discountedPrice: 55,
    discountPercent: 21,
    validDays: 14,
    isActive: true,
    isFeatured: false,
    maxUses: null,
    currentUses: 12,
    createdAt: new Date('2025-04-05'),
  },
  {
    id: '3',
    name: 'Day Spa',
    description: 'Dia de relaxamento e cuidados especiais',
    services: [
      { id: '7', name: 'Manicure', price: 40, durationMinutes: 30 },
      { id: '8', name: 'Pedicure', price: 45, durationMinutes: 30 },
      { id: '2', name: 'Hidratação Capilar', price: 120, durationMinutes: 60 },
      { id: '9', name: 'Massagem Relaxante', price: 150, durationMinutes: 60 },
    ],
    originalPrice: 355,
    discountedPrice: 289,
    discountPercent: 19,
    validDays: 60,
    isActive: false,
    isFeatured: false,
    maxUses: 20,
    currentUses: 8,
    createdAt: new Date('2025-03-20'),
  },
]

export function ServicePackages({ services, onAddPackage }: ServicePackagesProps) {
  const [packages, setPackages] = useState<ServicePackage[]>(mockPackages)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [formData, setFormData] = useState<{
    name: string
    description: string
    selectedServices: string[]
    discountPercent: number
    validDays: number
    isFeatured: boolean
    maxUses: number | null
  }>({
    name: '',
    description: '',
    selectedServices: [],
    discountPercent: 15,
    validDays: 30,
    isFeatured: false,
    maxUses: null,
  })

  const filteredPackages = packages.filter(pkg => 
    filter === 'all' || (filter === 'active' ? pkg.isActive : !pkg.isActive)
  )

  const selectedServicesData = services.filter(s => formData.selectedServices.includes(s.id))
  const originalPrice = selectedServicesData.reduce((sum, s) => sum + s.price, 0)
  const discountedPrice = Math.round(originalPrice * (1 - formData.discountPercent / 100))

  const handleOpenDialog = (pkg?: ServicePackage) => {
    if (pkg) {
      setEditingPackage(pkg)
      setFormData({
        name: pkg.name,
        description: pkg.description,
        selectedServices: pkg.services.map(s => s.id),
        discountPercent: pkg.discountPercent,
        validDays: pkg.validDays,
        isFeatured: pkg.isFeatured,
        maxUses: pkg.maxUses,
      })
    } else {
      setEditingPackage(null)
      setFormData({
        name: '',
        description: '',
        selectedServices: [],
        discountPercent: 15,
        validDays: 30,
        isFeatured: false,
        maxUses: null,
      })
    }
    setIsDialogOpen(true)
  }

  const handleToggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }))
  }

  const handleSave = () => {
    if (!formData.name || formData.selectedServices.length < 2) {
      toast.error('Nome e pelo menos 2 serviços são obrigatórios')
      return
    }

    const serviceData = selectedServicesData.map(s => ({
      id: s.id,
      name: s.name,
      price: s.price,
      durationMinutes: s.durationMinutes
    }))

    if (editingPackage) {
      setPackages(prev => prev.map(p => 
        p.id === editingPackage.id 
          ? { 
              ...p, 
              name: formData.name,
              description: formData.description,
              services: serviceData,
              originalPrice,
              discountedPrice,
              discountPercent: formData.discountPercent,
              validDays: formData.validDays,
              isFeatured: formData.isFeatured,
              maxUses: formData.maxUses,
            }
          : p
      ))
      toast.success('Pacote atualizado com sucesso')
    } else {
      const newPackage: ServicePackage = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        services: serviceData,
        originalPrice,
        discountedPrice,
        discountPercent: formData.discountPercent,
        validDays: formData.validDays,
        isActive: true,
        isFeatured: formData.isFeatured,
        maxUses: formData.maxUses,
        currentUses: 0,
        createdAt: new Date(),
      }
      setPackages(prev => [...prev, newPackage])
      toast.success('Pacote criado com sucesso')
      
      if (onAddPackage) {
        onAddPackage(newPackage)
      }
    }

    setIsDialogOpen(false)
  }

  const handleToggleActive = (id: string) => {
    setPackages(prev => prev.map(p => 
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ))
    toast.success('Status do pacote atualizado')
  }

  const handleDelete = (id: string) => {
    setPackages(prev => prev.filter(p => p.id !== id))
    toast.success('Pacote removido')
  }

  const handleDuplicate = (pkg: ServicePackage) => {
    const newPackage: ServicePackage = {
      ...pkg,
      id: Date.now().toString(),
      name: `${pkg.name} (cópia)`,
      currentUses: 0,
      createdAt: new Date(),
    }
    setPackages(prev => [...prev, newPackage])
    toast.success('Pacote duplicado')
  }

  const activeCount = packages.filter(p => p.isActive).length
  const featuredCount = packages.filter(p => p.isFeatured).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            Pacotes de Serviços
          </h3>
          <p className="text-sm text-muted-foreground">
            Crie combos com desconto para atrair mais clientes
          </p>
        </div>
        
        <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-purple-500 to-pink-600">
          <Plus className="w-4 h-4 mr-1" />
          Novo Pacote
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{packages.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{featuredCount}</p>
                <p className="text-xs text-muted-foreground">Destaque</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {packages.length > 0 
                    ? Math.round(packages.reduce((sum, p) => sum + p.discountPercent, 0) / packages.length)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Desc. Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <Badge
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
          </Badge>
        ))}
      </div>

      {/* Packages Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {filteredPackages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={cn(
                'relative overflow-hidden transition-all hover:shadow-lg',
                !pkg.isActive && 'opacity-60',
                pkg.isFeatured && 'ring-2 ring-purple-500/50'
              )}>
                {pkg.isFeatured && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Destaque
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{pkg.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {pkg.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Services List */}
                  <div className="space-y-1">
                    {pkg.services.slice(0, 3).map((service) => (
                      <div key={service.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{service.name}</span>
                        <span>R$ {service.price}</span>
                      </div>
                    ))}
                    {pkg.services.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{pkg.services.length - 3} mais serviços
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <span className="text-sm text-muted-foreground line-through">
                        R$ {pkg.originalPrice}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-green-600">
                          R$ {pkg.discountedPrice}
                        </span>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          -{pkg.discountPercent}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {pkg.validDays} dias
                    </div>
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {pkg.currentUses} usos
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={pkg.isActive}
                      onCheckedChange={() => handleToggleActive(pkg.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenDialog(pkg)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(pkg)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => handleDelete(pkg.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredPackages.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Nenhum pacote encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie pacotes de serviços para oferecer descontos especiais
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-1" />
              Criar Primeiro Pacote
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Editar Pacote' : 'Novo Pacote de Serviços'}
            </DialogTitle>
            <DialogDescription>
              Crie um combo de serviços com desconto especial
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Pacote *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Pacote Noiva"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o pacote..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Serviços Incluídos * (selecione pelo menos 2)</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {services.map((service) => {
                  const isSelected = formData.selectedServices.includes(service.id)
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleToggleService(service.id)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border text-left transition-all',
                        isSelected 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-border hover:border-purple-500/50'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center',
                        isSelected && 'bg-purple-500 border-purple-500'
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{service.name}</p>
                        <p className="text-xs text-muted-foreground">R$ {service.price}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            
            {formData.selectedServices.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Original:</span>
                  <span className="font-medium">R$ {originalPrice}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Desconto (%)</Label>
                    <Input
                      type="number"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        discountPercent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      }))}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Valor Final:</p>
                    <p className="text-xl font-bold text-green-600">R$ {discountedPrice}</p>
                    <p className="text-xs text-muted-foreground">
                      Economia: R$ {originalPrice - discountedPrice}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  value={formData.validDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, validDays: parseInt(e.target.value) || 30 }))}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite de Uso (opcional)</Label>
                <Input
                  type="number"
                  value={formData.maxUses || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    maxUses: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="Ilimitado"
                  min={1}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Marcar como Destaque
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pacotes em destaque aparecem primeiro
                </p>
              </div>
              <Switch
                checked={formData.isFeatured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-gradient-to-r from-purple-500 to-pink-600"
            >
              {editingPackage ? 'Salvar' : 'Criar Pacote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
