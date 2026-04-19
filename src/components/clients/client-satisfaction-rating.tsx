'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Send, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SatisfactionRatingProps {
  clientName?: string;
  serviceName?: string;
  onSubmit?: (rating: number, feedback: string, tags: string[]) => void;
}

const feedbackTags = [
  { id: 'atendimento', label: 'Ótimo atendimento', emoji: '😊' },
  { id: 'qualidade', label: 'Serviço impecável', emoji: '✨' },
  { id: 'ambiente', label: 'Ambiente agradável', emoji: '🌿' },
  { id: 'pontualidade', label: 'Pontualidade', emoji: '⏰' },
  { id: 'preco', label: 'Preço justo', emoji: '💰' },
  { id: 'recomendacao', label: 'Recomendo', emoji: '👍' },
];

const negativeTags = [
  { id: 'espera', label: 'Muita espera', emoji: '⏳' },
  { id: 'qualidade_ruim', label: 'Serviço ruim', emoji: '😕' },
  { id: 'atendimento_ruim', label: 'Atendimento ruim', emoji: '😠' },
  { id: 'preco_alto', label: 'Preço alto', emoji: '💸' },
];

export function ClientSatisfactionRating({
  clientName = 'Cliente',
  serviceName = 'serviço',
  onSubmit,
}: SatisfactionRatingProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Selecione uma nota',
        description: 'Por favor, avalie de 1 a 5 estrelas.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    onSubmit?.(rating, feedback, selectedTags);
    
    toast({
      title: 'Avaliação enviada!',
      description: `Obrigado pelo feedback, ${clientName}! Sua opinião é muito importante.`,
    });

    // Reset state
    setIsOpen(false);
    setRating(0);
    setFeedback('');
    setSelectedTags([]);
    setIsSubmitting(false);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const displayRating = hoveredRating || rating;
  const isPositive = rating >= 4;
  const availableTags = isPositive ? feedbackTags : negativeTags;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <Star className="h-4 w-4 text-amber-500" />
        Solicitar Avaliação
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Como foi sua experiência?
            </DialogTitle>
            <DialogDescription>
              {clientName}, avalie seu {serviceName} conosco
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Star Rating */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        star <= displayRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
              
              <AnimatePresence mode="wait">
                {rating > 0 && (
                  <motion.p
                    key={rating}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-center text-sm font-medium"
                  >
                    {rating === 5 && '🎉 Excelente! Muito obrigado!'}
                    {rating === 4 && '😊 Muito bom! Agradecemos!'}
                    {rating === 3 && '😐 Regular. Obrigado pelo feedback!'}
                    {rating === 2 && '😕 Lamentamos. Vamos melhorar!'}
                    {rating === 1 && '😢 Poxa... Vamos resolver isso!'}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Tags */}
            {rating > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <p className="text-sm font-medium text-muted-foreground">
                  {isPositive ? 'O que você mais gostou?' : 'O que podemos melhorar?'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <motion.button
                      key={tag.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border-2 transition-colors ${
                        selectedTags.includes(tag.id)
                          ? isPositive
                            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {tag.emoji} {tag.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Feedback Text */}
            {rating > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <p className="text-sm font-medium text-muted-foreground">
                  Comentário adicional (opcional)
                </p>
                <Textarea
                  placeholder="Conte mais sobre sua experiência..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </motion.div>
            )}

            {/* Submit */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Avaliação
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact version for display in cards/tables
export function SatisfactionBadge({ rating }: { rating: number }) {
  const getColor = () => {
    if (rating >= 4.5) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (rating >= 3.5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <Badge className={`gap-1 ${getColor()}`}>
      <Star className="h-3 w-3 fill-current" />
      {rating.toFixed(1)}
    </Badge>
  );
}

// Mini chart component for dashboard
export function SatisfactionChart({ data }: { data: { rating: number; count: number }[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Satisfação dos Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={item.rating} className="flex items-center gap-2">
              <div className="flex items-center gap-1 w-16">
                <Star className={`h-3 w-3 ${index < item.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                <span className="text-xs text-muted-foreground">{item.rating}★</span>
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">
                {Math.round((item.count / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Média geral</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= 4.5 ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                }`}
              />
            ))}
            <span className="text-sm font-bold ml-1">4.5</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
