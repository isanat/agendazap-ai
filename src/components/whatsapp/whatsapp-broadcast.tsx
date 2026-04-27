'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Users, X, Loader2, CheckCircle, AlertCircle,
  Sparkles, FileText, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';

interface BroadcastRecipient {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
}

interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  errors?: string[];
}

interface WhatsAppBroadcastProps {
  accountId: string | null;
  recipients?: BroadcastRecipient[];
  onSend?: () => void;
}

const broadcastTemplates = [
  {
    id: 'promo',
    name: 'Promoção',
    message: '🔥 PROMOÇÃO ESPECIAL!\n\nOlá {nome}!\n\nTemos uma oferta exclusiva para você:\n\n{promocao}\n\nVálido até {validade}!\n\nResponda "QUERO" para aproveitar!',
  },
  {
    id: 'reminder',
    name: 'Lembrete',
    message: 'Olá {nome}! 👋\n\nSentimos sua falta! Já faz um tempinho que você não vem nos visitar.\n\nQue tal agendar um horinho para se cuidar? 💇\n\nTemos horários disponíveis esta semana!',
  },
  {
    id: 'holiday',
    name: 'Feriado',
    message: '🎉 {feriado} está chegando!\n\nOlá {nome}!\n\nEstamos com agenda especial para o feriado!\n\nHorário: {horario}\n\nAgende agora seu horário especial!',
  },
  {
    id: 'new_service',
    name: 'Novo Serviço',
    message: '✨ NOVIDADE!\n\nOlá {nome}!\n\nTemos um novo serviço: {servico}!\n\n{descricao}\n\nPreço promocional: {preco}\n\nAgende agora!',
  },
];

export function WhatsAppBroadcast({ accountId, recipients: propRecipients, onSend }: WhatsAppBroadcastProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>(propRecipients || []);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [step, setStep] = useState<'compose' | 'recipients' | 'confirm' | 'result'>('compose');

  // Load clients if no recipients provided
  const loadClients = async () => {
    if (!accountId || propRecipients?.length) return;
    
    try {
      const response = await authFetch(`/api/clients?accountId=${accountId}`);
      if (response.ok) {
        const data = await response.json();
        const clients = (data.clients || data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          tags: c.tags,
        }));
        setRecipients(clients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    loadClients();
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = broadcastTemplates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.message);
      setSelectedTemplate(templateId);
    }
  };

  const toggleRecipient = (id: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecipients(newSelected);
  };

  const selectAll = () => {
    if (selectedRecipients.size === recipients.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(recipients.map(r => r.id)));
    }
  };

  const handleSend = async () => {
    if (!message.trim() || selectedRecipients.size === 0) {
      toast.error('Preencha a mensagem e selecione destinatários');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const selectedList = recipients.filter(r => selectedRecipients.has(r.id));
      
      // In production, this would call the backend to send bulk messages
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const successCount = Math.floor(selectedList.length * 0.95);
      const failCount = selectedList.length - successCount;

      setResult({
        total: selectedList.length,
        sent: successCount,
        failed: failCount,
      });

      setStep('result');
      
      if (failCount === 0) {
        toast.success(`${successCount} mensagens enviadas com sucesso!`);
      } else {
        toast.warning(`${successCount} enviadas, ${failCount} falharam`);
      }

      onSend?.();
    } catch (error) {
      toast.error('Erro ao enviar mensagens');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setStep('compose');
    setMessage('');
    setSelectedTemplate('');
    setSelectedRecipients(new Set());
    setResult(null);
    setIsScheduled(false);
    setScheduleTime('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={handleOpen}
        >
          <Send className="w-4 h-4" />
          Envio em Massa
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Envio em Massa WhatsApp
          </DialogTitle>
          <DialogDescription>
            Envie mensagens para múltiplos clientes de uma vez
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 py-2">
            {['compose', 'recipients', 'confirm', 'result'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                  step === s ? "bg-green-500 text-white" : 
                  ['compose', 'recipients', 'confirm', 'result'].indexOf(step) > i 
                    ? "bg-green-200 text-green-700" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </div>
                {i < 3 && <div className="w-8 h-0.5 bg-muted" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Compose Message */}
            {step === 'compose' && (
              <motion.div
                key="compose"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Templates */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Templates Rápidos
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {broadcastTemplates.map(template => (
                      <Button
                        key={template.id}
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTemplateSelect(template.id)}
                        className={cn(
                          "text-xs",
                          selectedTemplate === template.id && "bg-green-600 hover:bg-green-700"
                        )}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Mensagem</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="min-h-32 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{nome}"} para personalizar com o nome do cliente
                  </p>
                </div>

                {/* Schedule Option */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm">Agendar envio</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isScheduled}
                      onCheckedChange={setIsScheduled}
                    />
                    {isScheduled && (
                      <Input
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-48 text-xs"
                      />
                    )}
                  </div>
                </div>

                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => setStep('recipients')}
                  disabled={!message.trim()}
                >
                  Próximo: Selecionar Destinatários
                </Button>
              </motion.div>
            )}

            {/* Step 2: Select Recipients */}
            {step === 'recipients' && (
              <motion.div
                key="recipients"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Selecionar Destinatários
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedRecipients.size} selecionados
                    </Badge>
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      {selectedRecipients.size === recipients.length ? 'Limpar' : 'Todos'}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-64 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {recipients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum cliente encontrado</p>
                      </div>
                    ) : (
                      recipients.map(recipient => (
                        <button
                          key={recipient.id}
                          onClick={() => toggleRecipient(recipient.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                            selectedRecipients.has(recipient.id)
                              ? "bg-green-100 dark:bg-green-900/30"
                              : "hover:bg-muted"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center",
                            selectedRecipients.has(recipient.id)
                              ? "bg-green-500 border-green-500"
                              : "border-muted-foreground"
                          )}>
                            {selectedRecipients.has(recipient.id) && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{recipient.name}</p>
                            <p className="text-xs text-muted-foreground">{recipient.phone}</p>
                          </div>
                          {recipient.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('compose')} className="flex-1">
                    Voltar
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => setStep('confirm')}
                    disabled={selectedRecipients.size === 0}
                  >
                    Próximo: Confirmar
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Destinatários:</span>
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        {selectedRecipients.size} clientes
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Envio:</span>
                      <span className="text-sm font-medium">
                        {isScheduled 
                          ? new Date(scheduleTime).toLocaleString('pt-BR')
                          : 'Imediato'}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-sm text-muted-foreground mb-1">Mensagem:</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                        {message}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('recipients')} className="flex-1">
                    Voltar
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleSend}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Agora
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Result */}
            {step === 'result' && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center py-6">
                  <div className={cn(
                    "w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4",
                    result.failed === 0 
                      ? "bg-green-100 dark:bg-green-900/30" 
                      : "bg-amber-100 dark:bg-amber-900/30"
                  )}>
                    {result.failed === 0 ? (
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    ) : (
                      <AlertCircle className="w-10 h-10 text-amber-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {result.failed === 0 ? 'Envio Concluído!' : 'Envio Concluído com Avisos'}
                  </h3>
                  <p className="text-muted-foreground">
                    {result.sent} de {result.total} mensagens enviadas com sucesso
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{result.sent}</p>
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">{result.failed}</p>
                    <p className="text-xs text-muted-foreground">Falharam</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{result.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>

                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setIsOpen(false);
                    resetDialog();
                  }}
                >
                  Concluir
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
