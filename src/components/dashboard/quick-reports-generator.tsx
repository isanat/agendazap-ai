'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileImage,
  File,
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  Settings,
  Printer,
  Share2,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ReportTemplate {
  id: string
  name: string
  description: string
  icon: typeof FileText
  lastGenerated?: string
  category: 'financial' | 'operational' | 'clients' | 'team'
  formats: string[]
  estimatedTime: string
}

interface GeneratedReport {
  id: string
  name: string
  format: string
  size: string
  generatedAt: string
  status: 'ready' | 'generating' | 'failed'
}

interface QuickReportsGeneratorProps {
  accountId?: string | null
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'daily-summary',
    name: 'Resumo Diário',
    description: 'Agendamentos, receita e ocupação do dia',
    icon: Calendar,
    category: 'operational',
    formats: ['PDF', 'Excel'],
    estimatedTime: '5s',
    lastGenerated: '10 min atrás'
  },
  {
    id: 'weekly-report',
    name: 'Relatório Semanal',
    description: 'Performance completa da semana',
    icon: BarChart3,
    category: 'operational',
    formats: ['PDF', 'Excel', 'Image'],
    estimatedTime: '15s',
    lastGenerated: '2h atrás'
  },
  {
    id: 'revenue-report',
    name: 'Relatório de Receita',
    description: 'Análise detalhada de faturamento',
    icon: DollarSign,
    category: 'financial',
    formats: ['PDF', 'Excel'],
    estimatedTime: '10s'
  },
  {
    id: 'clients-report',
    name: 'Relatório de Clientes',
    description: 'Novos clientes, retenção e segmentação',
    icon: Users,
    category: 'clients',
    formats: ['PDF', 'Excel'],
    estimatedTime: '8s',
    lastGenerated: '1 dia atrás'
  },
  {
    id: 'team-performance',
    name: 'Performance da Equipe',
    description: 'Métricas individuais e comparativas',
    icon: TrendingUp,
    category: 'team',
    formats: ['PDF', 'Excel', 'Image'],
    estimatedTime: '12s'
  },
  {
    id: 'services-distribution',
    name: 'Distribuição de Serviços',
    description: 'Serviços mais procurados e tendências',
    icon: PieChart,
    category: 'operational',
    formats: ['PDF', 'Image'],
    estimatedTime: '7s'
  }
]

const recentReports: GeneratedReport[] = [
  { id: '1', name: 'Resumo Diário', format: 'PDF', size: '245 KB', generatedAt: '10 min atrás', status: 'ready' },
  { id: '2', name: 'Relatório Semanal', format: 'Excel', size: '1.2 MB', generatedAt: '2h atrás', status: 'ready' },
  { id: '3', name: 'Performance da Equipe', format: 'PDF', size: '567 KB', generatedAt: '1 dia atrás', status: 'ready' }
]

const categoryColors = {
  financial: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30', gradient: 'from-green-500 to-emerald-500' },
  operational: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30', gradient: 'from-blue-500 to-cyan-500' },
  clients: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30', gradient: 'from-purple-500 to-violet-500' },
  team: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30', gradient: 'from-amber-500 to-orange-500' }
}

const formatIcons = {
  PDF: FileText,
  Excel: FileSpreadsheet,
  Image: FileImage
}

export function QuickReportsGenerator({ accountId }: QuickReportsGeneratorProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string>('PDF')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setGenerating(false)
    setGenerated(true)
    setTimeout(() => setGenerated(false), 3000)
  }

  const filteredReports = filterCategory
    ? reportTemplates.filter(r => r.category === filterCategory)
    : reportTemplates

  const selectedReportData = reportTemplates.find(r => r.id === selectedReport)

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600">
              <FileText className="w-4 h-4 text-white" />
            </div>
            Gerador de Relatórios
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {reportTemplates.length} modelos
          </Badge>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <Button
            variant={filterCategory === null ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={() => setFilterCategory(null)}
          >
            Todos
          </Button>
          {Object.entries(categoryColors).map(([cat, colors]) => (
            <Button
              key={cat}
              variant={filterCategory === cat ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs shrink-0 capitalize"
              onClick={() => setFilterCategory(cat)}
            >
              {cat === 'financial' ? 'Financeiro' :
               cat === 'operational' ? 'Operacional' :
               cat === 'clients' ? 'Clientes' : 'Equipe'}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div className="space-y-3">
          {/* Report Templates */}
          <div className="space-y-2">
            {filteredReports.map((report, index) => {
              const Icon = report.icon
              const colors = categoryColors[report.category]
              const isSelected = selectedReport === report.id

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'p-3 rounded-lg border transition-all cursor-pointer',
                    isSelected ? `${colors.border} ring-2 ring-primary/20` : 'hover:shadow-sm'
                  )}
                  onClick={() => setSelectedReport(isSelected ? null : report.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', colors.bg)}>
                      <Icon className={cn('w-4 h-4', colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{report.name}</p>
                        {report.lastGenerated && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px] bg-muted/50">
                            {report.lastGenerated}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {report.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {report.formats.map((f) => {
                        const FormatIcon = formatIcons[f as keyof typeof formatIcons]
                        return (
                          <div
                            key={f}
                            className="p-1 rounded bg-muted/50"
                            title={f}
                          >
                            <FormatIcon className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )
                      })}
                    </div>
                    <ChevronRight className={cn(
                      'w-4 h-4 text-muted-foreground shrink-0 transition-transform',
                      isSelected && 'rotate-90'
                    )} />
                  </div>

                  {/* Expanded Format Selection */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t border-border/50"
                      >
                        <p className="text-xs text-muted-foreground mb-2">Formato de saída:</p>
                        <div className="flex gap-2 mb-3">
                          {report.formats.map((format) => (
                            <Button
                              key={format}
                              variant={selectedFormat === format ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedFormat(format)
                              }}
                            >
                              {format}
                            </Button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Tempo estimado: {report.estimatedTime}</span>
                          </div>
                        </div>

                        <Button
                          className="w-full h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleGenerate()
                          }}
                          disabled={generating}
                        >
                          {generating ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                              Gerando...
                            </>
                          ) : generated ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 mr-2" />
                              Gerado com sucesso!
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 mr-2" />
                              Gerar Relatório
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>

          {/* Recent Reports */}
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Gerados Recentemente
            </p>
            <div className="space-y-2">
              {recentReports.map((report, index) => {
                const FormatIcon = formatIcons[report.format as keyof typeof formatIcons]

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-1.5 rounded bg-muted">
                      <FormatIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{report.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {report.format} • {report.size} • {report.generatedAt}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickReportsMini({ accountId }: { accountId?: string | null }) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">Relatórios</span>
        <Badge variant="outline" className="text-[10px]">{reportTemplates.length} modelos</Badge>
      </div>
      <div className="flex gap-2">
        {['PDF', 'Excel', 'Image'].map((format) => {
          const FormatIcon = formatIcons[format as keyof typeof formatIcons]
          return (
            <Button key={format} variant="outline" size="sm" className="h-7 text-xs flex-1">
              <FormatIcon className="w-3 h-3 mr-1" />
              {format}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
