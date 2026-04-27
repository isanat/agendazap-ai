'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, BellRing, Send, Check, X, Clock, Users,
  Megaphone, AlertTriangle, Info, CheckCircle, XCircle,
  Search, Plus, Trash2, Eye, Calendar, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { authFetch, authGet } from '@/lib/auth-fetch'

// Types
interface SystemNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  target: 'all' | 'admins' | 'owners' | 'specific'
  targetAccounts?: string[]
  status: 'draft' | 'scheduled' | 'sent'
  scheduledAt?: string
  sentAt?: string
  readCount: number
  totalRecipients: number
  createdAt: string
  createdBy: string
}

interface NotificationStats {
  total: number
  sent: number
  scheduled: number
  drafts: number
  totalReads: number
  totalRecipients: number
}

const typeConfigs: Record<string, { icon: typeof Bell; color: string; bg: string; borderColor: string }> = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  announcement: { icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-500/10', borderColor: 'border-purple-500/30' }
}

const priorityConfigs: Record<string, { color: string; bg: string; label: string }> = {
  low: { color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Baixa' },
  normal: { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Normal' },
  high: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Alta' },
  urgent: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Urgente' }
}

export function SystemNotifications() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    sent: 0,
    scheduled: 0,
    drafts: 0,
    totalReads: 0,
    totalRecipients: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [isSaving, setIsSaving] = useState(false)

  // New notification form
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info' as SystemNotification['type'],
    priority: 'normal' as SystemNotification['priority'],
    target: 'all' as SystemNotification['target'],
    schedule: false,
    scheduledDate: '',
    scheduledTime: ''
  })

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await authGet(`/api/admin/notifications?${params.toString()}`)
      
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const data = await response.json()
      setNotifications(data.notifications || [])
      setStats(data.stats || {
        total: 0,
        sent: 0,
        scheduled: 0,
        drafts: 0,
        totalReads: 0,
        totalRecipients: 0
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [typeFilter, statusFilter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = search === '' ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase())

    const matchesType = typeFilter === 'all' || n.type === typeFilter
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const handleSendNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsSaving(true)

    try {
      const response = await authFetch('/api/admin/notifications', {
        method: 'POST',
        body: {
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          priority: newNotification.priority,
          target: newNotification.target,
          scheduledAt: newNotification.schedule && newNotification.scheduledDate
            ? new Date(`${newNotification.scheduledDate}T${newNotification.scheduledTime || '09:00'}`).toISOString()
            : undefined
        }
      })

      if (!response.ok) throw new Error('Failed to create notification')

      toast.success(newNotification.schedule ? 'Notificação agendada com sucesso!' : 'Notificação enviada com sucesso!')
      setIsCreateOpen(false)
      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        priority: 'normal',
        target: 'all',
        schedule: false,
        scheduledDate: '',
        scheduledTime: ''
      })
      fetchNotifications()
    } catch (err) {
      toast.error('Erro ao criar notificação')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await authFetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete notification')

      toast.success('Notificação removida')
      fetchNotifications()
    } catch (err) {
      toast.error('Erro ao remover notificação')
      console.error(err)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Bell className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar notificações</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchNotifications}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BellRing className="w-8 h-8 text-purple-500" />
            Notificações do Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie notificações para todos os usuários
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Notificação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Enviadas</p>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Send className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Agendadas</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.scheduled}</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-600" />
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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Rascunhos</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.drafts}</p>
                </div>
                <div className="p-2 rounded-lg bg-gray-500/10">
                  <Bell className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Taxa de Leitura</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.totalRecipients > 0 
                      ? Math.round((stats.totalReads / stats.totalRecipients) * 100) 
                      : 0}%
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="sent">Enviadas</TabsTrigger>
          <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar notificações..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="announcement">Anúncio</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sent">Enviadas</SelectItem>
                    <SelectItem value="scheduled">Agendadas</SelectItem>
                    <SelectItem value="draft">Rascunhos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <Card>
            <CardContent className="p-0">
              {filteredNotifications.filter(n => activeTab === 'all' || n.status === activeTab).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    <AnimatePresence mode="popLayout">
                      {filteredNotifications
                        .filter(n => activeTab === 'all' || n.status === activeTab)
                        .map((notification, index) => {
                          const typeConfig = typeConfigs[notification.type] || typeConfigs.info
                          const priorityConfig = priorityConfigs[notification.priority] || priorityConfigs.normal
                          const TypeIcon = typeConfig.icon

                          return (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ delay: index * 0.03 }}
                              className="p-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex gap-4">
                                {/* Icon */}
                                <div className={cn('p-3 rounded-xl flex-shrink-0', typeConfig.bg)}>
                                  <TypeIcon className={cn('w-6 h-6', typeConfig.color)} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-semibold">{notification.title}</h3>
                                      <Badge className={cn(priorityConfig.bg, priorityConfig.color)}>
                                        {priorityConfig.label}
                                      </Badge>
                                      <Badge variant="outline">
                                        {notification.status === 'sent' && 'Enviada'}
                                        {notification.status === 'scheduled' && 'Agendada'}
                                        {notification.status === 'draft' && 'Rascunho'}
                                      </Badge>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setSelectedNotification(notification)}>
                                          <Eye className="w-4 h-4 mr-2" />
                                          Ver detalhes
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-red-600"
                                          onClick={() => handleDelete(notification.id)}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {notification.message}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {notification.target === 'all' ? 'Todos' : 
                                       notification.target === 'admins' ? 'Admins' : 'Proprietários'}
                                    </span>
                                    {notification.sentAt && (
                                      <span className="flex items-center gap-1">
                                        <Send className="w-3 h-3" />
                                        {formatDate(notification.sentAt)}
                                      </span>
                                    )}
                                    {notification.scheduledAt && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Agendado: {formatDate(notification.scheduledAt)}
                                      </span>
                                    )}
                                    {notification.status === 'sent' && (
                                      <span className="flex items-center gap-1">
                                        <Eye className="w-3 h-3" />
                                        {notification.readCount}/{notification.totalRecipients} lidas
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Notification Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Notificação</DialogTitle>
            <DialogDescription>
              Envie uma notificação para os usuários do sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={newNotification.title}
                onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da notificação"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                value={newNotification.message}
                onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Conteúdo da notificação..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newNotification.type}
                  onValueChange={(value) => setNewNotification(prev => ({ ...prev, type: value as SystemNotification['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informação</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="announcement">Anúncio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={newNotification.priority}
                  onValueChange={(value) => setNewNotification(prev => ({ ...prev, priority: value as SystemNotification['priority'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Público-alvo</Label>
              <Select
                value={newNotification.target}
                onValueChange={(value) => setNewNotification(prev => ({ ...prev, target: value as SystemNotification['target'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  <SelectItem value="admins">Apenas administradores</SelectItem>
                  <SelectItem value="owners">Apenas proprietários</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="schedule">Agendar envio</Label>
                <p className="text-sm text-muted-foreground">
                  Envie a notificação em uma data específica
                </p>
              </div>
              <Switch
                id="schedule"
                checked={newNotification.schedule}
                onCheckedChange={(checked) => setNewNotification(prev => ({ ...prev, schedule: checked }))}
              />
            </div>

            {newNotification.schedule && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newNotification.scheduledDate}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={newNotification.scheduledTime}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendNotification} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : newNotification.schedule ? (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title}</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p>{selectedNotification.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <Badge className={cn(typeConfigs[selectedNotification.type]?.bg || 'bg-gray-500/10', typeConfigs[selectedNotification.type]?.color || 'text-gray-600')}>
                    {selectedNotification.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Prioridade</p>
                  <Badge className={cn(priorityConfigs[selectedNotification.priority]?.bg || 'bg-gray-500/10', priorityConfigs[selectedNotification.priority]?.color || 'text-gray-600')}>
                    {priorityConfigs[selectedNotification.priority]?.label || selectedNotification.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Público</p>
                  <p className="font-medium capitalize">
                    {selectedNotification.target === 'all' ? 'Todos' : 
                     selectedNotification.target === 'admins' ? 'Admins' : 'Proprietários'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado por</p>
                  <p className="font-medium">{selectedNotification.createdBy}</p>
                </div>
              </div>

              {selectedNotification.status === 'sent' && (
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-600">Taxa de Leitura</span>
                    <span className="font-bold text-green-600">
                      {selectedNotification.totalRecipients > 0 
                        ? Math.round((selectedNotification.readCount / selectedNotification.totalRecipients) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-green-500/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${selectedNotification.totalRecipients > 0 ? (selectedNotification.readCount / selectedNotification.totalRecipients) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedNotification.readCount} de {selectedNotification.totalRecipients} leram
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
