'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Clock, CheckCircle, Heart, X, Calendar, 
  Sparkles, MessageCircle, Star, AlertCircle, 
  PhoneCall, Gift, Timer, FileText, Plus, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuickReply {
  id: string;
  name: string;
  message: string;
  category: 'confirmation' | 'reminder' | 'followup' | 'promotion' | 'info' | 'cancel';
  icon?: React.ReactNode;
  emoji: string;
}

const quickReplies: QuickReply[] = [
  {
    id: '1',
    name: 'Confirmar',
    message: 'Olá! Seu agendamento está confirmado para {data} às {hora}. Te esperamos! 💇\n\nPara cancelar ou remarcar, responda esta mensagem.',
    category: 'confirmation',
    icon: <CheckCircle className="w-3 h-3" />,
    emoji: '✅',
  },
  {
    id: '2',
    name: 'Lembrete 24h',
    message: '⏰ Lembrete: Você tem um agendamento amanhã às {hora}.\n\nServiço: {servico}\nProfissional: {profissional}\n\nConfirme respondendo "SIM" ou cancele respondendo "CANCELAR".',
    category: 'reminder',
    icon: <Clock className="w-3 h-3" />,
    emoji: '⏰',
  },
  {
    id: '3',
    name: 'Lembrete 2h',
    message: '🕐 Lembrete: Seu agendamento é em 2 horas!\n\n📍 Endereço: {endereco}\n👤 Profissional: {profissional}\n\nEstamos te esperando!',
    category: 'reminder',
    icon: <Timer className="w-3 h-3" />,
    emoji: '🕐',
  },
  {
    id: '4',
    name: 'Pós-atendimento',
    message: 'Olá {nome}! 💜\n\nObrigado por nos visitar hoje! Esperamos que tenha adorado o resultado. 🌟\n\nSua opinião é muito importante para nós. Avalie seu atendimento respondendo de 1 a 5 estrelas! ⭐',
    category: 'followup',
    icon: <Heart className="w-3 h-3" />,
    emoji: '💜',
  },
  {
    id: '5',
    name: 'Promoção',
    message: '🔥 PROMOÇÃO ESPECIAL! 🔥\n\n{promocao}\n\nVálido até: {validade}\n\nAgende agora respondendo esta mensagem ou ligando para {telefone}!',
    category: 'promotion',
    icon: <Gift className="w-3 h-3" />,
    emoji: '🔥',
  },
  {
    id: '6',
    name: 'Horários',
    message: '📅 Nossos horários de funcionamento:\n\nSegunda a Sexta: 9h às 19h\nSábado: 9h às 17h\nDomingo: Fechado\n\nPara agendar, escolha o dia e horário de sua preferência!',
    category: 'info',
    icon: <Calendar className="w-3 h-3" />,
    emoji: '📅',
  },
  {
    id: '7',
    name: 'Preços',
    message: '💰 Lista de Preços:\n\n{servicos}\n\nPara agendar, responda com o serviço desejado e sua disponibilidade!',
    category: 'info',
    icon: <FileText className="w-3 h-3" />,
    emoji: '💰',
  },
  {
    id: '8',
    name: 'Cancelar',
    message: 'Olá {nome}!\n\nSeu agendamento foi cancelado conforme solicitado.\n\nCaso queira remarcar, estamos à disposição!\n\nAtenciosamente, {empresa} 💚',
    category: 'cancel',
    icon: <X className="w-3 h-3" />,
    emoji: '❌',
  },
  {
    id: '9',
    name: 'No-show',
    message: 'Olá {nome}!\n\nNotamos que você não compareceu ao seu agendamento de {data}.\n\nPedimos que, caso precise cancelar, nos avise com pelo menos 24h de antecedência.\n\nDeseja remarcar? Responda esta mensagem!',
    category: 'followup',
    icon: <AlertCircle className="w-3 h-3" />,
    emoji: '⚠️',
  },
  {
    id: '10',
    name: 'Aniversário',
    message: '🎂 Feliz Aniversário, {nome}! 🎉\n\nPara celebrar seu dia especial, preparamos um presente exclusivo para você!\n\n🎁 {desconto}% de desconto em qualquer serviço!\n\nVálido durante todo o mês do seu aniversário. Agende agora!',
    category: 'promotion',
    icon: <Gift className="w-3 h-3" />,
    emoji: '🎂',
  },
  {
    id: '11',
    name: 'Novo Cliente',
    message: 'Olá! Bem-vindo(a) ao {empresa}! 💚\n\nFicamos felizes em ter você como cliente. Para conhecer nossos serviços e preços, responda com:\n\n1️⃣ Ver serviços\n2️⃣ Ver preços\n3️⃣ Agendar horário\n4️⃣ Falar com atendente',
    category: 'info',
    icon: <Sparkles className="w-3 h-3" />,
    emoji: '👋',
  },
  {
    id: '12',
    name: 'Retorno',
    message: 'Olá {nome}! 👋\n\nJá passou um tempinho desde sua última visita. Que tal agendar um horinho para se cuidar? 💇‍♀️\n\nTemos novidades esperando por você!\n\nResponda esta mensagem para agendar.',
    category: 'followup',
    icon: <PhoneCall className="w-3 h-3" />,
    emoji: '📞',
  },
];

const categoryConfig: Record<string, { 
  color: string; 
  bg: string;
  border: string;
  label: string;
}> = {
  confirmation: { 
    color: 'text-green-700 dark:text-green-300', 
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    label: 'Confirmação'
  },
  reminder: { 
    color: 'text-blue-700 dark:text-blue-300', 
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    label: 'Lembrete'
  },
  followup: { 
    color: 'text-purple-700 dark:text-purple-300', 
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    label: 'Pós-atendimento'
  },
  promotion: { 
    color: 'text-orange-700 dark:text-orange-300', 
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-300 dark:border-orange-700',
    label: 'Promoção'
  },
  info: { 
    color: 'text-cyan-700 dark:text-cyan-300', 
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    border: 'border-cyan-300 dark:border-cyan-700',
    label: 'Informação'
  },
  cancel: { 
    color: 'text-red-700 dark:text-red-300', 
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-300 dark:border-red-700',
    label: 'Cancelamento'
  },
};

interface QuickRepliesProps {
  onSelectReply?: (message: string) => void;
}

export function QuickReplies({ onSelectReply }: QuickRepliesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSelect = (reply: QuickReply) => {
    onSelectReply?.(reply.message);
    toast.success('Mensagem inserida!', {
      description: `Template "${reply.name}" adicionado ao campo de mensagem.`,
    });
    setIsExpanded(false);
  };

  const filteredReplies = selectedCategory 
    ? quickReplies.filter(r => r.category === selectedCategory)
    : quickReplies;

  return (
    <div className="w-full">
      {/* Toggle Button */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
            "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
            "hover:from-green-600 hover:to-emerald-600 transition-all shadow-sm"
          )}
        >
          <Zap className="h-3 w-3" />
          Respostas Rápidas
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[10px]"
          >
            ▼
          </motion.span>
        </motion.button>

        {/* Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Settings className="w-3 h-3 mr-1" />
              Filtrar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
              <Star className="w-3 h-3 mr-2" />
              Todos
            </DropdownMenuItem>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => setSelectedCategory(key)}>
                <Badge variant="outline" className={cn("mr-2 text-[10px]", config.bg, config.border)}>
                  {config.label}
                </Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Templates Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              {filteredReplies.map((reply, index) => {
                const config = categoryConfig[reply.category];
                return (
                  <motion.button
                    key={reply.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelect(reply)}
                    className={cn(
                      "flex flex-col items-start gap-1 p-2.5 rounded-lg text-left transition-all shadow-sm",
                      "hover:shadow-md border",
                      config.bg, config.border
                    )}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-lg">{reply.emoji}</span>
                      <span className={cn("text-xs font-semibold", config.color)}>
                        {reply.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {reply.message.substring(0, 60)}...
                    </p>
                  </motion.button>
                );
              })}
            </div>
            
            {/* Helper text */}
            <div className="flex items-center gap-2 mt-2 px-1">
              <MessageCircle className="w-3 h-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">
                Use {"{nome}"}, {"{data}"}, {"{hora}"} para personalizar as mensagens automaticamente
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
