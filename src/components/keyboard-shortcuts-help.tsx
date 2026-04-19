'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  Keyboard,
  X,
  Command,
  Calendar,
  Users,
  Scissors,
  BarChart3,
  Settings,
  Search,
  Moon,
  LogOut
} from 'lucide-react'
import { motion } from 'framer-motion'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  {
    category: 'Navegação',
    items: [
      { keys: ['⌘', 'K'], description: 'Abrir busca rápida', icon: Search },
      { keys: ['⌘', 'D'], description: 'Ir para Dashboard', icon: BarChart3 },
      { keys: ['⌘', 'A'], description: 'Ir para Agendamentos', icon: Calendar },
      { keys: ['⌘', 'C'], description: 'Ir para Clientes', icon: Users },
      { keys: ['⌘', 'S'], description: 'Ir para Serviços', icon: Scissors },
      { keys: ['⌘', 'G'], description: 'Ir para Configurações', icon: Settings },
    ]
  },
  {
    category: 'Ações',
    items: [
      { keys: ['⌘', 'N'], description: 'Novo agendamento', icon: Calendar },
      { keys: ['⌘', 'T'], description: 'Alternar tema', icon: Moon },
      { keys: ['Esc'], description: 'Fechar diálogo', icon: X },
    ]
  }
]

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-green-600" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Use estes atalhos para navegar rapidamente pelo AgendaZap
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
          {shortcuts.map((category, index) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, j) => (
                        <span key={j}>
                          <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                            {key}
                          </kbd>
                          {j < item.keys.length - 1 && (
                            <span className="mx-0.5 text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground text-center">
          Pressione <kbd className="px-1.5 py-0.5 bg-background rounded border font-mono">?</kbd> para abrir esta ajuda a qualquer momento
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook for keyboard shortcuts
export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show help with ?
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setShowHelp(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { showHelp, setShowHelp }
}
