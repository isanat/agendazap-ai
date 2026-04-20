'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Mail, Phone, Calendar, Search, Clock, Briefcase, Filter, Scissors, Sparkles, Users, ChevronDown, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getStoredAccountId } from '@/hooks/use-data'
import { useAppStore } from '@/store/app-store'

interface Professional {
  id: string
  name: string
  phone: string | null
  email: string | null
  avatar?: string
  color: string
  isActive: boolean
  workingDays: string | null
  openingTime: string | null
  closingTime: string | null
  services: string[]
  appointmentCount: number
}

const serviceOptions = [
  { id: 'corte', name: 'Corte', icon: Scissors },
  { id: 'barba', name: 'Barba', icon: Sparkles },
  { id: 'coloracao', name: 'Coloração', icon: Sparkles },
  { id: 'hidratacao', name: 'Hidratação', icon: Sparkles },
  { id: 'manicure', name: 'Manicure', icon: Sparkles },
  { id: 'pedicure', name: 'Pedicure', icon: Sparkles },
  { id: 'sobrancelha', name: 'Sobrancelha', icon: Sparkles },
  { id: 'maquiagem', name: 'Maquiagem', icon: Sparkles },
]

const colorOptions = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16']

export function ProfessionalsPage() {
  const { setAddCallback } = useAppStore()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    color: '#10B981',
    isActive: true,
    services: [] as string[]
  })

  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = getStoredAccountId()
    setAccountId(id)
  }, [])

  const fetchProfessionals = useCallback(async (isRefresh = false) => {
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
      const response = await authFetch(`/api/professionals?accountId=${accountId}`)
      if (!response.ok) throw new Error('Failed to fetch professionals')
      
      const data = await response.json()
      const transformedProfessionals = (data.professionals || []).map((prof: any) => ({
        id: prof.id,
        name: prof.name,
        phone: prof.phone,
        email: prof.email,
        avatar: prof.avatar,
        color: prof.color || '#10B981',
        isActive: prof.isActive,
        workingDays: prof.workingDays,
        openingTime: prof.openingTime,
        closingTime: prof.closingTime,
        services: prof.services || [],
        appointmentCount: prof.appointmentCount || 0
      }))
      setProfessionals(transformedProfessionals)
      setIsInitialLoad(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching professionals:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [accountId, isInitialLoad])

  useEffect(() => {
    fetchProfessionals()
  }, [fetchProfessionals])

  const filteredProfessionals = professionals.filter(prof => {
    const matchesSearch = prof.name.toLowerCase().includes(search.toLowerCase()) ||
      (prof.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && prof.isActive) ||
      (statusFilter === 'inactive' && !prof.isActive)
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: professionals.length,
    active: professionals.filter(p => p.isActive).length,
    inactive: professionals.filter(p => !p.isActive).length,
    totalAppointments: professionals.reduce((acc, p) => acc + p.appointmentCount, 0)
  }

  const handleOpenDialog = useCallback((professional?: Professional) => {
    if (professional) {
      setEditingProfessional(professional)
      setFormData({
        name: professional.name,
        phone: professional.phone || '',
        email: professional.email || '',
        color: professional.color,
        isActive: professional.isActive,
        services: professional.services
      })
    } else {
      setEditingProfessional(null)
      setFormData({
        name: '',
        phone: '',
        email: '',
        color: '#10B981',
        isActive: true,
        services: []
      })
    }
    setIsDialogOpen(true)
  }, [])

  // Register callback with store
  useEffect(() => {
    setAddCallback(() => handleOpenDialog)
    return () => setAddCallback(null)
  }, [setAddCallback, handleOpenDialog])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!accountId) {
      toast.error('Account ID não encontrado')
      return
    }

    setIsSaving(true)

    try {
      if (editingProfessional) {
        const response = await authFetch('/api/professionals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProfessional.id,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            color: formData.color,
            isActive: formData.isActive
          })
        })
        
        if (!response.ok) throw new Error('Failed to update professional')
        
        toast.success(`Profissional "${formData.name}" atualizado com sucesso!`)
      } else {
        const response = await authFetch('/api/professionals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            color: formData.color
          })
        })
        
        if (!response.ok) throw new Error('Failed to create professional')
        
        toast.success(`Profissional "${formData.name}" criado com sucesso!`)
      }
      
      setIsDialogOpen(false)
      fetchProfessionals()
    } catch (err) {
      toast.error('Erro ao salvar profissional')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await authFetch(`/api/professionals?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete professional')
      
      toast.success('Profissional removido com sucesso!')
      fetchProfessionals()
    } catch (err) {
      toast.error('Erro ao remover profissional')
      console.error(err)
    }
  }

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }))
  }

  // Loading state - only show skeleton on INITIAL load
  if (isLoading && isInitialLoad) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  // No account state
  if (!accountId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Conta não encontrada</h2>
        <p className="text-muted-foreground">Faça login para gerenciar seus profissionais</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Users className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar profissionais</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => fetchProfessionals()}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-gray-500/10 to-gray-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-500/20">
                  <XCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inativos</p>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agendamentos</p>
                  <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profissionais</h2>
          <p className="text-muted-foreground">Gerencie sua equipe</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar profissionais..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {statusFilter === 'all' ? 'Todos' : statusFilter === 'active' ? 'Ativos' : 'Inativos'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'all'}
                onCheckedChange={() => setStatusFilter('all')}
              >
                Todos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'active'}
                onCheckedChange={() => setStatusFilter('active')}
              >
                Ativos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'inactive'}
                onCheckedChange={() => setStatusFilter('inactive')}
              >
                Inativos
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-green-500 to-emerald-600"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do profissional
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Cor no calendário</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-all',
                          formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Serviços</Label>
                  <div className="flex flex-wrap gap-2">
                    {serviceOptions.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm border transition-all',
                          formData.services.includes(service.id)
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-muted hover:bg-muted/80 border-muted-foreground/20'
                        )}
                      >
                        {service.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Profissional ativo</Label>
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

      {/* Professionals Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredProfessionals.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhum profissional encontrado</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {search ? 'Tente ajustar sua busca' : 'Adicione seu primeiro profissional'}
              </p>
              <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-green-500 to-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Novo Profissional
              </Button>
            </div>
          ) : (
            filteredProfessionals.map((professional, index) => (
              <motion.div
                key={professional.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                layout
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border-0 shadow-lg">
                  <motion.div 
                    className="h-2"
                    style={{ backgroundColor: professional.color }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
                  />
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Avatar className="w-12 h-12 ring-2 ring-offset-2 ring-transparent group-hover:ring-muted transition-all" style={{ '--tw-ring-color': professional.color } as React.CSSProperties}>
                          <AvatarImage src={professional.avatar} />
                          <AvatarFallback style={{ backgroundColor: professional.color, color: 'white' }}>
                            {professional.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{professional.name}</h3>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.05 + 0.3 }}
                          >
                            <Badge 
                              variant="outline"
                              className={cn(
                                'text-xs',
                                professional.isActive 
                                  ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50' 
                                  : 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/50'
                              )}
                            >
                              {professional.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </motion.div>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {professional.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3.5 h-3.5" />
                              {professional.phone}
                            </div>
                          )}
                          {professional.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate">{professional.email}</span>
                            </div>
                          )}
                          {professional.openingTime && professional.closingTime && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              {professional.openingTime} - {professional.closingTime}
                            </div>
                          )}
                          {professional.workingDays && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>Seg - Sex</span>
                            </div>
                          )}
                        </div>
                        {/* Services */}
                        {professional.services.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {professional.services.slice(0, 3).map((serviceId) => {
                              const service = serviceOptions.find(s => s.id === serviceId)
                              return service ? (
                                <Badge key={serviceId} variant="secondary" className="text-xs px-2 py-0.5">
                                  {service.name}
                                </Badge>
                              ) : null
                            })}
                            {professional.services.length > 3 && (
                              <Badge variant="outline" className="text-xs px-2 py-0.5">
                                +{professional.services.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        {/* Appointment Count */}
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">{professional.appointmentCount}</strong> agendamentos este mês
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-muted"
                        onClick={() => handleOpenDialog(professional)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir profissional?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O profissional "{professional.name}" será permanentemente removido.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDelete(professional.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
