'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, DollarSign, QrCode, CheckCircle, Clock, Send, Download, TrendingUp, ArrowUpRight, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { getStoredAccountId } from '@/hooks/use-data'

interface NoShowFee {
  id: string
  clientName: string
  clientPhone: string
  serviceName: string
  datetime: string
  amount: number
  status: 'pending' | 'paid' | 'expired'
  paidAt?: string
}

export function NoshowPage() {
  const [fees, setFees] = useState<NoShowFee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = getStoredAccountId()
    setAccountId(id)
  }, [])

  const fetchFees = useCallback(async () => {
    if (!accountId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await authFetch(`/api/noshow-fees?accountId=${accountId}`)
      if (!response.ok) throw new Error('Failed to fetch no-show fees')
      
      const data = await response.json()
      setFees(data.fees || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching no-show fees:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchFees()
  }, [fetchFees])

  const pendingFees = fees.filter(f => f.status === 'pending')
  const paidFees = fees.filter(f => f.status === 'paid')
  const expiredFees = fees.filter(f => f.status === 'expired')

  const totalRecovered = paidFees.reduce((acc, f) => acc + f.amount, 0)
  const totalPending = pendingFees.reduce((acc, f) => acc + f.amount, 0)
  const totalLost = expiredFees.reduce((acc, f) => acc + f.amount, 0)
  const recoveryRate = fees.length > 0 ? Math.round(paidFees.length / fees.length * 100) : 0

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>
      case 'paid':
        return <Badge variant="outline" className="text-green-600 border-green-600">Pago</Badge>
      case 'expired':
        return <Badge variant="outline" className="text-red-600 border-red-600">Expirado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
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

  const handleExport = () => {
    const headers = ['Cliente', 'Telefone', 'Serviço', 'Data/Hora', 'Valor', 'Status']
    const rows = fees.map(f => [
      f.clientName,
      f.clientPhone,
      f.serviceName,
      formatDate(f.datetime),
      f.amount.toString(),
      f.status
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `noshow-fees-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    toast.success('Relatório exportado com sucesso!')
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
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  // No account state
  if (!accountId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Conta não encontrada</h2>
        <p className="text-muted-foreground">Faça login para gerenciar taxas de no-show</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar taxas</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchFees}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de No-Show</h2>
          <p className="text-muted-foreground">Cobrança automática de taxas via PIX</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-yellow-500/20">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">R$ {totalPending.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-1">{pendingFees.length} cobrança(s) aguardando</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500/20">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                Recuperado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">R$ {totalRecovered.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-1">{paidFees.length} pagamento(s) confirmado</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                Perdido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">R$ {totalLost.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-1">{expiredFees.length} expirado(s)</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Taxa de Recuperação */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Taxa de Recuperação
              </CardTitle>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {recoveryRate}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={recoveryRate} className="h-4" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  <span className="font-medium text-green-600">{paidFees.length}</span> de {fees.length} taxas recuperadas
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-600">R$ {totalRecovered.toFixed(2)}</span> recuperados
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({pendingFees.length})</TabsTrigger>
          <TabsTrigger value="paid">Pagos ({paidFees.length})</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {pendingFees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <p className="text-muted-foreground">Nenhuma taxa pendente</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingFees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{fee.clientName}</p>
                            <p className="text-sm text-muted-foreground">{fee.clientPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{fee.serviceName}</TableCell>
                        <TableCell>{formatDate(fee.datetime)}</TableCell>
                        <TableCell className="font-medium">R$ {fee.amount.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(fee.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline">
                              <Send className="w-4 h-4 mr-1" />
                              Reenviar
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <QrCode className="w-4 h-4 mr-1" />
                              PIX
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <CardContent className="p-0">
              {paidFees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma taxa paga</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidFees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{fee.clientName}</p>
                            <p className="text-sm text-muted-foreground">{fee.clientPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{fee.serviceName}</TableCell>
                        <TableCell>{formatDate(fee.datetime)}</TableCell>
                        <TableCell className="font-medium text-green-600">R$ {fee.amount.toFixed(2)}</TableCell>
                        <TableCell>{fee.paidAt ? formatDate(fee.paidAt) : '-'}</TableCell>
                        <TableCell>{getStatusBadge(fee.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              {fees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma taxa registrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pago em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{fee.clientName}</p>
                            <p className="text-sm text-muted-foreground">{fee.clientPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{fee.serviceName}</TableCell>
                        <TableCell>{formatDate(fee.datetime)}</TableCell>
                        <TableCell className={cn(
                          'font-medium',
                          fee.status === 'paid' && 'text-green-600',
                          fee.status === 'expired' && 'text-red-600'
                        )}>R$ {fee.amount.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(fee.status)}</TableCell>
                        <TableCell>{fee.paidAt || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
