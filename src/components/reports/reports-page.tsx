'use client'

import { useState } from 'react'
import { Download, TrendingUp, TrendingDown, Calendar, DollarSign, Users, AlertTriangle, FileText, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, FileSpreadsheet, FileImage, Loader2, CheckCircle } from 'lucide-react'
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

const exportFormats = [
  { id: 'pdf', name: 'PDF', icon: FileText, description: 'Relatório completo em PDF' },
  { id: 'xlsx', name: 'Excel', icon: FileSpreadsheet, description: 'Planilha com dados brutos' },
  { id: 'png', name: 'Imagem', icon: FileImage, description: 'Gráficos em alta resolução' },
]

export function ReportsPage() {
  const [period, setPeriod] = useState('week')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!exportFormat) return
    
    setIsExporting(true)
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsExporting(false)
    setShowExportDialog(false)
    toast.success(`Relatório exportado em formato ${exportFormat.toUpperCase()}!`, {
      description: 'O arquivo foi baixado com sucesso.',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />
    })
  }

  const weeklyData = [
    { label: 'Seg', value: 1200, appointments: 8 },
    { label: 'Ter', value: 980, appointments: 7 },
    { label: 'Qua', value: 1450, appointments: 10 },
    { label: 'Qui', value: 1100, appointments: 8 },
    { label: 'Sex', value: 1680, appointments: 12 },
    { label: 'Sáb', value: 2200, appointments: 15 },
  ]

  const topClients = [
    { name: 'Maria Silva', visits: 12, spent: 840 },
    { name: 'Ana Costa', visits: 10, spent: 720 },
    { name: 'Pedro Santos', visits: 8, spent: 560 },
    { name: 'Lucia Mendes', visits: 7, spent: 490 },
    { name: 'João Pedro', visits: 6, spent: 420 },
  ]

  const topServices = [
    { name: 'Corte', count: 45, revenue: 2025 },
    { name: 'Barba', count: 32, revenue: 1120 },
    { name: 'Corte + Barba', count: 28, revenue: 1960 },
    { name: 'Coloração', count: 15, revenue: 1800 },
    { name: 'Hidratação', count: 12, revenue: 960 },
  ]

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
              <div className="text-2xl font-bold">R$ 8.450</div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-sm text-green-600 cursor-help">
                      <ArrowUpRight className="w-4 h-4" />
                      <span className="font-medium">+12%</span>
                      <span className="text-muted-foreground">vs período anterior</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Comparado com R$ 7.544 no período anterior</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              <div className="text-2xl font-bold">127</div>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <ArrowUpRight className="w-4 h-4" />
                <span className="font-medium">+8%</span>
                <span className="text-muted-foreground">vs período anterior</span>
              </div>
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
              <div className="text-2xl font-bold">8.5%</div>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <ArrowDownRight className="w-4 h-4" />
                <span className="font-medium">-2%</span>
                <span className="text-muted-foreground">vs período anterior</span>
              </div>
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
              <div className="text-2xl font-bold text-red-600">R$ 420</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                11 no-shows no período
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <NoShowTrendChart />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ServiceDistributionChart />
        
        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div key={client.name} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.visits} visitas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">R$ {client.spent}</p>
                  </div>
                </div>
              ))}
            </div>
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
            <div className="space-y-3">
              {topServices.map((service, index) => (
                <div key={service.name} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.count} vezes</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">R$ {service.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
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
              <p className="text-3xl font-bold text-red-600">R$ 420</p>
              <p className="text-sm text-muted-foreground">Perda total no período</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold text-orange-600">11</p>
              <p className="text-sm text-muted-foreground">No-shows registrados</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold text-green-600">R$ 250</p>
              <p className="text-sm text-muted-foreground">Recuperado via PIX</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-900">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong>Dica:</strong> Ative a cobrança antecipada para clientes com alto risco de no-show
              </p>
              <Button variant="outline" size="sm">
                Ver Detalhes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
