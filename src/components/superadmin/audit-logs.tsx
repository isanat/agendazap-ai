'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Search, RefreshCw, Download, User, Building2, 
  Trash2, Edit, Plus, ArrowUpRight, ArrowDownRight,
  CheckCircle, XCircle, AlertTriangle, Info, Clock, Eye,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { authGet } from '@/lib/auth-fetch'

// Types
interface AuditLog {
  id: string
  timestamp: string
  action: string
  severity: 'info' | 'warning' | 'error' | 'success'
  userId?: string
  userName?: string
  userEmail?: string
  accountId?: string
  accountName?: string
  resource: string
  resourceId?: string
  details: string
  ipAddress: string
  userAgent: string
  metadata?: Record<string, unknown>
}

interface AuditLogStats {
  total: number
  errors: number
  warnings: number
  today: number
}

const actionConfigs: Record<string, { icon: typeof Shield; color: string; bg: string; label: string }> = {
  create: { icon: Plus, color: 'text-green-600', bg: 'bg-green-500/10', label: 'Criação' },
  update: { icon: Edit, color: 'text-blue-600', bg: 'bg-blue-500/10', label: 'Atualização' },
  delete: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-500/10', label: 'Exclusão' },
  login: { icon: User, color: 'text-purple-600', bg: 'bg-purple-500/10', label: 'Login' },
  logout: { icon: User, color: 'text-gray-600', bg: 'bg-gray-500/10', label: 'Logout' },
  payment: { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Pagamento' },
  subscription: { icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-500/10', label: 'Assinatura' },
  settings: { icon: Edit, color: 'text-cyan-600', bg: 'bg-cyan-500/10', label: 'Configuração' }
}

const severityConfigs: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Aviso' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Erro' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Sucesso' }
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditLogStats>({ total: 0, errors: 0, warnings: 0, today: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [page, setPage] = useState(1)
  const logsPerPage = 10

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (actionFilter !== 'all') params.append('action', actionFilter)
      if (severityFilter !== 'all') params.append('severity', severityFilter)
      params.append('page', page.toString())
      params.append('limit', logsPerPage.toString())

      const response = await authGet(`/api/admin/audit-logs?${params.toString()}`)
      
      if (!response.ok) throw new Error('Failed to fetch audit logs')
      
      const data = await response.json()
      setLogs(data.logs || [])
      setStats(data.stats || { total: 0, errors: 0, warnings: 0, today: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching audit logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [actionFilter, severityFilter, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Filter logs (client-side for now)
  const filteredLogs = logs.filter(log => {
    const matchesSearch = search === '' ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.userName?.toLowerCase().includes(search.toLowerCase()) ||
      log.accountName?.toLowerCase().includes(search.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(search.toLowerCase())

    return matchesSearch
  })

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)

  const handleRefresh = async () => {
    await fetchLogs()
    toast.success('Logs atualizados')
  }

  const handleExport = () => {
    const csv = [
      ['Data/Hora', 'Ação', 'Severidade', 'Usuário', 'Email', 'Conta', 'Detalhes', 'IP'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.action,
        log.severity,
        log.userName || '',
        log.userEmail || '',
        log.accountName || '',
        `"${log.details}"`,
        log.ipAddress
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Logs exportados com sucesso!')
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
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
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
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar logs</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchLogs}>Tentar novamente</Button>
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
            <Shield className="w-8 h-8 text-purple-500" />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground mt-1">
            Histórico completo de ações do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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
                  <p className="text-xs text-muted-foreground">Total de Logs</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Shield className="w-5 h-5 text-blue-600" />
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
                  <p className="text-xs text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-600" />
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
                  <p className="text-xs text-muted-foreground">Avisos</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.warnings}</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
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
                  <p className="text-xs text-muted-foreground">Hoje</p>
                  <p className="text-2xl font-bold text-green-600">{stats.today}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário, email, conta ou detalhes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="create">Criação</SelectItem>
                <SelectItem value="update">Atualização</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="payment">Pagamento</SelectItem>
                <SelectItem value="subscription">Assinatura</SelectItem>
                <SelectItem value="settings">Configuração</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logs do Sistema</CardTitle>
          <CardDescription>
            {filteredLogs.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum log encontrado</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                <AnimatePresence mode="popLayout">
                  {filteredLogs.map((log, index) => {
                    const actionConfig = actionConfigs[log.action] || actionConfigs.settings
                    const severityConfig = severityConfigs[log.severity] || severityConfigs.info
                    const ActionIcon = actionConfig.icon
                    const SeverityIcon = severityConfig.icon

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        {/* Icon */}
                        <div className={cn('p-2 rounded-lg flex-shrink-0', actionConfig.bg)}>
                          <ActionIcon className={cn('w-5 h-5', actionConfig.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{log.details}</span>
                            <Badge
                              variant="secondary"
                              className={cn('text-xs', severityConfig.bg, severityConfig.color)}
                            >
                              <SeverityIcon className="w-3 h-3 mr-1" />
                              {severityConfig.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {log.userName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {log.userName}
                              </span>
                            )}
                            {log.accountName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {log.accountName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Action Badge */}
                        <Badge variant="outline" className="hidden sm:flex">
                          {actionConfig.label}
                        </Badge>

                        {/* View Button */}
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && (
                <>
                  {(() => {
                    const config = actionConfigs[selectedLog.action] || actionConfigs.settings
                    const Icon = config.icon
                    return (
                      <div className={cn('p-2 rounded-lg', config.bg)}>
                        <Icon className={cn('w-5 h-5', config.color)} />
                      </div>
                    )
                  })()}
                  Detalhes do Log
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">{formatDate(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ação</p>
                  <p className="font-medium capitalize">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Severidade</p>
                  <Badge className={cn(
                    severityConfigs[selectedLog.severity]?.bg || 'bg-gray-500/10',
                    severityConfigs[selectedLog.severity]?.color || 'text-gray-600'
                  )}>
                    {severityConfigs[selectedLog.severity]?.label || selectedLog.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recurso</p>
                  <p className="font-medium capitalize">{selectedLog.resource}</p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Detalhes</p>
                <p className="font-medium">{selectedLog.details}</p>
              </div>

              {selectedLog.userName && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Usuário</p>
                    <p className="font-medium">{selectedLog.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-sm">{selectedLog.userEmail}</p>
                  </div>
                </div>
              )}

              {selectedLog.accountName && (
                <div>
                  <p className="text-sm text-muted-foreground">Conta</p>
                  <p className="font-medium">{selectedLog.accountName}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Endereço IP</p>
                  <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User Agent</p>
                  <p className="font-mono text-xs truncate">{selectedLog.userAgent}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
