'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <motion.div
            initial={false}
            animate={{ rotate: resolvedTheme === 'dark' ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </motion.div>
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className={theme === 'light' ? 'bg-accent' : ''}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
          {theme === 'light' && (
            <motion.div 
              className="ml-auto w-2 h-2 rounded-full bg-green-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className={theme === 'dark' ? 'bg-accent' : ''}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
          {theme === 'dark' && (
            <motion.div 
              className="ml-auto w-2 h-2 rounded-full bg-green-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className={theme === 'system' ? 'bg-accent' : ''}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
          {theme === 'system' && (
            <motion.div 
              className="ml-auto w-2 h-2 rounded-full bg-green-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
