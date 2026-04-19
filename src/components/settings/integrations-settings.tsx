'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, CreditCard, Check, AlertTriangle, 
  RefreshCw, ExternalLink, QrCode, Loader2, Trash2, 
  Power, MessageSquare, HelpCircle, X, Copy, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Integration {
  id: string;
  type: string;
  status: string;
  lastSync: string | null;
  errorMessage: string | null;
  credentials: string;
  config: string | null;
  metadata: string | null;
}

interface SystemConfig {
  evolutionApiUrl: string | null;
  evolutionApiAvailable: boolean;
  enableAiAssistant: boolean;
  enableMercadoPago: boolean;
}

export function IntegrationsSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [integrationsRes, configRes] = await Promise.all([
        authFetch('/api/integrations'),
        authFetch('/api/integrations/system-config'),
      ]);

      if (integrationsRes.ok) {
        const data = await integrationsRes.json();
        setIntegrations(data.integrations || []);
      }

      if (configRes.ok) {
        const data = await configRes.json();
        setSystemConfig(data.config);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntegration = (type: string): Integration | undefined => {
    return integrations.find(i => i.type === type);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Conectado</Badge>;
      case 'pending':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'disconnected':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" /> Desconectado</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // ========== WHATSAPP ==========

  const connectWhatsApp = async () => {
    setConnecting(true);
    setQrCode(null);
    setPairingCode(null);
    
    try {
      const response = await authFetch('/api/integrations/whatsapp/create-instance', {
        method: 'POST',
        body: {}, // No instance name needed - auto-generated
      });

      const data = await response.json();

      if (response.ok) {
        setQrCode(data.qrCode);
        setPairingCode(data.pairingCode || null);
        setShowQrDialog(true);
        
        // Poll for connection status
        pollConnectionStatus();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível criar a instância',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor',
        variant: 'destructive',
      });
    } finally {
      setConnecting(false);
    }
  };

  const copyPairingCode = async () => {
    if (pairingCode) {
      await navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      toast({
        title: 'Copiado!',
        description: 'Código de pareamento copiado',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const pollConnectionStatus = async () => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    const poll = async () => {
      if (attempts >= maxAttempts) return;
      attempts++;

      try {
        const response = await authFetch('/api/integrations/whatsapp/status');
        const data = await response.json();

        if (data.status === 'connected') {
          setShowQrDialog(false);
          setQrCode(null);
          toast({
            title: 'WhatsApp Conectado!',
            description: 'Sua instância WhatsApp foi conectada com sucesso',
          });
          loadData();
          return;
        }

        // Continue polling
        setTimeout(poll, 5000);
      } catch {
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const disconnectWhatsApp = async () => {
    try {
      const response = await authFetch('/api/integrations/whatsapp/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Desconectado',
          description: 'WhatsApp foi desconectado',
        });
        loadData();
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar',
        variant: 'destructive',
      });
    }
  };

  // ========== MERCADO PAGO ==========

  const connectMercadoPago = async () => {
    try {
      const response = await authFetch('/api/integrations/mercadopago/oauth');
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a conexão',
        variant: 'destructive',
      });
    }
  };

  const disconnectMercadoPago = async () => {
    try {
      const mpIntegration = getIntegration('mercadopago');
      if (!mpIntegration) return;

      await authFetch(`/api/integrations/${mpIntegration.id}`, {
        method: 'DELETE',
      });

      toast({
        title: 'Desconectado',
        description: 'Mercado Pago foi desconectado',
      });
      loadData();
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const whatsappIntegration = getIntegration('whatsapp');
  const mercadopagoIntegration = getIntegration('mercadopago');
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Suas Integrações
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Conecte suas contas para receber pagamentos, sincronizar agenda e enviar mensagens automáticas.
                Suas credenciais são armazenadas de forma segura e criptografada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Smartphone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>WhatsApp Business</CardTitle>
                <CardDescription>
                  Conecte seu WhatsApp para envio de mensagens automáticas
                </CardDescription>
              </div>
            </div>
            {whatsappIntegration && getStatusBadge(whatsappIntegration.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!systemConfig?.evolutionApiAvailable ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                O servidor WhatsApp não está configurado. 
                Configure as variáveis de ambiente <code className="px-1 bg-amber-100 dark:bg-amber-900 rounded">EVOLUTION_API_URL</code> e{' '}
                <code className="px-1 bg-amber-100 dark:bg-amber-900 rounded">EVOLUTION_API_KEY</code> no Vercel.
              </p>
            </div>
          ) : whatsappIntegration?.status === 'connected' ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        WhatsApp Conectado
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Você pode enviar e receber mensagens automaticamente
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={disconnectWhatsApp}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Conecte seu WhatsApp para enviar lembretes automáticos, confirmar agendamentos 
                e cobrar taxas de no-show. O nome da instância será gerado automaticamente.
              </p>
              <Button onClick={connectWhatsApp} disabled={connecting} size="lg" className="gap-2">
                {connecting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Power className="h-5 w-5" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
              
              {whatsappIntegration?.status === 'error' && whatsappIntegration.errorMessage && (
                <p className="text-sm text-red-500">{whatsappIntegration.errorMessage}</p>
              )}
            </div>
          )}

          {/* QR Code Dialog */}
          <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Conectar WhatsApp</DialogTitle>
                <DialogDescription>
                  Escaneie o QR Code ou use o código de pareamento
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-4">
                {qrCode ? (
                  <div className="p-4 bg-white rounded-lg">
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  </div>
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
                
                {pairingCode && (
                  <div className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg w-full">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Código de Pareamento
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-2xl font-mono font-bold text-blue-900 dark:text-blue-100 tracking-wider">
                        {pairingCode}
                      </code>
                      <Button variant="ghost" size="sm" onClick={copyPairingCode}>
                        {copied ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Opção 1: QR Code</p>
                  <p className="text-sm text-muted-foreground">
                    1. Abra o WhatsApp no celular
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Vá em Configurações → Aparelhos conectados
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Escaneie o QR Code acima
                  </p>
                  
                  {pairingCode && (
                    <>
                      <p className="text-sm font-medium mt-4">Opção 2: Código de Pareamento</p>
                      <p className="text-sm text-muted-foreground">
                        1. Abra o WhatsApp no celular
                      </p>
                      <p className="text-sm text-muted-foreground">
                        2. Vá em Configurações → Aparelhos conectados
                      </p>
                      <p className="text-sm text-muted-foreground">
                        3. Escolha "Conectar com número de telefone"
                      </p>
                      <p className="text-sm text-muted-foreground">
                        4. Digite o código acima
                      </p>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={() => setShowQrDialog(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Mercado Pago Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Mercado Pago</CardTitle>
                <CardDescription>
                  Receba pagamentos via PIX automaticamente
                </CardDescription>
              </div>
            </div>
            {mercadopagoIntegration && getStatusBadge(mercadopagoIntegration.status)}
          </div>
        </CardHeader>
        <CardContent>
          {!systemConfig?.enableMercadoPago ? (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Esta funcionalidade está desabilitada pelo administrador.
              </p>
            </div>
          ) : mercadopagoIntegration?.status === 'connected' ? (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Mercado Pago Conectado
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Você pode receber pagamentos via PIX
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={disconnectMercadoPago}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Conecte sua conta Mercado Pago para receber pagamentos de taxas de no-show
                e agendamentos diretamente na sua conta.
              </p>
              <Button onClick={connectMercadoPago}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Conectar Mercado Pago
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Assistant Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle>Assistente IA (Luna)</CardTitle>
                <CardDescription>
                  Atendimento automático inteligente via WhatsApp
                </CardDescription>
              </div>
            </div>
            {systemConfig?.enableAiAssistant ? (
              <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Ativo</Badge>
            ) : (
              <Badge variant="secondary">Desativado</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              A assistente IA Luna está {systemConfig?.enableAiAssistant ? 'ativa' : 'desativada'} para sua conta.
              Ela pode responder automaticamente mensagens de clientes, agendar horários, 
              cancelar compromissos e muito mais.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
