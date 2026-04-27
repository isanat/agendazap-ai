'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Paperclip,
  Image,
  Mic,
  Smile,
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  Phone,
  Video,
  Search,
  ArrowLeft,
  Star,
  Trash2,
  Archive,
  BellOff,
  UserPlus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read'
  isOwn: boolean
  sender?: {
    name: string
    avatar?: string
  }
}

interface Conversation {
  id: string
  contact: {
    name: string
    avatar?: string
    phone: string
    isOnline?: boolean
    lastSeen?: Date
  }
  messages: Message[]
  unreadCount: number
  isTyping?: boolean
  isVerified?: boolean
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    contact: {
      name: 'Maria Silva',
      phone: '+55 11 99999-1234',
      isOnline: true,
    },
    unreadCount: 2,
    isTyping: false,
    isVerified: true,
    messages: [
      {
        id: '1',
        content: 'Olá! Gostaria de agendar um horário para corte',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: 'read',
        isOwn: false,
      },
      {
        id: '2',
        content: 'Olá Maria! Claro, qual horário você prefere?',
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        status: 'read',
        isOwn: true,
        sender: { name: 'Salão Beleza Total' }
      },
      {
        id: '3',
        content: 'Pode ser amanhã às 14h? Quero fazer corte + hidratação',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        status: 'delivered',
        isOwn: false,
      },
    ]
  },
  {
    id: '2',
    contact: {
      name: 'João Pedro',
      phone: '+55 11 99999-5678',
      isOnline: false,
      lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2)
    },
    unreadCount: 0,
    isTyping: false,
    messages: [
      {
        id: '1',
        content: 'Confirmado para quinta às 16h!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        status: 'read',
        isOwn: true,
      }
    ]
  },
]

interface WhatsAppChatBubbleProps {
  conversation?: Conversation
  onSendMessage?: (content: string) => void
}

export function WhatsAppChatBubble({ 
  conversation = mockConversations[0],
  onSendMessage 
}: WhatsAppChatBubbleProps) {
  const [message, setMessage] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [messages, setMessages] = useState(conversation.messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!message.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      timestamp: new Date(),
      status: 'sending',
      isOwn: true,
      sender: { name: 'Você' }
    }

    setMessages(prev => [...prev, newMessage])
    setMessage('')
    onSendMessage?.(message)

    // Simulate status updates
    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' } : m)
      )
    }, 500)

    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m)
      )
    }, 1500)
  }

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className="border-0 shadow-md overflow-hidden h-[500px] flex flex-col">
      {/* Header */}
      <CardHeader className="p-3 border-b bg-green-50 dark:bg-green-950/20">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={conversation.contact.avatar} />
            <AvatarFallback className="bg-green-500 text-white text-sm">
              {conversation.contact.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-sm">{conversation.contact.name}</CardTitle>
              {conversation.isVerified && (
                <Badge variant="outline" className="h-4 px-1 text-[9px] bg-green-500/10 text-green-600 border-green-200">
                  Verificado
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {conversation.contact.isOnline ? (
                <span className="text-green-600 dark:text-green-400">Online</span>
              ) : (
                conversation.contact.phone
              )}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 bg-[url('/whatsapp-bg.png')] bg-repeat">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex',
                msg.isOwn ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-2 shadow-sm',
                  msg.isOwn
                    ? 'bg-green-100 dark:bg-green-900/30 rounded-br-md'
                    : 'bg-white dark:bg-gray-800 rounded-bl-md'
                )}
              >
                {msg.sender && !msg.isOwn && (
                  <p className="text-xs font-medium text-green-600 mb-1">
                    {msg.sender.name}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <div className={cn(
                  'flex items-center justify-end gap-1 mt-1',
                  msg.isOwn ? '' : 'justify-start'
                )}>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(msg.timestamp)}
                  </span>
                  {msg.isOwn && getStatusIcon(msg.status)}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {conversation.isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite uma mensagem..."
              className="pr-10 h-9"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="icon"
              className="h-9 w-9 bg-green-500 hover:bg-green-600 shrink-0"
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </Card>
  )
}

export function ConversationList() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <Card className="border-0 shadow-md overflow-hidden h-[500px]">
      <CardHeader className="p-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Conversas</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar conversas..." className="pl-9 h-8" />
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto">
        {mockConversations.map((conv, index) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedId(conv.id)}
            className={cn(
              'flex items-center gap-3 p-3 cursor-pointer transition-colors',
              'hover:bg-muted/50',
              selectedId === conv.id && 'bg-muted'
            )}
          >
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={conv.contact.avatar} />
                <AvatarFallback className="bg-green-500 text-white">
                  {conv.contact.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {conv.contact.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm truncate">{conv.contact.name}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatTime(conv.messages[conv.messages.length - 1]?.timestamp)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground truncate">
                  {conv.messages[conv.messages.length - 1]?.content}
                </p>
                {conv.unreadCount > 0 && (
                  <Badge className="h-5 min-w-5 rounded-full bg-green-500 text-white text-[10px]">
                    {conv.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}

function formatTime(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = diff / (1000 * 60 * 60)

  if (hours < 24) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
