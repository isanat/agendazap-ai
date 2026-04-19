'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Search, 
  Calendar, 
  Users, 
  Scissors, 
  MessageSquare, 
  BarChart3, 
  CreditCard, 
  Settings,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  Clock,
  FileText
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Visão geral do negócio', shortcut: 'D' },
  { id: 'appointments', label: 'Agendamentos', icon: Calendar, description: 'Gerenciar agendamentos', shortcut: 'A' },
  { id: 'clients', label: 'Clientes', icon: Users, description: 'Base de clientes', shortcut: 'C' },
  { id: 'services', label: 'Serviços', icon: Scissors, description: 'Catálogo de serviços', shortcut: 'S' },
  { id: 'professionals', label: 'Profissionais', icon: Users, description: 'Equipe de trabalho', shortcut: 'P' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, description: 'Mensagens e conexão', shortcut: 'W' },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, description: 'Análise de dados', shortcut: 'R' },
  { id: 'noshow', label: 'No-Show', icon: CreditCard, description: 'Taxas pendentes', shortcut: 'N' },
  { id: 'settings', label: 'Configurações', icon: Settings, description: 'Preferências do sistema', shortcut: 'G' },
]

const quickActions = [
  { id: 'new-appointment', label: 'Novo Agendamento', icon: Calendar, description: 'Criar um novo agendamento', tab: 'appointments' },
  { id: 'new-client', label: 'Novo Cliente', icon: Users, description: 'Cadastrar um cliente', tab: 'clients' },
  { id: 'new-service', label: 'Novo Serviço', icon: Scissors, description: 'Adicionar um serviço', tab: 'services' },
  { id: 'send-message', label: 'Enviar Mensagem', icon: MessageSquare, description: 'WhatsApp em massa', tab: 'whatsapp' },
]

const recentSearches = [
  'Maria Silva',
  'Corte + Barba',
  'Ana Costa',
  'Relatório mensal'
]

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const filteredPages = pages.filter(page =>
    page.label.toLowerCase().includes(query.toLowerCase()) ||
    page.description.toLowerCase().includes(query.toLowerCase())
  )

  const filteredActions = quickActions.filter(action =>
    action.label.toLowerCase().includes(query.toLowerCase()) ||
    action.description.toLowerCase().includes(query.toLowerCase())
  )

  const allItems = [
    ...filteredPages.map(p => ({ ...p, type: 'page' as const })),
    ...filteredActions.map(a => ({ ...a, type: 'action' as const }))
  ]

  const handleSelect = useCallback((item: typeof allItems[0]) => {
    if (item.type === 'page') {
      router.push(`/?tab=${item.id}`)
    } else {
      router.push(`/?tab=${item.tab}`)
    }
    onOpenChange(false)
    setQuery('')
  }, [router, onOpenChange])

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    setSelectedIndex(0) // Reset selection when query changes
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
      
      if (open) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex(i => (i + 1) % allItems.length)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex(i => (i - 1 + allItems.length) % allItems.length)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          handleSelect(allItems[selectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, allItems, selectedIndex, handleSelect, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Busca rápida</DialogTitle>
          <DialogDescription className="sr-only">
            Busque páginas, ações e clientes
          </DialogDescription>
        </DialogHeader>
        
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar páginas, ações, clientes..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground"
            autoFocus
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-2 py-1 rounded bg-muted font-mono">⌘</kbd>
            <kbd className="px-2 py-1 rounded bg-muted font-mono">K</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query === '' ? (
            <div className="p-4 space-y-6">
              {/* Quick Actions */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Ações Rápidas
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelect({ ...action, type: 'action' })}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted text-left transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <action.icon className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{action.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Recent Searches */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Buscas Recentes
                </h3>
                <div className="space-y-1">
                  {recentSearches.map((search, i) => (
                    <button
                      key={i}
                      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted text-left text-sm"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2">
              {/* Pages */}
              {filteredPages.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Páginas
                  </h3>
                  {filteredPages.map((page, index) => (
                    <motion.button
                      key={page.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelect({ ...page, type: 'page' })}
                      className={cn(
                        'flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors',
                        selectedIndex === index ? 'bg-green-500/10' : 'hover:bg-muted'
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        selectedIndex === index ? 'bg-green-500/20' : 'bg-muted'
                      )}>
                        <page.icon className={cn(
                          'w-4 h-4',
                          selectedIndex === index ? 'text-green-600' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{page.label}</p>
                        <p className="text-xs text-muted-foreground">{page.description}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {page.shortcut}
                      </Badge>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Actions */}
              {filteredActions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Ações
                  </h3>
                  {filteredActions.map((action, index) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (filteredPages.length + index) * 0.03 }}
                      onClick={() => handleSelect({ ...action, type: 'action' })}
                      className={cn(
                        'flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors',
                        selectedIndex === filteredPages.length + index ? 'bg-green-500/10' : 'hover:bg-muted'
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        selectedIndex === filteredPages.length + index ? 'bg-green-500/20' : 'bg-muted'
                      )}>
                        <action.icon className={cn(
                          'w-4 h-4',
                          selectedIndex === filteredPages.length + index ? 'text-green-600' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {allItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Tente buscar por páginas ou ações</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↵</kbd>
              selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted">esc</kbd>
              fechar
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
