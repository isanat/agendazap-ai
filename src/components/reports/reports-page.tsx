'use client'

import { useState, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, Calendar, DollarSign, Users, AlertTriangle, FileText, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Loader2, CheckCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { RevenueChart, NoShowTrendChart, ServiceDistributionChart } from '@/components/dashboard/revenue-chart'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { authFetch } from '@/lib/auth-fetch'

const exportFormats = [
  { id: 'csv', name: 'CSV', icon: FileSpreadsheet, description: 'Planilha com dados brutos' },
  { id: 'txt', name: 'Texto', icon: FileText, description: 'Relatório em formato de texto' },
]

interface ReportKPIs {
  totalRevenue: number
  revenueGrowth: number
  totalAppointments: number
  appointmentGrowth: number
  noShowRate: number
  noShowRateChange: number
  lostRevenue: number
  noShowCount: number
  pixRecoveryAmount: number
  appointmentsByStatus: Record<string, number>
}

interface TopClient {
  id: string
  name: string
  revenue: number
  visits: number
}

interface TopService {
  id: string
  name: string
  count: number
  revenue: number
}

interface RevenueChartData {
  label: string
  revenue: number
  appointments: number
}

interface NoShowTrend {
  month: string
  rate: number
}

interface ServiceDistribution {
  id: string
  name: string
  value: number
}

interface ReportData {
  period: string
  periodStart: string
  kpis: ReportKPIs
  topClients: TopClient[]
  topServices: TopService[]
  revenueChartData: RevenueChartData[]
  noShowTrend: NoShowTrend[]
  serviceDistribution: ServiceDistribution[]
}

export function ReportsPage() {
  const [period, setPeriod] = useState('month')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = typeof window !== 'undefined'
      ? localStorage.getItem('agendazap-account-id')
      : null
    setAccountId(id)
  }, [])

  const loadReportData = async () => {
    try {
      setError(null)

      if (!accountId) {
        setError('Conta não encontrada. Faça login novamente.')
        setIsLoading(false)
        return
      }

      const response = await authFetch(`/api/reports?accountId=${accountId}&period=${period}`)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Erro ao carregar relatórios')
      }

      const data = await response.json()
      setReportData(data)
    } catch (err) {
      console.error('Error loading reports:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (accountId) loadReportData()
  }, [period, accountId])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadReportData()
    toast.success('Relatórios atualizados!')
  }

  const handleExport = async () => {
    if (!exportFormat || !reportData) return

    setIsExporting(true)

    try {
      if (exportFormat === 'csv') {
        // Generate improved CSV with flat tabular format for spreadsheet use
        const kpis = reportData.kpis

        // Format currency for pt-BR (comma as decimal separator)
        const fmtCurrency = (v: number) => v.toFixed(2).replace('.', ',')
        const fmtPercent = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`.replace('.', ',')

        // Get period date range from API data
        const periodStart = reportData.periodStart ? new Date(reportData.periodStart).toLocaleDateString('pt-BR') : ''
        const periodEnd = reportData.periodEnd ? new Date(reportData.periodEnd).toLocaleDateString('pt-BR') : ''

        // Section 1: Summary KPIs
        const summaryRows = [
          ['Relatório AgendZap'],
          ['Período', periodStart && periodEnd ? `${periodStart} a ${periodEnd}` : period],
          ['Gerado em', new Date().toLocaleDateString('pt-BR')],
          [''],
          ['RESUMO DE INDICADORES'],
          ['Indicador', 'Valor'],
          ['Faturamento Total', `R$ ${fmtCurrency(kpis.totalRevenue)}`],
          ['Crescimento Receita', fmtPercent(kpis.revenueGrowth ?? 0)],
          ['Total Agendamentos', String(kpis.totalAppointments)],
          ['Crescimento Agendamentos', fmtPercent(kpis.appointmentGrowth ?? 0)],
          ['Taxa No-Show', `${String(kpis.noShowRate).replace('.', ',')}%`],
          ['Receita Perdida', `R$ ${fmtCurrency(kpis.lostRevenue)}`],
          ['Recuperação PIX', `R$ ${fmtCurrency(kpis.pixRecoveryAmount)}`],
          [''],
        ]

        // Section 2: Appointments by Status
        const statusRows = [
          ['AGENDAMENTOS POR STATUS'],
          ['Status', 'Quantidade', 'Percentual'],
          ...Object.entries(kpis.appointmentsByStatus).map(([status, count]) => {
            const total = kpis.totalAppointments || 1
            const pct = ((count as number) / total * 100).toFixed(1).replace('.', ',')
            const statusLabel: Record<string, string> = {
              pending: 'Pendente', confirmed: 'Confirmado', completed: 'Concluído',
              cancelled: 'Cancelado', no_show: 'Não Compareceu'
            }
            return [statusLabel[status] || status, String(count), `${pct}%`]
          }),
          [''],
        ]

        // Section 3: Revenue Chart Data
        const revenueRows = reportData.revenueChartData?.length ? [
          ['RECEITA DIÁRIA'],
          ['Data', 'Faturamento (R$)', 'Agendamentos'],
          ...reportData.revenueChartData.map((d: { date: string; revenue: number; appointments: number }) => [
            new Date(d.date).toLocaleDateString('pt-BR'),
            fmtCurrency(d.revenue),
            String(d.appointments || 0),
          ]),
          [''],
        ] : []

        // Section 4: Top Clients
        const clientRows = [
          ['TOP CLIENTES'],
          ['Nome', 'Visitas', 'Faturamento (R$)'],
          ...reportData.topClients.map(c => [c.name, String(c.visits), fmtCurrency(c.revenue)]),
          [''],
        ]

        // Section 5: Top Services
        const serviceRows = [
          ['TOP SERVIÇOS'],
          ['Serviço', 'Agendamentos', 'Faturamento (R$)'],
          ...reportData.topServices.map(s => [s.name, String(s.count), fmtCurrency(s.revenue)]),
          [''],
        ]

        // Section 6: No-Show Trend
        const noShowRows = reportData.noShowTrend?.length ? [
          ['TENDÊNCIA NO-SHOW (6 MESES)'],
          ['Mês', 'Taxa No-Show (%)', 'Total Agendamentos'],
          ...reportData.noShowTrend.map((m: { month: string; rate: number; total: number }) => [
            m.month,
            m.rate.toFixed(1).replace('.', ','),
            String(m.total),
          ]),
          [''],
        ] : []

        // Section 7: Service Distribution
        const distRows = reportData.serviceDistribution?.length ? [
          ['DISTRIBUIÇÃO POR SERVIÇO'],
          ['Serviço', 'Quantidade', 'Percentual'],
          ...reportData.serviceDistribution.map((s: { name: string; count: number; percentage: number }) => [
            s.name, String(s.count), `${s.percentage.toFixed(1).replace('.', ',')}%`
          ]),
          [''],
        ] : []

        // Section 8: Detailed Appointments List
        let appointmentRows: string[][] = []
        try {
          if (accountId) {
            const aptRes = await authFetch(`/api/appointments?accountId=${accountId}&limit=500&period=${period}`)
            if (aptRes.ok) {
              const aptData = await aptRes.json()
              const apts = aptData.appointments || aptData || []
              if (apts.length > 0) {
                const statusLabel: Record<string, string> = {
                  pending: 'Pendente', confirmed: 'Confirmado', completed: 'Concluído',
                  cancelled: 'Cancelado', no_show: 'Não Compareceu'
                }
                appointmentRows = [
                  ['DETALHAMENTO DE AGENDAMENTOS'],
                  ['Data', 'Horário', 'Cliente', 'Serviço', 'Profissional', 'Status', 'Valor (R$)'],
                  ...apts.map((a: any) => [
                    a.date ? new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR') : '',
                    a.time || '',
                    a.clientName || a.Client?.name || '',
                    a.serviceName || a.Service?.name || '',
                    a.professionalName || a.Professional?.name || '',
                    statusLabel[a.status] || a.status || '',
                    a.price ? fmtCurrency(a.price) : '',
                  ]),
                  [''],
                ]
              }
            }
          }
        } catch {
          // If appointment details fail, skip section
        }

        const allRows = [
          ...summaryRows,
          ...statusRows,
          ...revenueRows,
          ...clientRows,
          ...serviceRows,
          ...noShowRows,
          ...distRows,
          ...appointmentRows,
        ]

        const csvContent = allRows.map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
        ).join('\r\n')

        // Download CSV with BOM for UTF-8 Excel compatibility
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `relatorio-agendazap-${period}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success('Relatório CSV exportado com sucesso!', {
          description: 'Formato melhorado com separador ; e encoding pt-BR',
          icon: <CheckCircle className="w-4 h-4 text-green-500" />
        })
      } else if (exportFormat === 'txt') {
        // Generate a simple text-based report and download
        const kpis = reportData.kpis
        const content = `
RELATÓRIO AGENDAZAP
Período: ${period}
Data: ${new Date().toLocaleDateString('pt-BR')}

=== INDICADORES ===
Faturamento Total: R$ ${kpis.totalRevenue.toFixed(2)}
Crescimento: ${kpis.revenueGrowth > 0 ? '+' : ''}${kpis.revenueGrowth}%
Total Agendamentos: ${kpis.totalAppointments}
Crescimento: ${kpis.appointmentGrowth > 0 ? '+' : ''}${kpis.appointmentGrowth}%
Taxa No-Show: ${kpis.noShowRate}%
Receita Perdida: R$ ${kpis.lostRevenue.toFixed(2)}
Recuperação PIX: R$ ${kpis.pixRecoveryAmount.toFixed(2)}

=== TOP CLIENTES ===
${reportData.topClients.map((c, i) => `${i + 1}. ${c.name} - ${c.visits} visitas - R$ ${c.revenue.toFixed(2)}`).join('\n')}

=== TOP SERVIÇOS ===
${reportData.topServices.map((s, i) => `${i + 1}. ${s.name} - ${s.count}x - R$ ${s.revenue.toFixed(2)}`).join('\n')}
`.trim()

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `relatorio-agendazap-${period}-${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success('Relatório exportado com sucesso!', {
          description: 'O arquivo de texto foi baixado.',
          icon: <CheckCircle className="w-4 h-4 text-green-500" />
        })
      }
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Erro ao exportar relatório')
    } finally {
      setIsExporting(false)
      setShowExportDialog(false)
    }
  }

  const kpis = reportData?.kpis
  const topClients = reportData?.topClients || []
  const topServices = reportData?.topServices || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Carregando relatórios...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !reportData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <p className="text-lg font-medium">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatórios</h2>
          <p className="text-muted-foreground">Análise completa do seu negócio</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </Button>
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Exportar Relatório
            </DialogTitle>
            <DialogDescription>
              Escolha o formato de exportação para o seu relatório.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-3">
              {exportFormats.map((format) => (
                <motion.button
                  key={format.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setExportFormat(format.id)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                    exportFormat === format.id
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-muted hover:border-muted-foreground/30'
                  )}
                >
                  <div className={cn(
                    'p-3 rounded-lg',
                    exportFormat === format.id ? 'bg-green-500 text-white' : 'bg-muted'
                  )}>
                    <format.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{format.name}</p>
                    <p className="text-sm text-muted-foreground">{format.description}</p>
                  </div>
                  {exportFormat === format.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <CheckCircle className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowExportDialog(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                disabled={!exportFormat || isExporting}
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
                    Exportar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Total</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">R$ {(kpis?.totalRevenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              {(kpis?.revenueGrowth ?? 0) !== 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        'flex items-center gap-1 text-sm cursor-help',
                        (kpis?.revenueGrowth ?? 0) > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {(kpis?.revenueGrowth ?? 0) > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span className="font-medium">{(kpis?.revenueGrowth ?? 0) > 0 ? '+' : ''}{kpis?.revenueGrowth}%</span>
                        <span className="text-muted-foreground">vs período anterior</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Comparado com o período anterior</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Agendamentos</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">{kpis?.totalAppointments ?? 0}</div>
              {(kpis?.appointmentGrowth ?? 0) !== 0 && (
                <div className={cn(
                  'flex items-center gap-1 text-sm',
                  (kpis?.appointmentGrowth ?? 0) > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {(kpis?.appointmentGrowth ?? 0) > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span className="font-medium">{(kpis?.appointmentGrowth ?? 0) > 0 ? '+' : ''}{kpis?.appointmentGrowth}%</span>
                  <span className="text-muted-foreground">vs período anterior</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de No-Show</CardTitle>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">{kpis?.noShowRate ?? 0}%</div>
              {(kpis?.noShowRateChange ?? 0) !== 0 && (
                <div className={cn(
                  'flex items-center gap-1 text-sm',
                  (kpis?.noShowRateChange ?? 0) < 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {(kpis?.noShowRateChange ?? 0) < 0 ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span className="font-medium">{(kpis?.noShowRateChange ?? 0) > 0 ? '+' : ''}{kpis?.noShowRateChange}%</span>
                  <span className="text-muted-foreground">vs período anterior</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-rose-500/5" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Perdido</CardTitle>
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-red-600">R$ {(kpis?.lostRevenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {kpis?.noShowCount ?? 0} no-shows no período
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart accountId={accountId} />
        <NoShowTrendChart accountId={accountId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ServiceDistributionChart accountId={accountId} />
        
        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto opacity-50 mb-2" />
                <p className="text-sm">Sem dados de clientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topClients.map((client, index) => (
                  <div key={client.id || index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.visits} visitas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {client.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Serviços Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto opacity-50 mb-2" />
                <p className="text-sm">Sem dados de serviços</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topServices.map((service, index) => (
                  <div key={service.id || index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.count} vezes</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {service.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lost Revenue Report */}
      <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Relatório de Lucro Perdido por No-Show
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold text-red-600">R$ {(kpis?.lostRevenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-sm text-muted-foreground">Perda total no período</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold text-orange-600">{kpis?.noShowCount ?? 0}</p>
              <p className="text-sm text-muted-foreground">No-shows registrados</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold text-green-600">R$ {(kpis?.pixRecoveryAmount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-sm text-muted-foreground">Recuperado via PIX</p>
            </div>
          </div>
          {(kpis?.lostRevenue ?? 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <strong>Dica:</strong> Ative a cobrança antecipada para clientes com alto risco de no-show
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
