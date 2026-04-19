'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  MessageSquare, Send, Phone, Clock, CheckCircle, AlertCircle, 
  QrCode, RefreshCw, Wifi, WifiOff, Smartphone, Copy, ExternalLink,
  Bot, Sparkles, Zap, Settings, ToggleLeft, ToggleRight, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { AIAssistant } from './ai-assistant'
import { QuickReplies } from './quick-replies'
import { getStoredAccountId } from '@/hooks/use-data'
import { authFetch } from '@/lib/auth-fetch'

interface Message {
  id: string
  phone: string
  clientName: string
  message: string
  direction: 'incoming' | 'outgoing'
  timestamp: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  intent?: string
  aiGenerated?: boolean
}

interface Conversation {
  phone: string
  name: string
  lastMessage: string
  time: string
  unread: number
}

export function WhatsappPage() {
  const [selectedPhone, setSelectedPhone] = useState<string>('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState('chat')
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [isLoadingQR, setIsLoadingQR] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>('unknown')
  const [qrExpiresIn, setQrExpiresIn] = useState<number>(0)
  const [qrFetchedAt, setQrFetchedAt] = useState<number>(0)

  const [accountId, setAccountId] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const qrTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const id = getStoredAccountId()
    setAccountId(id)
  }, [])

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!accountId) {
      setIsLoading(false)
      setIsInitialLoad(false)
      return
    }

    // Only show full loading on initial load
    if (isInitialLoad && !isRefresh) {
      setIsLoading(true)
    } else if (isRefresh) {
      setIsRefreshing(true)
    }

    try {
      const response = await authFetch(`/api/whatsapp/messages?accountId=${accountId}&limit=100`)
      
      if (!response.ok) throw new Error('Failed to fetch messages')
      
      const data = await response.json()
      
      // Transform messages and group into conversations
      const transformedMessages: Message[] = (data.messages || []).map((msg: any) => ({
        id: msg.id,
        phone: msg.phone || msg.clientPhone,
        clientName: msg.clientName || msg.phone?.replace(/\D/g, '').slice(-4) || 'Cliente',
        message: msg.message || msg.content,
        direction: msg.direction,
        timestamp: new Date(msg.timestamp || msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: msg.status || 'sent',
        intent: msg.intent,
        aiGenerated: msg.aiGenerated
      }))

      setMessages(transformedMessages)

      // Group into conversations
      const convMap = new Map<string, Conversation>()
      transformedMessages.forEach((msg) => {
        if (!convMap.has(msg.phone)) {
          convMap.set(msg.phone, {
            phone: msg.phone,
            name: msg.clientName,
            lastMessage: msg.message,
            time: msg.timestamp,
            unread: msg.direction === 'incoming' ? 1 : 0
          })
        }
      })

      setConversations(Array.from(convMap.values()))
      
      // Select first conversation if none selected
      if (!selectedPhone && convMap.size > 0) {
        setSelectedPhone(Array.from(convMap.keys())[0])
      }
      
      setIsInitialLoad(false)
    } catch (err) {
      console.error('Error fetching WhatsApp data:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [accountId, selectedPhone, isInitialLoad])

  useEffect(() => {
    fetchData()
    fetchConnectionStatus()
  }, [fetchData])

  // Polling for real-time updates (fallback for WebSocket in production)
  useEffect(() => {
    if (!accountId) return

    // Poll every 10 seconds for new messages - pass true to indicate refresh
    const pollInterval = setInterval(() => {
      fetchData(true)
      fetchConnectionStatus()
    }, 10000)

    pollingRef.current = pollInterval

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [accountId, fetchData])

  // QR Code countdown timer - no auto-refresh, let user click to refresh
  useEffect(() => {
    if (showQRDialog && !isConnected && qrExpiresIn > 0) {
      qrTimerRef.current = setInterval(() => {
        setQrExpiresIn((prev) => {
          if (prev <= 1) {
            // QR expired - show expired state
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (qrTimerRef.current) {
        clearInterval(qrTimerRef.current)
      }
    }
  }, [showQRDialog, isConnected, qrExpiresIn])

  // Stop timer when connected
  useEffect(() => {
    if (isConnected && showQRDialog) {
      if (qrTimerRef.current) {
        clearInterval(qrTimerRef.current)
      }
      setShowQRDialog(false)
      toast.success('WhatsApp conectado com sucesso!')
    }
  }, [isConnected, showQRDialog])

  const fetchConnectionStatus = useCallback(async () => {
    if (!accountId) return

    try {
      const response = await authFetch(`/api/whatsapp/evolution?action=status`)
      
      if (response.ok) {
        const data = await response.json()
        setConnectionStatus(data.status || 'unknown')
        setIsConnected(data.status === 'open' || data.status === 'connected')
      }
    } catch (err) {
      console.error('Error fetching connection status:', err)
    }
  }, [accountId])

  const fetchQRCode = async () => {
    setIsLoadingQR(true)
    
    try {
      // First try to get QR code from existing instance
      const qrResponse = await authFetch('/api/whatsapp/evolution?action=qrcode')
      
      if (qrResponse.ok) {
        const data = await qrResponse.json()
        if (data.qrCode) {
          setQrCode(data.qrCode)
          setPairingCode(data.pairingCode)
          setQrExpiresIn(60) // QR codes last about 60 seconds
          setQrFetchedAt(Date.now())
          setIsLoadingQR(false)
          return
        }
      }
      
      // If no QR code, create/connect instance
      const createResponse = await authFetch('/api/integrations/whatsapp/create-instance', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      if (createResponse.ok) {
        const data = await createResponse.json()
        if (data.qrCode) {
          setQrCode(data.qrCode)
        }
        if (data.pairingCode) {
          setPairingCode(data.pairingCode)
        }
        setQrExpiresIn(60) // QR codes last about 60 seconds
        setQrFetchedAt(Date.now())
      } else {
        const error = await createResponse.json()
        toast.error(error.error || 'Erro ao gerar QR Code')
      }
    } catch (err) {
      console.error('Error fetching QR code:', err)
      toast.error('Erro ao obter QR Code')
    } finally {
      setIsLoadingQR(false)
    }
  }

  const selectedMessages = messages.filter(m => m.phone === selectedPhone)
  const selectedConversation = conversations.find(c => c.phone === selectedPhone)

  const getIntentBadge = (intent?: string) => {
    switch (intent) {
      case 'schedule':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 text-[10px]">Agendar</Badge>
      case 'confirm':
        return <Badge variant="outline" className="text-green-600 border-green-600 text-[10px]">Confirmar</Badge>
      case 'cancel':
        return <Badge variant="outline" className="text-red-600 border-red-600 text-[10px]">Cancelar</Badge>
      case 'price':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-600 text-[10px]">Preço</Badge>
      case 'info':
        return <Badge variant="outline" className="text-purple-600 border-purple-600 text-[10px]">Info</Badge>
      default:
        return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-3 h-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-blue-500" />
      case 'read':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return null
    }
  }

  const handleConnect = async () => {
    setShowQRDialog(true)
    setQrCode(null)
    setPairingCode(null)
    setQrExpiresIn(0)
    setQrFetchedAt(0)
    await fetchQRCode()
  }

  const handleDisconnect = async () => {
    try {
      const response = await authFetch('/api/whatsapp/evolution?action=disconnect', {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        toast.success('WhatsApp desconectado')
      }
    } catch (err) {
      toast.error('Erro ao desconectar')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a área de transferência!')
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPhone || !accountId) return

    setIsSending(true)

    try {
      const response = await authFetch('/api/whatsapp/messages', {
        method: 'POST',
        body: {
          accountId,
          clientPhone: selectedPhone,
          message: newMessage,
          direction: 'outgoing'
        }
      })

      if (!response.ok) throw new Error('Failed to send message')

      toast.success('Mensagem enviada!')
      setNewMessage('')
      fetchData()
    } catch (err) {
      toast.error('Erro ao enviar mensagem')
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }

  // Loading state - only show skeleton on INITIAL load
  if (isLoading && isInitialLoad) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <div className="grid gap-4 lg:grid-cols-4 h-[650px]">
          <Skeleton className="lg:col-span-1" />
          <Skeleton className="lg:col-span-3" />
        </div>
      </div>
    )
  }

  // No account state
  if (!accountId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Conta não encontrada</h2>
        <p className="text-muted-foreground">Faça login para usar o WhatsApp</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            WhatsApp
            {aiEnabled && (
              <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] px-2">
                <Bot className="w-3 h-3 mr-1" />
                IA Ativa
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">Gerencie conversas com assistência de IA</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* AI Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={cn(
                    "transition-all",
                    aiEnabled && "border-violet-500 bg-violet-500/10"
                  )}
                >
                  {aiEnabled ? (
                    <>
                      <ToggleRight className="w-4 h-4 mr-2 text-violet-500" />
                      IA Ativa
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 mr-2" />
                      IA Desativada
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {aiEnabled ? 'Clique para desativar a IA' : 'Clique para ativar a IA'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sincronizar
          </Button>
          <Button 
            className="bg-gradient-to-r from-green-500 to-emerald-600"
            onClick={handleConnect}
          >
            <QrCode className="w-4 h-4 mr-2" />
            {isConnected ? 'Reconectar' : 'Conectar WhatsApp'}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={cn(
          "shadow-lg",
          isConnected 
            ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" 
            : "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
        )}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-inner",
              isConnected 
                ? "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30" 
                : "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30"
            )}>
              {isConnected ? (
                <Wifi className="w-7 h-7 text-green-600" />
              ) : (
                <WifiOff className="w-7 h-7 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={cn(
                "font-semibold",
                isConnected ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"
              )}>
                WhatsApp {isConnected ? 'Conectado' : 'Desconectado'}
              </h3>
              <p className={cn(
                "text-sm",
                isConnected ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
              )}>
                {isConnected 
                  ? 'Recebendo mensagens e respondendo automaticamente com IA' 
                  : 'Conecte seu número para começar a receber agendamentos automaticamente com IA'}
              </p>
              {connectionStatus !== 'unknown' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Status: <span className="font-medium">{connectionStatus}</span>
                </p>
              )}
            </div>
            <Button 
              className={cn(
                "shadow-lg",
                isConnected 
                  ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700" 
                  : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              )}
              onClick={isConnected ? handleDisconnect : handleConnect}
            >
              {isConnected ? (
                <>
                  <WifiOff className="w-4 h-4 mr-2" />
                  Desconectar
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Conectar Agora
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Stats Banner */}
      {aiEnabled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5 border-violet-500/20">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    Luna - Assistente IA
                    <Badge variant="outline" className="text-[10px] bg-violet-500/10 border-violet-500/20">
                      <Zap className="w-2.5 h-2.5 mr-1" />
                      GLM-5
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Respostas automáticas inteligentes para seus clientes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-violet-600">{messages.filter(m => m.aiGenerated).length}</p>
                  <p className="text-xs text-muted-foreground">Respostas IA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="grid gap-4 lg:grid-cols-4 h-[650px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Conversas
              <Badge variant="secondary" className="text-[10px]">
                {conversations.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[550px]">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma conversa</p>
                  <p className="text-xs">As conversas aparecerão aqui</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.phone}
                    onClick={() => setSelectedPhone(conv.phone)}
                    className={cn(
                      'w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-b border-border/50',
                      selectedPhone === conv.phone && 'bg-violet-500/10 border-l-4 border-l-violet-500'
                    )}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white">
                        {conv.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{conv.name}</span>
                        <span className="text-xs text-muted-foreground">{conv.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground truncate">{conv.lastMessage}</span>
                        {conv.unread > 0 && (
                          <span className="w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Window + AI Assistant */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white">
                    {selectedConversation?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">
                    {selectedConversation?.name || 'Selecione uma conversa'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedPhone}</p>
                </div>
              </div>
              
              <TabsList className="grid w-[300px] grid-cols-2">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Conversa
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Luna IA
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">
              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[420px] p-4">
                  {selectedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                      <p>Nenhuma mensagem</p>
                      <p className="text-sm">Selecione uma conversa</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence initial={false}>
                        {selectedMessages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              'flex gap-2',
                              msg.direction === 'outgoing' && 'justify-end'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[75%] rounded-2xl p-3',
                                msg.direction === 'incoming' 
                                  ? 'bg-muted rounded-bl-md' 
                                  : 'bg-green-500 text-white rounded-br-md'
                              )}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {msg.direction === 'incoming' && msg.intent && getIntentBadge(msg.intent)}
                                {msg.direction === 'outgoing' && msg.aiGenerated && (
                                  <Badge variant="outline" className="text-[10px] border-white/30 text-white/80">
                                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                                    IA
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              <div className={cn(
                                'flex items-center justify-end gap-1 mt-1',
                                msg.direction === 'incoming' ? 'text-muted-foreground' : 'text-white/70'
                              )}>
                                <span className="text-xs">{msg.timestamp}</span>
                                {msg.direction === 'outgoing' && getStatusIcon(msg.status)}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t bg-background space-y-2">
                {/* Quick Replies */}
                <QuickReplies onSelectReply={(message) => setNewMessage(message)} />
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {aiEnabled && (
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    Luna pode sugerir respostas automáticas para mensagens recebidas
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ai" className="flex-1 mt-0 overflow-hidden">
              <div className="h-full">
                <AIAssistant
                  sessionId={`whatsapp-${selectedPhone}`}
                  clientName={selectedConversation?.name}
                  clientPhone={selectedPhone}
                  onSuggestionAccept={(suggestion) => {
                    toast.success(`Ação sugerida: ${suggestion.intent}`)
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={(open) => {
        setShowQRDialog(open)
        if (!open) {
          // Clear timer when dialog closes
          if (qrTimerRef.current) clearInterval(qrTimerRef.current)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-green-600" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu WhatsApp para conectar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {isLoadingQR ? (
              <div className="w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl flex items-center justify-center shadow-inner border-2 border-dashed border-gray-300 dark:border-gray-700">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-green-600" />
                  <span className="text-sm text-muted-foreground">Gerando QR Code...</span>
                </div>
              </div>
            ) : qrCode ? (
              <div className="space-y-3">
                <div className="w-64 h-64 bg-white rounded-xl flex items-center justify-center shadow-inner border-2 border-green-200">
                  <img 
                    src={qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-60 h-60 object-contain"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  {qrExpiresIn > 0 ? (
                    <span>Expira em <span className={cn("font-medium", qrExpiresIn <= 10 && "text-red-500")}>{qrExpiresIn}s</span></span>
                  ) : (
                    <span className="text-red-500 font-medium">QR Code expirado - Clique em Atualizar</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl flex items-center justify-center shadow-inner border-2 border-dashed border-gray-300 dark:border-gray-700">
                <div className="text-center space-y-2">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique em "Gerar QR Code" para conectar
                  </p>
                </div>
              </div>
            )}
            
            {pairingCode && (
              <div className="mt-4 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-800">
                <p className="text-sm text-violet-800 dark:text-violet-200 text-center">
                  Código de pareamento: <span className="font-mono font-bold">{pairingCode}</span>
                </p>
              </div>
            )}
            
            <div className="mt-6 text-center space-y-3 w-full">
              <p className="text-sm text-muted-foreground">
                1. Abra o WhatsApp no seu celular
              </p>
              <p className="text-sm text-muted-foreground">
                2. Toque em Menu ⋮ ou Configurações
              </p>
              <p className="text-sm text-muted-foreground">
                3. Toque em Aparelhos conectados
              </p>
              <p className="text-sm text-muted-foreground">
                4. Aponte seu telefone para esta tela
              </p>
            </div>
            
            <div className="mt-6 flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={fetchQRCode}
                disabled={isLoadingQR}
              >
                {isLoadingQR ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Atualizar QR
              </Button>
              {pairingCode && (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => copyToClipboard(pairingCode)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Código
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
