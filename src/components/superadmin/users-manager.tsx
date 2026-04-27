'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, MoreVertical, Mail, Phone, Calendar,
  Shield, Clock, Activity, Download, UserCheck,
  UserX, Crown, Briefcase, User, Eye, Ban, CheckCircle,
  TrendingUp, Loader2, Key, Edit, Trash2, Send
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { authFetch, authGet } from '@/lib/auth-fetch'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'superadmin' | 'owner' | 'admin' | 'professional'
  status: 'active' | 'inactive' | 'suspended'
  accountId: string | null
  accountName: string | null
  planName: string | null
  createdAt: string
  lastLogin: string | null
  loginCount: number
}

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '' as string
  })
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (search) params.append('search', search)

      const response = await authGet(`/api/admin/users?${params.toString()}`)
      
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching users:', err)
    } finally {
      setIsLoading(false)
    }
  }, [roleFilter, statusFilter, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Calculate stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    owners: users.filter(u => u.role === 'owner').length,
    admins: users.filter(u => u.role === 'admin').length,
    professionals: users.filter(u => u.role === 'professional').length,
    newThisMonth: users.filter(u => {
      const date = new Date(u.createdAt)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
  }

  // Filter users (client-side for now)
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.accountName?.toLowerCase().includes(search.toLowerCase()) ?? false)
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <Crown className="w-3 h-3 mr-1" />
            Super Admin
          </Badge>
        )
      case 'owner':
        return (
          <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white">
            <Briefcase className="w-3 h-3 mr-1" />
            Proprietário
          </Badge>
        )
      case 'admin':
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      case 'professional':
        return (
          <Badge variant="outline" className="border-emerald-500 text-emerald-600">
            <User className="w-3 h-3 mr-1" />
            Profissional
          </Badge>
        )
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ativo
          </Badge>
        )
      case 'inactive':
        return (
          <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Inativo
          </Badge>
        )
      case 'suspended':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <Ban className="w-3 h-3 mr-1" />
            Suspenso
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-gradient-to-br from-amber-400 to-orange-500'
      case 'owner':
        return 'bg-gradient-to-br from-violet-400 to-purple-500'
      case 'admin':
        return 'bg-gradient-to-br from-blue-400 to-cyan-500'
      default:
        return 'bg-gradient-to-br from-emerald-400 to-teal-500'
    }
  }

  // Actions
  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return
    
    setIsSubmitting(true)
    try {
      const response = await authFetch('/api/admin/users', {
        method: 'PUT',
        body: {
          id: selectedUser.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          role: editForm.role
        }
      })
      
      if (!response.ok) throw new Error('Erro ao atualizar usuário')
      
      toast.success('Usuário atualizado com sucesso!')
      setShowEditDialog(false)
      fetchUsers()
    } catch (error) {
      toast.error('Erro ao atualizar usuário')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangePassword = (user: User) => {
    setSelectedUser(user)
    setPasswordForm({ newPassword: '', confirmPassword: '' })
    setShowPasswordDialog(true)
  }

  const handleSavePassword = async () => {
    if (!selectedUser) return
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não conferem')
      return
    }
    
    setIsSubmitting(true)
    try {
      const response = await authFetch('/api/admin/users/password', {
        method: 'POST',
        body: {
          userId: selectedUser.id,
          newPassword: passwordForm.newPassword
        }
      })
      
      if (!response.ok) throw new Error('Erro ao alterar senha')
      
      toast.success('Senha alterada com sucesso!')
      setShowPasswordDialog(false)
    } catch (error) {
      toast.error('Erro ao alterar senha')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuspendUser = async (user: User) => {
    try {
      const response = await authFetch('/api/admin/users', {
        method: 'PUT',
        body: {
          id: user.id,
          isActive: false
        }
      })
      
      if (!response.ok) throw new Error('Erro ao suspender usuário')
      
      toast.success('Usuário suspenso com sucesso!')
      fetchUsers()
    } catch (error) {
      toast.error('Erro ao suspender usuário')
    }
  }

  const handleReactivateUser = async (user: User) => {
    try {
      const response = await authFetch('/api/admin/users', {
        method: 'PUT',
        body: {
          id: user.id,
          isActive: true
        }
      })
      
      if (!response.ok) throw new Error('Erro ao reativar usuário')
      
      toast.success('Usuário reativado com sucesso!')
      fetchUsers()
    } catch (error) {
      toast.error('Erro ao reativar usuário')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    setIsSubmitting(true)
    try {
      const response = await authFetch(`/api/admin/users?id=${selectedUser.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erro ao excluir usuário')
      
      toast.success('Usuário excluído com sucesso!')
      setShowDeleteDialog(false)
      fetchUsers()
    } catch (error) {
      toast.error('Erro ao excluir usuário')
    } finally {
      setIsSubmitting(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Função', 'Status', 'Empresa', 'Plano', 'Criado em']
    const rows = filteredUsers.map(u => [
      u.name,
      u.email,
      u.phone || '',
      u.role,
      u.status,
      u.accountName || '',
      u.planName || '',
      u.createdAt
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'usuarios.csv'
    a.click()
    
    toast.success('Lista de usuários exportada!')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Users className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar usuários</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchUsers}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total de Usuários', value: stats.total, icon: Users, color: 'from-blue-500 to-cyan-500', trend: `+${stats.newThisMonth} este mês` },
          { label: 'Usuários Ativos', value: stats.active, icon: UserCheck, color: 'from-green-500 to-emerald-500', trend: stats.total > 0 ? `${Math.round(stats.active / stats.total * 100)}% do total` : '0%' },
          { label: 'Proprietários', value: stats.owners, icon: Briefcase, color: 'from-violet-500 to-purple-500', trend: 'Donos de negócio' },
          { label: 'Novos Este Mês', value: stats.newThisMonth, icon: TrendingUp, color: 'from-amber-500 to-orange-500', trend: 'Crescimento' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Funções</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
                <SelectItem value="owner">Proprietário</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="professional">Profissional</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuários do Sistema
            <Badge variant="secondary" className="ml-2">
              {filteredUsers.length} encontrados
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="group hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className={cn("w-10 h-10", getAvatarColor(user.role))}>
                              <AvatarFallback className="bg-transparent text-white font-medium">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.accountName ? (
                            <div>
                              <p className="font-medium">{user.accountName}</p>
                              {user.planName && (
                                <p className="text-xs text-muted-foreground">{user.planName}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          {user.lastLogin ? (
                            <div className="text-sm">
                              <p>{new Date(user.lastLogin).toLocaleDateString('pt-BR')}</p>
                              <p className="text-muted-foreground text-xs">
                                {user.loginCount} logins
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Nunca</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(user)
                                setShowUserDialog(true)
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangePassword(user)}>
                                <Key className="w-4 h-4 mr-2" />
                                Alterar Senha
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status === 'active' && user.role !== 'superadmin' && (
                                <DropdownMenuItem 
                                  className="text-amber-600"
                                  onClick={() => handleSuspendUser(user)}
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  Suspender
                                </DropdownMenuItem>
                              )}
                              {user.status === 'inactive' && (
                                <DropdownMenuItem 
                                  className="text-green-600"
                                  onClick={() => handleReactivateUser(user)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Reativar
                                </DropdownMenuItem>
                              )}
                              {user.role !== 'superadmin' && (
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setShowDeleteDialog(true)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Detalhes do Usuário
            </DialogTitle>
            <DialogDescription>
              Informações completas do usuário
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* User Header */}
              <div className="flex items-center gap-4">
                <Avatar className={cn("w-16 h-16", getAvatarColor(selectedUser.role))}>
                  <AvatarFallback className="bg-transparent text-white text-xl font-bold">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(selectedUser.role)}
                    {getStatusBadge(selectedUser.status)}
                  </div>
                </div>
              </div>
              
              {/* User Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {selectedUser.phone || 'Não informado'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Último Login</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {selectedUser.lastLogin 
                      ? new Date(selectedUser.lastLogin).toLocaleString('pt-BR')
                      : 'Nunca'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total de Logins</p>
                  <p className="font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    {selectedUser.loginCount}
                  </p>
                </div>
              </div>
              
              {/* Account Info */}
              {selectedUser.accountName && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Empresa</p>
                  <p className="font-semibold">{selectedUser.accountName}</p>
                  {selectedUser.planName && (
                    <Badge variant="outline" className="mt-2">
                      Plano: {selectedUser.planName}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowUserDialog(false)
                    handleEditUser(selectedUser)
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowUserDialog(false)
                    handleChangePassword(selectedUser)
                  }}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Alterar Senha
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Altere as informações do usuário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Proprietário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Alterar Senha
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePassword} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.name}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
