'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  Filter,
  ChevronRight,
  Reply,
  Flag,
  CheckCircle2,
  Clock,
  Calendar,
  Sentiment,
  Smile,
  Meh,
  Frown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Review {
  id: string
  clientName: string
  clientAvatar?: string
  rating: number
  service: string
  professional: string
  comment: string
  date: string
  platform: 'whatsapp' | 'google' | 'instagram' | 'internal'
  sentiment: 'positive' | 'neutral' | 'negative'
  replied: boolean
  helpful: number
}

const mockReviews: Review[] = [
  {
    id: '1',
    clientName: 'Ana Carolina',
    rating: 5,
    service: 'Corte Feminino',
    professional: 'Ana Silva',
    comment: 'Atendimento excelente! A Ana é muito profissional e atenciosa. Adorei o resultado!',
    date: '2024-12-10',
    platform: 'google',
    sentiment: 'positive',
    replied: true,
    helpful: 12
  },
  {
    id: '2',
    clientName: 'Maria Fernanda',
    rating: 4,
    service: 'Manicure',
    professional: 'Maria Costa',
    comment: 'Bom atendimento, mas o horário atrasou um pouco. Fora isso, tudo perfeito!',
    date: '2024-12-09',
    platform: 'whatsapp',
    sentiment: 'neutral',
    replied: false,
    helpful: 5
  },
  {
    id: '3',
    clientName: 'Juliana Santos',
    rating: 5,
    service: 'Hidratação',
    professional: 'Julia Ferreira',
    comment: 'Melhor hidratação que já fiz! Minha cabelo ficou incrível. Super recomendo!',
    date: '2024-12-08',
    platform: 'instagram',
    sentiment: 'positive',
    replied: true,
    helpful: 18
  },
  {
    id: '4',
    clientName: 'Camila Oliveira',
    rating: 2,
    service: 'Coloração',
    professional: 'Ana Silva',
    comment: 'A cor ficou diferente do que eu pedi. Precisei voltar para ajustar.',
    date: '2024-12-07',
    platform: 'google',
    sentiment: 'negative',
    replied: false,
    helpful: 3
  },
  {
    id: '5',
    clientName: 'Patricia Lima',
    rating: 5,
    service: 'Barba',
    professional: 'Carlos Santos',
    comment: 'Carlos é o melhor barbeiro da região! Sempre perfeito.',
    date: '2024-12-06',
    platform: 'internal',
    sentiment: 'positive',
    replied: true,
    helpful: 8
  },
  {
    id: '6',
    clientName: 'Beatriz Costa',
    rating: 3,
    service: 'Spa',
    professional: 'Julia Ferreira',
    comment: 'O serviço foi bom mas achei caro para o que oferece.',
    date: '2024-12-05',
    platform: 'whatsapp',
    sentiment: 'neutral',
    replied: false,
    helpful: 2
  }
]

const platformConfig = {
  google: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Google' },
  whatsapp: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'WhatsApp' },
  instagram: { color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30', label: 'Instagram' },
  internal: { color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Interno' }
}

const sentimentConfig = {
  positive: { icon: Smile, color: 'text-green-600', bg: 'bg-green-100', label: 'Positivo' },
  neutral: { icon: Meh, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Neutro' },
  negative: { icon: Frown, color: 'text-red-600', bg: 'bg-red-100', label: 'Negativo' }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface CustomerFeedbackWidgetProps {
  accountId?: string | null
}

export function CustomerFeedbackWidget({ accountId }: CustomerFeedbackWidgetProps) {
  const [reviews, setReviews] = useState(mockReviews)
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'pending'>('all')

  const filteredReviews = reviews.filter(r => {
    if (filter === 'positive') return r.rating >= 4
    if (filter === 'negative') return r.rating <= 2
    if (filter === 'pending') return !r.replied
    return true
  })

  const avgRating = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
  const totalReviews = reviews.length
  const positiveCount = reviews.filter(r => r.sentiment === 'positive').length
  const negativeCount = reviews.filter(r => r.sentiment === 'negative').length
  const pendingReplies = reviews.filter(r => !r.replied).length

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
  }))

  const handleReply = (id: string) => {
    setReviews(prev => prev.map(r =>
      r.id === id ? { ...r, replied: true } : r
    ))
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Avaliações de Clientes</CardTitle>
              <CardDescription>{totalReviews} avaliações recebidas</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-lg font-bold">{avgRating}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
            <Smile className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-700 dark:text-green-400">{positiveCount}</p>
            <p className="text-xs text-green-600">Positivas</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-center">
            <Meh className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
              {reviews.filter(r => r.sentiment === 'neutral').length}
            </p>
            <p className="text-xs text-amber-600">Neutras</p>
          </div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
            <Frown className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-700 dark:text-red-400">{negativeCount}</p>
            <p className="text-xs text-red-600">Negativas</p>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-1.5">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-2">
              <div className="flex items-center gap-1 w-8">
                <span className="text-sm font-medium">{rating}</span>
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              </div>
              <Progress value={percentage} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-8">{count}</span>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'positive', 'negative', 'pending'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={cn(
                'text-xs',
                filter === f && 'bg-yellow-600 hover:bg-yellow-700'
              )}
            >
              {f === 'all' ? 'Todas' : f === 'positive' ? 'Positivas' : f === 'negative' ? 'Negativas' : 'Pendentes'}
              {f === 'pending' && pendingReplies > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1">
                  {pendingReplies}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-3 max-h-72 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filteredReviews.map((review, index) => {
              const platformConf = platformConfig[review.platform]
              const sentimentConf = sentimentConfig[review.sentiment]
              const SentimentIcon = sentimentConf.icon

              return (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    review.sentiment === 'negative'
                      ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                      : 'bg-card hover:border-muted-foreground/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-3 h-3',
                              i < review.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-muted'
                            )}
                          />
                        ))}
                      </div>
                      <Badge variant="outline" className={cn('text-xs', platformConf.bg)}>
                        {platformConf.label}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{review.clientName}</span>
                        <SentimentIcon className={cn('w-4 h-4', sentimentConf.color)} />
                        {!review.replied && (
                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">
                            <Clock className="w-2 h-2 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {review.service} • {review.professional}
                      </p>
                      <p className="text-sm line-clamp-2">{review.comment}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(review.date), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ThumbsUp className="w-3 h-3" />
                          {review.helpful}
                        </div>
                      </div>
                    </div>
                    {!review.replied && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-yellow-600 hover:text-yellow-700"
                        onClick={() => handleReply(review.id)}
                      >
                        <Reply className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

export function CustomerFeedbackMini({ accountId }: CustomerFeedbackWidgetProps) {
  const avgRating = (mockReviews.reduce((a, r) => a + r.rating, 0) / mockReviews.length).toFixed(1)

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
          <Star className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Avaliações</p>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-medium">{avgRating}</span>
            <span className="text-xs text-muted-foreground">({mockReviews.length} avaliações)</span>
          </div>
        </div>
        <Button size="sm" variant="ghost">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
