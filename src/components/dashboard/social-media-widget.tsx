'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageSquare, Share2, Users, TrendingUp, Eye, Heart, 
  MessageCircle, Send, Instagram, Facebook, ExternalLink,
  Calendar, BarChart3, Image, Video
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface SocialPost {
  id: string
  platform: 'instagram' | 'facebook' | 'whatsapp'
  content: string
  image?: string
  likes: number
  comments: number
  shares: number
  reach: number
  engagement: number
  date: string
  status: 'published' | 'scheduled' | 'draft'
}

interface SocialStats {
  platform: string
  followers: number
  growth: number
  posts: number
  engagement: number
  icon: React.ReactNode
  color: string
}

const mockSocialStats: SocialStats[] = [
  { 
    platform: 'Instagram', 
    followers: 3450, 
    growth: 12.5, 
    posts: 128, 
    engagement: 4.8,
    icon: <Instagram className="h-4 w-4" />,
    color: '#E1306C'
  },
  { 
    platform: 'Facebook', 
    followers: 2100, 
    growth: 5.2, 
    posts: 89, 
    engagement: 3.2,
    icon: <Facebook className="h-4 w-4" />,
    color: '#4267B2'
  },
  { 
    platform: 'WhatsApp', 
    followers: 890, 
    growth: 28.3, 
    posts: 456, 
    engagement: 85.5,
    icon: <MessageSquare className="h-4 w-4" />,
    color: '#25D366'
  },
]

const mockRecentPosts: SocialPost[] = [
  {
    id: '1',
    platform: 'instagram',
    content: '✨ Novidade! Agendamento online agora disponível 24h! Agende seu horário pelo WhatsApp.',
    likes: 234,
    comments: 45,
    shares: 12,
    reach: 1850,
    engagement: 15.7,
    date: '2 horas atrás',
    status: 'published'
  },
  {
    id: '2',
    platform: 'instagram',
    content: '💇‍♀️ Promoção de Quinta! Corte feminino com 20% de desconto. Agende agora!',
    likes: 189,
    comments: 32,
    shares: 8,
    reach: 1230,
    engagement: 18.6,
    date: '1 dia atrás',
    status: 'published'
  },
  {
    id: '3',
    platform: 'facebook',
    content: '🎉 Estamos completando 5 anos! Venha celebrar conosco com promoções especiais.',
    likes: 456,
    comments: 78,
    shares: 45,
    reach: 3200,
    engagement: 18.1,
    date: '2 dias atrás',
    status: 'published'
  },
  {
    id: '4',
    platform: 'instagram',
    content: '🌟 Dica de beleza: Como manter o cabelo saudável no inverno',
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    engagement: 0,
    date: 'Amanhã 10:00',
    status: 'scheduled'
  },
]

interface SocialMediaWidgetProps {
  accountId?: string | null
}

export function SocialMediaWidget({ accountId }: SocialMediaWidgetProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  const totalFollowers = mockSocialStats.reduce((acc, s) => acc + s.followers, 0)
  const avgEngagement = (mockSocialStats.reduce((acc, s) => acc + s.engagement, 0) / mockSocialStats.length).toFixed(1)
  const totalReach = mockRecentPosts
    .filter(p => p.status === 'published')
    .reduce((acc, p) => acc + p.reach, 0)

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-500" />
      case 'facebook': return <Facebook className="h-4 w-4 text-blue-600" />
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-500" />
      default: return <Share2 className="h-4 w-4" />
    }
  }

  const filteredPosts = selectedPlatform === 'all' 
    ? mockRecentPosts 
    : mockRecentPosts.filter(p => p.platform === selectedPlatform)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <Share2 className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Redes Sociais</CardTitle>
              <CardDescription>{totalFollowers.toLocaleString('pt-BR')} seguidores</CardDescription>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1">
            <Send className="h-4 w-4" />
            Postar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-pink-600">
              {(totalFollowers / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-muted-foreground">Seguidores</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-green-600">{avgEngagement}%</p>
            <p className="text-xs text-muted-foreground">Engajamento</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-bold text-blue-600">
              {(totalReach / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-muted-foreground">Alcance</p>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="space-y-2">
          {mockSocialStats.map((stat) => (
            <div 
              key={stat.platform} 
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded"
                  style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{stat.platform}</p>
                  <p className="text-xs text-muted-foreground">{stat.followers.toLocaleString('pt-BR')} seg.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-green-500">
                  <TrendingUp className="h-3 w-3" />
                  +{stat.growth}%
                </div>
                <p className="text-xs text-muted-foreground">{stat.engagement}% eng.</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {['all', 'instagram', 'facebook'].map((platform) => (
            <Button
              key={platform}
              size="sm"
              variant={selectedPlatform === platform ? 'default' : 'outline'}
              onClick={() => setSelectedPlatform(platform)}
              className="text-xs"
            >
              {platform === 'all' ? 'Todos' : platform.charAt(0).toUpperCase() + platform.slice(1)}
            </Button>
          ))}
        </div>

        {/* Recent Posts */}
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(post.platform)}
                    <span className="text-xs text-muted-foreground">{post.date}</span>
                  </div>
                  {post.status === 'scheduled' ? (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      <Calendar className="h-3 w-3 mr-1" />
                      Agendado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      Publicado
                    </Badge>
                  )}
                </div>
                <p className="text-sm mb-2 line-clamp-2">{post.content}</p>
                {post.status === 'published' && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {post.comments}
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" />
                      {post.shares}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.reach.toLocaleString('pt-BR')}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export function SocialMediaMini({ accountId }: SocialMediaWidgetProps) {
  const totalFollowers = mockSocialStats.reduce((acc, s) => acc + s.followers, 0)
  const avgGrowth = (mockSocialStats.reduce((acc, s) => acc + s.growth, 0) / mockSocialStats.length).toFixed(1)

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <Share2 className="h-4 w-4 text-pink-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Redes Sociais</p>
              <p className="text-xs text-muted-foreground">
                {(totalFollowers / 1000).toFixed(1)}k seguidores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-green-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">+{avgGrowth}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
