'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, Plus, Edit, Trash2, Gift, Percent, 
  ChevronDown, ChevronUp, Sparkles, DollarSign,
  Clock, Tag, Check, X, Eye, Copy, Loader2
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
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { authFetch } from '@/lib/auth-fetch'

interface Service {
  id: string
  name: string
  price: number
  durationMinutes: number
}

interface PackageServiceItem {
  id: string
  name: string
  price: number
  durationMinutes: number
}

interface ServicePackage {
  id: string
  name: string
  description: string
  services: PackageServiceItem[]
  originalPrice: number
  discountedPrice: number
  discountPercent: number
  validDays: number
  isActive: boolean
  isFeatured: boolean
  maxUses: number | null
  currentUses: number
  createdAt: string
}

interface ServicePackagesProps {
  services?: Service[]
  onAddPackage?: (pkg: Partial<ServicePackage>) => void
}

export function ServicePackages({ services: propServices, onAddPackage }: ServicePackagesProps) {
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [services, setServices] = useState<Service[]>(propServices || [])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)
  const [isSaving, setIsSaving] = useState(false)
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

  const fetchPackages = async () => {
    setIsLoading(true)
    try {
      const response = await authFetch('/api/packages?includeInactive=true')
      if (response.ok) {
        const data = await response.json()
        const mapped = (Array.isArray(data) ? data : []).map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description || '',
          services: (pkg.packageServices || []).map((ps: any) => ({
            id: ps.Service?.id || ps.serviceId,
            name: ps.Service?.name || '',
            price: ps.Service?.price || 0,
            durationMinutes: ps.Service?.durationMinutes || 0,
          })),
          originalPrice: pkg.originalPrice || 0,
          discountedPrice: pkg.price || 0,
          discountPercent: pkg.discountPercent || pkg.discount || 0,
          validDays: pkg.validityDays || 30,
          isActive: pkg.isActive ?? true,
          isFeatured: false,
          maxUses: null,
          currentUses: pkg.clientsCount || 0,
          createdAt: pkg.createdAt || new Date().toISOString(),
        }))
        setPackages(mapped)
      } else {
        toast.error('Erro ao carregar pacotes')
      }
    } catch (error) {
      console.error('Erro ao buscar pacotes:', error)
      toast.error('Erro ao carregar pacotes')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const accountId = typeof window !== 'undefined' 
        ? localStorage.getItem('agendazap-account-id') || ''
        : ''
      const response = await authFetch(`/api/services?accountId=${accountId}`)
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error)
    }
  }

  useEffect(() => {
    fetchPackages()
    if (!propServices || propServices.length === 0) {
      fetchServices()
    }
  }, [])

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

  const handleSave = async () => {
    if (!formData.name || formData.selectedServices.length < 2) {
      toast.error('Nome e pelo menos 2 serviços são obrigatórios')
      return
    }

    setIsSaving(true)
    try {
      const serviceItems = formData.selectedServices.map(serviceId => ({
        serviceId,
        quantity: 1,
      }))

      if (editingPackage) {
        const response = await authFetch('/api/packages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPackage.id,
            name: formData.name,
            description: formData.description,
            price: discountedPrice,
            originalPrice,
            discountPercent: formData.discountPercent,
            validityDays: formData.validDays,
            isActive: editingPackage.isActive,
            services: serviceItems,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao atualizar pacote')
        }

        toast.success('Pacote atualizado com sucesso')
      } else {
        const response = await authFetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            price: discountedPrice,
            originalPrice,
            discountPercent: formData.discountPercent,
            totalSessions: 1,
            validityDays: formData.validDays,
            services: serviceItems,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao criar pacote')
        }

        toast.success('Pacote criado com sucesso')
      }

      setIsDialogOpen(false)
      fetchPackages()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar pacote')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (pkg: ServicePackage) => {
    try {
      const response = await authFetch('/api/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          price: pkg.discountedPrice,
          originalPrice: pkg.originalPrice,
          discountPercent: pkg.discountPercent,
          validityDays: pkg.validDays,
          isActive: !pkg.isActive,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar status')
      }

      toast.success('Status do pacote atualizado')
      fetchPackages()
    } catch (error) {
      toast.error('Erro ao atualizar status do pacote')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await authFetch(`/api/packages?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir pacote')
      }

      toast.success('Pacote removido')
      fetchPackages()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover pacote')
    }
  }

  const handleDuplicate = async (pkg: ServicePackage) => {
    try {
      const serviceItems = pkg.services.map(s => ({
        serviceId: s.id,
        quantity: 1,
      }))

      const response = await authFetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${pkg.name} (cópia)`,
          description: pkg.description,
          price: pkg.discountedPrice,
          originalPrice: pkg.originalPrice,
          discountPercent: pkg.discountPercent,
          totalSessions: 1,
          validityDays: pkg.validDays,
          services: serviceItems,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao duplicar pacote')
      }

      toast.success('Pacote duplicado')
      fetchPackages()
    } catch (error) {
      toast.error('Erro ao duplicar pacote')
    }
  }

  const activeCount = packages.filter(p => p.isActive).length
  const featuredCount = packages.filter(p => p.isFeatured).length

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
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

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
                      onCheckedChange={() => handleToggleActive(pkg)}
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
              disabled={isSaving}
              className="bg-gradient-to-r from-purple-500 to-pink-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingPackage ? 'Salvar' : 'Criar Pacote'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
