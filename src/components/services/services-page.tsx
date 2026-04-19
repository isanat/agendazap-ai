'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Clock, DollarSign, Search, Sparkles, Grid, List, Tag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/store/app-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { getStoredAccountId } from '@/hooks/use-data'

interface Service {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  category: string
}

const categories = [
  { id: 'all', name: 'Todos' },
  { id: 'corte', name: 'Corte' },
  { id: 'barba', name: 'Barba' },
  { id: 'tratamento', name: 'Tratamento' },
  { id: 'unhas', name: 'Unhas' },
  { id: 'coloracao', name: 'Coloração' },
]

export function ServicesPage() {
  const { setAddCallback } = useAppStore()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 30,
    price: 0,
    isActive: true,
    category: 'corte'
  })

  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = getStoredAccountId()
    setAccountId(id)
  }, [])

  // Handler for opening dialog
  const handleOpenDialog = useCallback((service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        description: service.description || '',
        durationMinutes: service.durationMinutes,
        price: service.price,
        isActive: service.isActive,
        category: service.category
      })
    } else {
      setEditingService(null)
      setFormData({
        name: '',
        description: '',
        durationMinutes: 30,
        price: 0,
        isActive: true,
        category: 'corte'
      })
    }
    setIsDialogOpen(true)
  }, [])

  // Register callback with store
  useEffect(() => {
    setAddCallback(() => handleOpenDialog)
    return () => setAddCallback(null)
  }, [setAddCallback, handleOpenDialog])

  const fetchServices = useCallback(async (isRefresh = false) => {
    if (!accountId) {
      setIsLoading(false)
      setIsInitialLoad(false)
      return
    }

    // Only show full loading on initial load
    if (isInitialLoad && !isRefresh) {
      setIsLoading(true)
    } else if (isRefresh) {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      const response = await authFetch(`/api/services?accountId=${accountId}`)
      if (!response.ok) throw new Error('Failed to fetch services')
      
      const data = await response.json()
      const transformedServices = (data.services || []).map((service: any) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        isActive: service.isActive,
        category: service.category || 'corte'
      }))
      setServices(transformedServices)
      setIsInitialLoad(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching services:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [accountId, isInitialLoad])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Stats
  const totalServices = services.length
  const activeServices = services.filter(s => s.isActive).length
  const avgPrice = services.length > 0 ? Math.round(services.reduce((acc, s) => acc + s.price, 0) / services.length) : 0
  const avgDuration = services.length > 0 ? Math.round(services.reduce((acc, s) => acc + s.durationMinutes, 0) / services.length) : 0

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do serviço é obrigatório')
      return
    }

    if (!accountId) {
      toast.error('Account ID não encontrado')
      return
    }

    setIsSaving(true)

    try {
      if (editingService) {
        const response = await authFetch('/api/services', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingService.id,
            name: formData.name,
            description: formData.description,
            durationMinutes: formData.durationMinutes,
            price: formData.price,
            category: formData.category,
            isActive: formData.isActive
          })
        })
        
        if (!response.ok) throw new Error('Failed to update service')
        
        toast.success(`Serviço "${formData.name}" atualizado com sucesso!`)
      } else {
        const response = await authFetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            name: formData.name,
            description: formData.description,
            durationMinutes: formData.durationMinutes,
            price: formData.price,
            category: formData.category,
            isActive: formData.isActive
          })
        })
        
        if (!response.ok) throw new Error('Failed to create service')
        
        toast.success(`Serviço "${formData.name}" criado com sucesso!`)
      }
      
      setIsDialogOpen(false)
      fetchServices()
    } catch (err) {
      toast.error('Erro ao salvar serviço')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await authFetch(`/api/services?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete service')
      
      toast.success('Serviço excluído com sucesso!')
      fetchServices()
    } catch (err) {
      toast.error('Erro ao excluir serviço')
      console.error(err)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`
  }

  // Loading state - only show skeleton on INITIAL load
  if (isLoading && isInitialLoad) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // No account state
  if (!accountId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Sparkles className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Conta não encontrada</h2>
        <p className="text-muted-foreground">Faça login para gerenciar seus serviços</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Sparkles className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar serviços</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchServices}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Serviços</h2>
          <p className="text-muted-foreground">Gerencie os serviços oferecidos</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar serviços..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <Tag className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-1 border rounded-lg p-1">
            <Button 
              variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (open) {
              handleOpenDialog()
            } else {
              setIsDialogOpen(false)
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do serviço
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Corte Masculino"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o serviço..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(c => c.id !== 'all').map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duração (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Serviço ativo</Label>
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total de Serviços', value: totalServices, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-500/10' },
          { label: 'Serviços Ativos', value: activeServices, icon: Sparkles, color: 'text-green-600', bg: 'bg-green-500/10' },
          { label: 'Preço Médio', value: `R$ ${avgPrice}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Duração Média', value: `${avgDuration}min`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-500/10' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('p-2.5 rounded-lg', stat.bg)}>
                  <stat.icon className={cn('w-5 h-5', stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Services Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-0">
          {filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhum serviço encontrado</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {search ? 'Tente ajustar sua busca' : 'Adicione seu primeiro serviço'}
              </p>
              <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-green-500 to-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Novo Serviço
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                {filteredServices.map((service, index) => (
                  <motion.tr
                    key={service.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/50 transition-colors border-b"
                  >
                    <TableCell className="py-4">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {service.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {categories.find(c => c.id === service.category)?.name || service.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {formatDuration(service.durationMinutes)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={service.isActive ? 'border-green-500 text-green-600' : 'border-gray-400 text-gray-600'}>
                        {service.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(service)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O serviço "{service.name}" será permanentemente removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(service.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
