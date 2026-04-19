'use client'

import { useState } from 'react'
import { Search, Plus, Menu, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { ThemeToggle } from '@/components/theme-toggle'
import { SearchCommand } from '@/components/search/search-command'
import { useAppStore } from '@/store/app-store'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  showAddButton?: boolean
  addButtonText?: string
}

export function AppHeader({ 
  title, 
  showSearch = true, 
  showAddButton = true,
  addButtonText = 'Novo'
}: HeaderProps) {
  const { account, user, toggleSidebar, triggerAdd, addCallback } = useAppStore()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Title */}
            {title && (
              <h1 className="text-xl font-semibold hidden sm:block">{title}</h1>
            )}

            {/* Search */}
            {showSearch && (
              <button 
                onClick={() => setSearchOpen(true)}
                className="relative hidden md:flex items-center gap-2 w-64 lg:w-80 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <Search className="w-4 h-4" />
                <span className="flex-1 text-left">Buscar agendamentos, clientes...</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-background rounded border font-mono">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Search */}
            {showSearch && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="w-5 h-5" />
              </Button>
            )}

            {/* Add button */}
            {showAddButton && addCallback && (
              <Button 
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                onClick={triggerAdd}
              >
                <Plus className="w-4 h-4 mr-2" />
                {addButtonText}
              </Button>
            )}

            {/* Notifications */}
            <NotificationCenter />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Account Status */}
            {account?.whatsappConnected ? (
              <Badge variant="outline" className="hidden sm:flex gap-1 text-green-600 border-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                WhatsApp Conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="hidden sm:flex gap-1 text-yellow-600 border-yellow-600">
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                WhatsApp Desconectado
              </Badge>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name || 'Usuário'}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Minha Conta</DropdownMenuItem>
                <DropdownMenuItem>
                  Plano: <Badge variant="secondary" className="ml-2">{account?.plan || 'Basic'}</Badge>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Search Command */}
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
