'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Phone, Mail, Calendar, Search, AlertTriangle, CheckCircle, Users, Shield, Info, Download, MessageSquare, Loader2, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox as UICheckbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getStoredAccountId } from '@/hooks/use-data'
import { useAppStore } from '@/store/app-store'

interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  totalAppointments: number
  noShowCount: number
  noShowScore: number
  lastVisit: string | null
  notes: string | null
}

export function ClientsPage() {
  const { setAddCallback } = useAppStore()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  })

  // Get accountId from localStorage
  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = getStoredAccountId()
    setAccountId(id)
  }, [])

  // Fetch clients from API
  const fetchClients = useCallback(async (isRefresh = false) => {
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
      const response = await authFetch(`/api/clients?accountId=${accountId}`)
      if (!response.ok) throw new Error('Failed to fetch clients')
      
      const data = await response.json()
      const transformedClients = (data.clients || []).map((client: any) => ({
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        totalAppointments: client.totalAppointments || 0,
        noShowCount: client.noShowCount || 0,
        noShowScore: client.noShowScore || 50,
        lastVisit: client.lastVisit,
        notes: client.notes
      }))
      setClients(transformedClients)
      setIsInitialLoad(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching clients:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [accountId, isInitialLoad])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.includes(search) ||
      (client.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
    
    const matchesRisk = riskFilter === 'all' ||
      (riskFilter === 'low' && client.noShowScore < 30) ||
      (riskFilter === 'medium' && client.noShowScore >= 30 && client.noShowScore < 70) ||
      (riskFilter === 'high' && client.noShowScore >= 70)
    
    return matchesSearch && matchesRisk
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(filteredClients.map(c => c.id))
    } else {
      setSelectedClients([])
    }
  }

  const handleSelectClient = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClients([...selectedClients, clientId])
    } else {
      setSelectedClients(selectedClients.filter(id => id !== clientId))
    }
  }

  const handleExport = async () => {
    if (!exportFormat) return
    
    setIsExporting(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsExporting(false)
    setShowExportDialog(false)
    
    const clientsToExport = selectedClients.length > 0 
      ? clients.filter(c => selectedClients.includes(c.id))
      : filteredClients
    
    // Generate CSV content
    const headers = ['Nome', 'Telefone', 'Email', 'Agendamentos', 'No-Shows', 'Score Risco', 'Última Visita']
    const rows = clientsToExport.map(c => [
      c.name,
      c.phone,
      c.email || '',
      c.totalAppointments.toString(),
      c.noShowCount.toString(),
      `${c.noShowScore}%`,
      c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('pt-BR') : 'Nunca'
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `clientes-agendazap-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    toast.success(`${clientsToExport.length} clientes exportados com sucesso!`, {
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
    })
    setSelectedClients([])
  }

  const handleWhatsAppMessage = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    window.open(`https://wa.me/55${cleanPhone}`, '_blank')
  }

  const handleBulkWhatsApp = () => {
    const clientsToMessage = selectedClients.length > 0
      ? clients.filter(c => selectedClients.includes(c.id))
      : filteredClients
    
    if (clientsToMessage.length > 5) {
      toast.error('Selecione no máximo 5 clientes para envio em massa')
      return
    }
    
    clientsToMessage.forEach(client => {
      const cleanPhone = client.phone.replace(/\D/g, '')
      window.open(`https://wa.me/55${cleanPhone}`, '_blank')
    })
    
    toast.success(`Abrindo WhatsApp para ${clientsToMessage.length} clientes`)
  }

  const handleOpenDialog = useCallback((client?: Client) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        name: client.name,
        phone: client.phone,
        email: client.email || '',
        notes: client.notes || ''
      })
    } else {
      setEditingClient(null)
      setFormData({
        name: '',
        phone: '',
        email: '',
        notes: ''
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
    if (!formData.name || !formData.phone) {
      toast.error('Nome e telefone são obrigatórios')
      return
    }

    try {
      if (editingClient) {
        // Update existing client
        const response = await authFetch('/api/clients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingClient.id,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            notes: formData.notes
          })
        })
        
        if (!response.ok) throw new Error('Failed to update client')
        
        toast.success('Cliente atualizado com sucesso!')
      } else {
        // Create new client
        if (!accountId) {
          toast.error('Account ID não encontrado')
          return
        }
        
        const response = await authFetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            notes: formData.notes
          })
        })
        
        if (!response.ok) throw new Error('Failed to create client')
        
        toast.success('Cliente criado com sucesso!')
      }
      
      setIsDialogOpen(false)
      fetchClients()
    } catch (err) {
      toast.error('Erro ao salvar cliente')
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await authFetch(`/api/clients?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete client')
      
      toast.success('Cliente removido com sucesso!')
      fetchClients()
    } catch (err) {
      toast.error('Erro ao remover cliente')
      console.error(err)
    }
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedClients.map(id => 
          authFetch(`/api/clients?id=${id}`, { method: 'DELETE' })
        )
      )
      
      toast.success(`${selectedClients.length} clientes removidos`)
      setSelectedClients([])
      fetchClients()
    } catch (err) {
      toast.error('Erro ao remover clientes')
      console.error(err)
    }
  }

  const getNoShowColor = (score: number) => {
    if (score < 30) return 'text-green-600'
    if (score < 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getNoShowBg = (score: number) => {
    if (score < 30) return 'bg-green-500'
    if (score < 60) return 'bg-yellow-500'
    return 'bg-red-500'
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
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => (
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
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Conta não encontrada</h2>
        <p className="text-muted-foreground">Faça login para gerenciar seus clientes</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar clientes</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => fetchClients()}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clientes</h2>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filtrar risco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="low">Baixo Risco</SelectItem>
              <SelectItem value="medium">Médio Risco</SelectItem>
              <SelectItem value="high">Alto Risco</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setExportFormat('csv')
                setShowExportDialog(true)
              }}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setExportFormat('xlsx')
                setShowExportDialog(true)
              }}>
                <FileText className="w-4 h-4 mr-2" />
                Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBulkWhatsApp}>
                <MessageSquare className="w-4 h-4 mr-2 text-green-600" />
                WhatsApp ({selectedClients.length || filteredClients.length})
              </DropdownMenuItem>
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
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do cliente
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
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações sobre o cliente..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="bg-gradient-to-r from-green-500 to-emerald-600">
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Baixo Risco</p>
                <p className="text-2xl font-bold">{clients.filter(c => c.noShowScore < 30).length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/10">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alto Risco</p>
                <p className="text-2xl font-bold">{clients.filter(c => c.noShowScore >= 70).length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Risk Legend */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
        <Info className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Legenda de Risco:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-xs">Baixo (0-29%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-xs">Médio (30-69%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-xs">Alto (70-100%)</span>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedClients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
          >
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              {selectedClients.length} cliente(s) selecionado(s)
            </span>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" onClick={handleBulkWhatsApp}>
                <MessageSquare className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remover
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir clientes selecionados?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. {selectedClients.length} clientes serão permanentemente removidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleBulkDelete}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" variant="ghost" onClick={() => setSelectedClients([])}>
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clients Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {search ? 'Tente ajustar sua busca' : 'Adicione seu primeiro cliente'}
              </p>
              <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-green-500 to-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10">
                    <UICheckbox
                      checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Contato</TableHead>
                  <TableHead className="text-center font-semibold">Agendamentos</TableHead>
                  <TableHead className="text-center font-semibold">No-Shows</TableHead>
                  <TableHead className="font-semibold">Risco No-Show</TableHead>
                  <TableHead className="font-semibold">Última Visita</TableHead>
                  <TableHead className="text-right font-semibold w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client, index) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "group",
                      selectedClients.includes(client.id) && "bg-green-50 dark:bg-green-900/10"
                    )}
                  >
                    <TableCell>
                      <UICheckbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 ring-2 ring-background shadow-sm">
                          <AvatarFallback className={cn(
                            "font-medium",
                            client.noShowScore >= 70 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            client.noShowScore >= 30 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          )}>
                            {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium">{client.name}</p>
                          {client.notes && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-muted-foreground truncate max-w-36 cursor-help">
                                    {client.notes}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{client.notes}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate max-w-36">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-medium">
                        {client.totalAppointments}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={client.noShowCount > 0 ? 'destructive' : 'outline'}
                        className={cn(
                          "font-medium",
                          client.noShowCount === 0 && "text-green-600 border-green-600"
                        )}
                      >
                        {client.noShowCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <div className="relative w-20 h-2.5 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className={cn("absolute inset-y-0 left-0 rounded-full transition-all", getNoShowBg(client.noShowScore))}
                                  style={{ width: `${client.noShowScore}%` }}
                                />
                              </div>
                              <span className={cn('text-sm font-medium tabular-nums', getNoShowColor(client.noShowScore))}>
                                {client.noShowScore}%
                              </span>
                              {client.noShowScore >= 70 && (
                                <Shield className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Score calculado com base em histórico de no-shows</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      {client.lastVisit ? (
                        <span className="text-sm">
                          {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                                onClick={() => handleWhatsAppMessage(client.phone)}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Enviar WhatsApp</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleOpenDialog(client)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O cliente "{client.name}" será permanentemente removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(client.id)}
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
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Exportar Clientes
            </DialogTitle>
            <DialogDescription>
              {selectedClients.length > 0 
                ? `${selectedClients.length} clientes selecionados serão exportados.`
                : `${filteredClients.length} clientes serão exportados.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowExportDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
              disabled={isExporting}
              onClick={handleExport}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar {exportFormat?.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
