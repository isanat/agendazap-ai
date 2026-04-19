'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, Search, Filter, MoreVertical, Check, X, 
  Phone, Mail, Calendar, Users, Scissors, CreditCard,
  TrendingUp, AlertTriangle, Eye, Edit, Trash2, RefreshCw,
  Crown, Globe, MapPin, Clock, Loader2, Key, Send
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { authFetch, authGet } from '@/lib/auth-fetch'

interface Account {
  id: string
  businessName: string
  businessType: string
  whatsappNumber: string
  whatsappConnected: boolean
  plan: string
  trialEndsAt: string | null
  createdAt: string
  User: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
  }
  subscription?: {
    id: string
    status: string
    plan: {
      displayName: string
      priceMonthly: number
    }
  }
  _count: {
    services: number
    professionals: number
    clients: number
    appointments: number
  }
  stats: {
    appointmentsThisMonth: number
    completedAppointments: number
    noShows: number
    noShowRate: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const businessTypes: Record<string, string> = {
  salon: 'Salão',
  clinic: 'Clínica',
  dentist: 'Dentista',
  personal: 'Personal',
  other: 'Outro',
}

const planOptions = [
  { value: 'basic', label: 'Básico', color: 'bg-blue-500/20 text-blue-700 border-blue-300' },
  { value: 'pro', label: 'Profissional', color: 'bg-green-500/20 text-green-700 border-green-300' },
  { value: 'salon', label: 'Salão', color: 'bg-purple-500/20 text-purple-700 border-purple-300' },
  { value: 'enterprise', label: 'Empresa', color: 'bg-amber-500/20 text-amber-700 border-amber-300' },
]

const planColors: Record<string, string> = {
  basic: 'bg-blue-500/20 text-blue-700 border-blue-300',
  pro: 'bg-green-500/20 text-green-700 border-green-300',
  salon: 'bg-purple-500/20 text-purple-700 border-purple-300',
  enterprise: 'bg-amber-500/20 text-amber-700 border-amber-300',
}

export function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit form
  const [editForm, setEditForm] = useState({
    businessName: '',
    businessType: '',
    whatsappNumber: '',
    plan: '',
    whatsappConnected: false
  })

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(planFilter !== 'all' && { plan: planFilter }),
      })

      const response = await authGet(`/api/admin/accounts?${params}`)
      const data = await response.json()

      if (response.ok) {
        setAccounts(data.accounts)
        setPagination(prev => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages }))
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Não foi possível carregar as empresas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [pagination.page, statusFilter, planFilter])

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchAccounts()
  }

  const handleViewDetails = (account: Account) => {
    setSelectedAccount(account)
    setDetailsOpen(true)
  }

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account)
    setEditForm({
      businessName: account.businessName,
      businessType: account.businessType,
      whatsappNumber: account.whatsappNumber,
      plan: account.plan,
      whatsappConnected: account.whatsappConnected
    })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedAccount) return
    
    setIsSubmitting(true)
    try {
      const response = await authFetch('/api/admin/accounts', {
        method: 'PUT',
        body: {
          id: selectedAccount.id,
          businessName: editForm.businessName,
          businessType: editForm.businessType,
          whatsappNumber: editForm.whatsappNumber,
          plan: editForm.plan,
          whatsappConnected: editForm.whatsappConnected
        }
      })
      
      if (!response.ok) throw new Error('Erro ao atualizar empresa')
      
      toast.success('Empresa atualizada com sucesso!')
      setEditOpen(false)
      fetchAccounts()
    } catch (error) {
      toast.error('Erro ao atualizar empresa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return
    
    setIsSubmitting(true)
    try {
      const response = await authFetch(`/api/admin/accounts?id=${selectedAccount.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erro ao excluir empresa')
      
      toast.success('Empresa excluída com sucesso!')
      setDeleteOpen(false)
      setDetailsOpen(false)
      fetchAccounts()
    } catch (error) {
      toast.error('Erro ao excluir empresa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (account: Account) => {
    try {
      const response = await authFetch('/api/admin/users/password', {
        method: 'POST',
        body: {
          userId: account.User.id,
          newPassword: '123456'
        }
      })
      
      if (!response.ok) throw new Error('Erro ao resetar senha')
      
      toast.success('Senha resetada para: 123456')
    } catch (error) {
      toast.error('Erro ao resetar senha')
    }
  }

  const handleSendEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank')
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Empresas</p>
                <p className="text-3xl font-bold">{pagination.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp Ativo</p>
                <p className="text-3xl font-bold">
                  {accounts.filter(a => a.whatsappConnected).length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                <Check className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-3xl font-bold">
                  {accounts.reduce((sum, a) => sum + a._count.clients, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos (Mês)</p>
                <p className="text-3xl font-bold">
                  {accounts.reduce((sum, a) => sum + a.stats.appointmentsThisMonth, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Buscar por nome, email, WhatsApp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">WhatsApp Ativo</SelectItem>
                  <SelectItem value="inactive">WhatsApp Inativo</SelectItem>
                  <SelectItem value="trial">Em Trial</SelectItem>
                </SelectContent>
              </Select>

              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {planOptions.map(plan => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => fetchAccounts()}>
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Cadastradas</CardTitle>
          <CardDescription>
            {pagination.total} empresas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhuma empresa encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead className="text-center">Agendamentos</TableHead>
                  <TableHead className="text-center">No-Show</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account, index) => (
                  <motion.tr
                    key={account.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="group hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
                          {account.businessName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{account.businessName}</p>
                          <p className="text-xs text-muted-foreground">
                            {businessTypes[account.businessType] || account.businessType}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{account.User.name}</p>
                        <p className="text-xs text-muted-foreground">{account.User.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={planColors[account.plan] || ''}>
                        {account.subscription?.plan?.displayName || account.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{account.whatsappNumber}</span>
                        {account.whatsappConnected ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{account._count.clients}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>
                        <span className="font-medium">{account.stats.appointmentsThisMonth}</span>
                        <p className="text-xs text-muted-foreground">este mês</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={cn(
                        'font-medium',
                        account.stats.noShowRate > 20 && 'text-red-600',
                        account.stats.noShowRate > 10 && 'text-amber-600'
                      )}>
                        {account.stats.noShowRate}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(account.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewDetails(account)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(account.User.email)}>
                            <Send className="w-4 h-4 mr-2" />
                            Enviar Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(account)}>
                            <Key className="w-4 h-4 mr-2" />
                            Resetar Senha
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setSelectedAccount(account)
                              setDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Account Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedAccount?.businessName}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos da empresa
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="owner">Proprietário</TabsTrigger>
                <TabsTrigger value="stats">Estatísticas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Tipo de Negócio</span>
                      </div>
                      <p className="font-medium">{businessTypes[selectedAccount.businessType] || selectedAccount.businessType}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Plano Atual</span>
                      </div>
                      <Badge variant="outline" className={planColors[selectedAccount.plan]}>
                        {selectedAccount.subscription?.plan?.displayName || selectedAccount.plan}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{selectedAccount.whatsappNumber}</p>
                        <p className="text-xs text-muted-foreground">WhatsApp</p>
                      </div>
                    </div>
                    <Badge variant={selectedAccount.whatsappConnected ? 'default' : 'secondary'}>
                      {selectedAccount.whatsappConnected ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Users className="w-5 h-5 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold">{selectedAccount._count.clients}</p>
                    <p className="text-xs text-muted-foreground">Clientes</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Scissors className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{selectedAccount._count.services}</p>
                    <p className="text-xs text-muted-foreground">Serviços</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Users className="w-5 h-5 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">{selectedAccount._count.professionals}</p>
                    <p className="text-xs text-muted-foreground">Profissionais</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                    <p className="text-2xl font-bold">{selectedAccount._count.appointments}</p>
                    <p className="text-xs text-muted-foreground">Agendamentos</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="owner" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xl font-bold">
                        {selectedAccount.User.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{selectedAccount.User.name}</h3>
                        <p className="text-muted-foreground">{selectedAccount.User.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                            Proprietário
                          </Badge>
                          <Badge variant={selectedAccount.User.isActive ? 'default' : 'secondary'}>
                            {selectedAccount.User.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Cadastro</p>
                        <p className="font-medium">{formatDate(selectedAccount.User.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ID do Usuário</p>
                        <p className="font-mono text-sm">{selectedAccount.User.id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleSendEmail(selectedAccount.User.email)}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Email
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleResetPassword(selectedAccount)}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Resetar Senha
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Este Mês</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAccount.stats.appointmentsThisMonth}</p>
                      <p className="text-xs text-muted-foreground">agendamentos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Completados</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAccount.stats.completedAppointments}</p>
                      <p className="text-xs text-muted-foreground">total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={cn(
                          'w-4 h-4',
                          selectedAccount.stats.noShowRate > 20 ? 'text-red-500' : 
                          selectedAccount.stats.noShowRate > 10 ? 'text-amber-500' : 'text-green-500'
                        )} />
                        <span className="text-sm font-medium">Taxa No-Show</span>
                      </div>
                      <p className={cn(
                        'text-2xl font-bold',
                        selectedAccount.stats.noShowRate > 20 && 'text-red-600',
                        selectedAccount.stats.noShowRate > 10 && 'text-amber-600'
                      )}>
                        {selectedAccount.stats.noShowRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedAccount.stats.noShows} no-shows</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setDetailsOpen(false)
              if (selectedAccount) handleEditAccount(selectedAccount)
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Empresa
            </DialogTitle>
            <DialogDescription>
              Altere as informações da empresa
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nome do Negócio</Label>
              <Input
                id="businessName"
                value={editForm.businessName}
                onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="businessType">Tipo de Negócio</Label>
              <Select 
                value={editForm.businessType} 
                onValueChange={(value) => setEditForm({ ...editForm, businessType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(businessTypes).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp</Label>
              <Input
                id="whatsappNumber"
                value={editForm.whatsappNumber}
                onChange={(e) => setEditForm({ ...editForm, whatsappNumber: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plan">Plano</Label>
              <Select 
                value={editForm.plan} 
                onValueChange={(value) => setEditForm({ ...editForm, plan: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map(plan => (
                    <SelectItem key={plan.value} value={plan.value}>{plan.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="whatsappConnected">WhatsApp Conectado</Label>
              <Button
                variant={editForm.whatsappConnected ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditForm({ ...editForm, whatsappConnected: !editForm.whatsappConnected })}
              >
                {editForm.whatsappConnected ? 'Sim' : 'Não'}
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa <strong>{selectedAccount?.businessName}</strong>? 
              Esta ação excluirá todos os dados relacionados (clientes, agendamentos, etc.) e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
