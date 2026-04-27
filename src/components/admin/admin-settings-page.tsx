'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, Server, Key, Globe, Mail, Percent, 
  Save, Check, AlertTriangle, ExternalLink, 
  Smartphone, CreditCard, FileText,
  MessageSquare, Shield, HelpCircle, Copy, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { OAuthSetupGuide } from './oauth-setup-guide';
import { PlansManager } from './plans-manager';
import { authFetch, authGet } from '@/lib/auth-fetch';

interface SystemConfig {
  id: string;
  evolutionApiUrl: string | null;
  evolutionApiKey: string | null;
  evolutionWebhookUrl: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  emailFrom: string | null;
  platformFeePercent: number;
  platformFeeFixed: number;
  systemName: string;
  systemLogo: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  enableAiAssistant: boolean;
  enableMercadoPago: boolean;
  enableNfeGeneration: boolean;
}

export function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [activeTab, setActiveTab] = useState('whatsapp');

  // Form states
  const [evolutionApiUrl, setEvolutionApiUrl] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [evolutionWebhookUrl, setEvolutionWebhookUrl] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await authGet('/api/admin/system-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setEvolutionApiUrl(data.config.evolutionApiUrl || '');
        setEvolutionApiKey(data.config.evolutionApiKey || '');
        setEvolutionWebhookUrl(data.config.evolutionWebhookUrl || '');
      } else {
        console.error('Erro ao carregar configurações:', response.status, response.statusText);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as configurações',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await authFetch('/api/admin/system-config', {
        method: 'PUT',
        body: {
          evolutionApiUrl,
          evolutionApiKey: evolutionApiKey.includes('•') ? undefined : evolutionApiKey,
          evolutionWebhookUrl,
          enableAiAssistant: config?.enableAiAssistant,
          enableMercadoPago: config?.enableMercadoPago,
          enableNfeGeneration: config?.enableNfeGeneration,
          platformFeePercent: config?.platformFeePercent,
          platformFeeFixed: config?.platformFeeFixed,
          smtpHost: config?.smtpHost,
          smtpPort: config?.smtpPort,
          smtpUser: config?.smtpUser,
          smtpPassword: config?.smtpPassword,
          emailFrom: config?.emailFrom,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        toast({
          title: 'Sucesso!',
          description: 'Configurações salvas com sucesso',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!evolutionApiUrl) {
      toast({
        title: 'URL necessária',
        description: 'Preencha a URL da API Evolution',
        variant: 'destructive',
      });
      return;
    }

    try {
      // If API key is masked (••••), don't send it - the backend will use the saved one
      const body: Record<string, string> = { evolutionApiUrl };
      if (evolutionApiKey && !evolutionApiKey.includes('•')) {
        body.evolutionApiKey = evolutionApiKey;
      }

      const response = await authFetch('/api/admin/system-config/test-evolution', {
        method: 'POST',
        body,
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Conexão bem-sucedida!',
          description: data.message || 'A API Evolution está respondendo corretamente',
        });
      } else {
        toast({
          title: 'Erro na conexão',
          description: data.error || 'Não foi possível conectar à API',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível testar a conexão',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground mt-1">
            Configure as integrações globais do AgendaZap
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Área Administrativa
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Estas configurações são aplicadas globalmente para todas as empresas que utilizam o sistema.
                Cada empresa terá sua própria instância WhatsApp dentro do servidor Evolution API configurado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="oauth" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            OAuth
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Taxas
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Evolution API - Servidor WhatsApp
                  </CardTitle>
                  <CardDescription>
                    Configure o servidor Evolution API que será usado por todas as empresas
                  </CardDescription>
                </div>
                <a
                  href="https://doc.evolution-api.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  Documentação <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL da API */}
              <div className="space-y-2">
                <Label htmlFor="evolution-url" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  URL da API Evolution
                </Label>
                <Input
                  id="evolution-url"
                  placeholder="https://seu-servidor-evolution.com"
                  value={evolutionApiUrl}
                  onChange={(e) => setEvolutionApiUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  URL base do seu servidor Evolution API (ex: https://evolution.seudominio.com)
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="evolution-key" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Key Global
                </Label>
                <Input
                  id="evolution-key"
                  type="password"
                  placeholder="Sua API key do Evolution API"
                  value={evolutionApiKey}
                  onChange={(e) => setEvolutionApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Chave de API para gerenciar instâncias. Cada empresa terá sua própria instância.
                </p>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  URL de Webhook (opcional)
                </Label>
                <Input
                  id="webhook-url"
                  placeholder="https://seu-app.com/api/webhooks/evolution"
                  value={evolutionWebhookUrl}
                  onChange={(e) => setEvolutionWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  URL para receber eventos do WhatsApp (mensagens, status de conexão, etc.)
                </p>
              </div>

              <Separator />

              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {evolutionApiUrl && evolutionApiKey ? (
                    <>
                      <Check className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Servidor Configurado</p>
                        <p className="text-sm text-muted-foreground">
                          As empresas poderão conectar seus WhatsApps
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="font-medium">Configuração Pendente</p>
                        <p className="text-sm text-muted-foreground">
                          Configure a URL e API Key para habilitar WhatsApp
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={testConnection}>
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Como Funciona
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Você configura o servidor Evolution API</p>
                    <p className="text-sm text-muted-foreground">
                      Uma única vez, você (dono do sistema) configura a URL e API Key do seu servidor Evolution API.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Cada empresa cria sua instância</p>
                    <p className="text-sm text-muted-foreground">
                      Cada empresa que se cadastrar terá sua própria instância WhatsApp dentro do seu servidor.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Empresas escaneiam QR Code</p>
                    <p className="text-sm text-muted-foreground">
                      Cada empresa escaneia o QR Code com seu WhatsApp para conectar. Totalmente isolado.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-6">
          <PlansManager />
        </TabsContent>

        {/* OAuth Tab */}
        <TabsContent value="oauth" className="mt-6">
          <OAuthSetupGuide />
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Habilite ou desabilite funcionalidades para todas as empresas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Assistente IA (Luna)</p>
                    <p className="text-sm text-muted-foreground">
                      Chatbot inteligente para atendimento automático
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config?.enableAiAssistant ?? true}
                  onCheckedChange={async (checked) => {
                    setConfig(prev => prev ? {...prev, enableAiAssistant: checked} : prev)
                    try {
                      await authFetch('/api/admin/system-config', {
                        method: 'PUT',
                        body: { enableAiAssistant: checked }
                      })
                    } catch (e) {
                      console.error('Failed to update setting:', e)
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Mercado Pago</p>
                    <p className="text-sm text-muted-foreground">
                      Pagamentos via PIX
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config?.enableMercadoPago ?? true}
                  onCheckedChange={async (checked) => {
                    setConfig(prev => prev ? {...prev, enableMercadoPago: checked} : prev)
                    try {
                      await authFetch('/api/admin/system-config', {
                        method: 'PUT',
                        body: { enableMercadoPago: checked }
                      })
                    } catch (e) {
                      console.error('Failed to update setting:', e)
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">NFS-e Automático</p>
                    <p className="text-sm text-muted-foreground">
                      Geração automática de nota fiscal de serviço
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config?.enableNfeGeneration ?? false}
                  onCheckedChange={async (checked) => {
                    setConfig(prev => prev ? {...prev, enableNfeGeneration: checked} : prev)
                    try {
                      await authFetch('/api/admin/system-config', {
                        method: 'PUT',
                        body: { enableNfeGeneration: checked }
                      })
                    } catch (e) {
                      console.error('Failed to update setting:', e)
                    }
                  }}
                />
                <Badge variant="secondary" className="ml-2">Em breve</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Email</CardTitle>
              <CardDescription>
                Configure o servidor SMTP para envio de emails do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">Servidor SMTP</Label>
                  <Input
                    id="smtp-host"
                    value={config?.smtpHost || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, smtpHost: e.target.value} : prev)}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Porta</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={config?.smtpPort ?? ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, smtpPort: parseInt(e.target.value) || null} : prev)}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Usuário</Label>
                  <Input
                    id="smtp-user"
                    value={config?.smtpUser || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, smtpUser: e.target.value} : prev)}
                    placeholder="seu-email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Senha</Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    value={config?.smtpPassword || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, smtpPassword: e.target.value} : prev)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-from">Email de Remetente</Label>
                <Input
                  id="email-from"
                  value={config?.emailFrom || ''}
                  onChange={(e) => setConfig(prev => prev ? {...prev, emailFrom: e.target.value} : prev)}
                  placeholder="noreply@agendazap.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Taxas da Plataforma</CardTitle>
              <CardDescription>
                Configure as taxas que o sistema retém de cada transação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fee-percent">Taxa Percentual (%)</Label>
                  <Input
                    id="fee-percent"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={config?.platformFeePercent ?? 0}
                    onChange={(e) => setConfig(prev => prev ? {...prev, platformFeePercent: parseFloat(e.target.value) || 0} : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee-fixed">Taxa Fixa (R$)</Label>
                  <Input
                    id="fee-fixed"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={config?.platformFeeFixed ?? 0}
                    onChange={(e) => setConfig(prev => prev ? {...prev, platformFeeFixed: parseFloat(e.target.value) || 0} : prev)}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Essas taxas são descontadas de cada pagamento recebido antes de repassar para a empresa.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
