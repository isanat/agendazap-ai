'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bot, Send, Sparkles, Loader2, Trash2, Settings, 
  MessageSquare, Calendar, Clock, DollarSign, RefreshCw,
  ChevronDown, ChevronUp, Info, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  intent?: string
  entities?: Record<string, string | undefined>
}

interface AIAssistantProps {
  sessionId: string
  clientName?: string
  clientPhone?: string
  onSuggestionAccept?: (suggestion: { intent: string; entities: Record<string, string | undefined> }) => void
}

const INTENT_COLORS: Record<string, string> = {
  schedule: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  cancel: 'bg-red-500/10 text-red-600 border-red-500/20',
  reschedule: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  price: 'bg-green-500/10 text-green-600 border-green-500/20',
  availability: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  greeting: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  thanks: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  general: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

const INTENT_LABELS: Record<string, string> = {
  schedule: 'Agendamento',
  cancel: 'Cancelamento',
  reschedule: 'Remarcação',
  price: 'Preço',
  availability: 'Disponibilidade',
  greeting: 'Saudação',
  thanks: 'Agradecimento',
  general: 'Geral',
}

export function AIAssistant({ 
  sessionId, 
  clientName = 'Cliente',
  clientPhone,
  onSuggestionAccept 
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [autoReply, setAutoReply] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          message: userMessage.content,
          context: clientName !== 'Cliente' ? `Cliente: ${clientName}${clientPhone ? `, Telefone: ${clientPhone}` : ''}` : undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          role: 'assistant',
          timestamp: new Date(),
          intent: data.intent,
          entities: data.entities
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Erro ao processar mensagem')
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem para a IA')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Clear conversation
  const clearConversation = async () => {
    try {
      await fetch(`/api/ai/chat?sessionId=${sessionId}`, { method: 'DELETE', credentials: 'include' })
      setMessages([])
      toast.success('Conversa limpa')
    } catch (error) {
      toast.error('Erro ao limpar conversa')
    }
  }

  // Get suggested response based on client message
  const getSuggestedResponse = (clientMessage: string) => {
    setInput(clientMessage)
    inputRef.current?.focus()
  }

  // Accept suggestion and trigger action
  const handleAcceptSuggestion = (message: Message) => {
    if (message.intent && message.entities && onSuggestionAccept) {
      onSuggestionAccept({ intent: message.intent, entities: message.entities })
    }
  }

  return (
    <Card className="flex flex-col h-full border-0 shadow-none">
      {/* Header */}
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-violet-500/5 to-purple-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Luna IA
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-violet-500/10 border-violet-500/20">
                  <Zap className="w-2.5 h-2.5 mr-1" />
                  GLM-5
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Assistente inteligente</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Configurações da IA
                  </DialogTitle>
                  <DialogDescription>
                    Configure o comportamento da assistente virtual
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Resposta Automática
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Responder automaticamente mensagens recebidas
                      </p>
                    </div>
                    <Switch checked={autoReply} onCheckedChange={setAutoReply} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Modo Proativo
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Sugerir ações com base no contexto
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
              onClick={clearConversation}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-4"
              >
                <Sparkles className="w-8 h-8 text-violet-500" />
              </motion.div>
              <h3 className="font-semibold mb-2">Olá! Sou a Luna 🌙</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                Sua assistente virtual inteligente. Posso ajudar com agendamentos, 
                preços, horários e muito mais!
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { text: '📋 Agendar horário', msg: 'Quero agendar um horário' },
                  { text: '💰 Ver preços', msg: 'Quais são os preços dos serviços?' },
                  { text: '🕐 Horários', msg: 'Quais horários estão disponíveis?' },
                ].map((suggestion) => (
                  <Button
                    key={suggestion.text}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => getSuggestedResponse(suggestion.msg)}
                  >
                    {suggestion.text}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' && 'justify-end'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    <div className={cn(
                      'max-w-[80%] rounded-2xl p-3',
                      message.role === 'user' 
                        ? 'bg-green-500 text-white rounded-br-md' 
                        : 'bg-muted rounded-bl-md'
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.role === 'assistant' && message.intent && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant="outline" 
                              className={cn('text-[10px]', INTENT_COLORS[message.intent] || INTENT_COLORS.general)}
                            >
                              {INTENT_LABELS[message.intent] || 'Geral'}
                            </Badge>
                            
                            {message.entities && Object.keys(message.entities).length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => setExpandedMessage(
                                  expandedMessage === message.id ? null : message.id
                                )}
                              >
                                {expandedMessage === message.id ? (
                                  <><ChevronUp className="w-3 h-3 mr-1" /> Ocultar</>
                                ) : (
                                  <><ChevronDown className="w-3 h-3 mr-1" /> Detalhes</>
                                )}
                              </Button>
                            )}
                          </div>
                          
                          {expandedMessage === message.id && message.entities && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="mt-2 space-y-1"
                            >
                              {Object.entries(message.entities).map(([key, value]) => (
                                value && (
                                  <div key={key} className="flex items-center gap-2 text-xs">
                                    {key === 'date' && <Calendar className="w-3 h-3 text-blue-500" />}
                                    {key === 'time' && <Clock className="w-3 h-3 text-amber-500" />}
                                    {key === 'service' && <MessageSquare className="w-3 h-3 text-green-500" />}
                                    <span className="text-muted-foreground capitalize">{key}:</span>
                                    <span className="font-medium">{value}</span>
                                  </div>
                                )
                              ))}
                              
                              {onSuggestionAccept && message.intent && ['schedule', 'cancel', 'reschedule'].includes(message.intent) && (
                                <Button
                                  size="sm"
                                  className="w-full mt-2 h-7 text-xs"
                                  onClick={() => handleAcceptSuggestion(message)}
                                >
                                  <Zap className="w-3 h-3 mr-1" />
                                  Executar Ação
                                </Button>
                              )}
                            </motion.div>
                          )}
                        </div>
                      )}
                      
                      <div className={cn(
                        'text-[10px] mt-1',
                        message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                      )}>
                        {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                      <span className="text-sm text-muted-foreground">Pensando...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Info className="w-3 h-3 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">
            Luna está pronta para ajudar. Pressione Enter para enviar.
          </p>
        </div>
      </div>
    </Card>
  )
}
