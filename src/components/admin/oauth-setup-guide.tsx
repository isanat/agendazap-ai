'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HelpCircle, ExternalLink, Check, Copy, CheckCircle2,
  Calendar, CreditCard, MessageSquare, Key, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export function OAuthSetupGuide() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: 'Copiado!',
      description: 'Texto copiado para a área de transferência',
    });
  };

  const redirectUris = {
    google: 'https://agendazap-ai-isanats-projects.vercel.app/api/integrations/google/callback',
    mercadopago: 'https://agendazap-ai-isanats-projects.vercel.app/api/integrations/mercadopago/callback',
  };

  const envVariables = [
    { key: 'GOOGLE_CLIENT_ID', description: 'Client ID do Google Cloud Console' },
    { key: 'GOOGLE_CLIENT_SECRET', description: 'Client Secret do Google Cloud Console' },
    { key: 'GOOGLE_REDIRECT_URI', description: 'URL de callback do Google', value: redirectUris.google },
    { key: 'MP_CLIENT_ID', description: 'Client ID do Mercado Pago Developers' },
    { key: 'MP_CLIENT_SECRET', description: 'Client Secret do Mercado Pago Developers' },
    { key: 'MP_REDIRECT_URI', description: 'URL de callback do Mercado Pago', value: redirectUris.mercadopago },
    { key: 'MP_SANDBOX', description: 'Use "true" para testes, "false" para produção', value: 'true' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Guia de Configuração OAuth
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Para habilitar as integrações com Google Calendar e Mercado Pago, você precisa
                configurar as credenciais OAuth nas variáveis de ambiente do Vercel.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="google" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="google" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Google
          </TabsTrigger>
          <TabsTrigger value="mercadopago" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Mercado Pago
          </TabsTrigger>
          <TabsTrigger value="env" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Variáveis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="google" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-red-500" />
                Google Calendar OAuth Setup
              </CardTitle>
              <CardDescription>
                Configure o acesso à API do Google Calendar para sincronização de agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                  <span className="font-medium">Acesse o Google Cloud Console</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Google Cloud Console
                  </a>
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                  <span className="font-medium">Crie um novo projeto ou selecione um existente</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                  <span className="font-medium">Configure a tela de consentimento OAuth</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Vá para "OAuth consent screen" e configure como "External" para permitir
                  que qualquer conta Google possa autenticar.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</div>
                  <span className="font-medium">Crie credenciais OAuth 2.0</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Vá para "Credentials" → "Create Credentials" → "OAuth client ID"
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">5</div>
                  <span className="font-medium">Adicione a URI de redirecionamento autorizado</span>
                </div>
                <div className="ml-8 p-3 bg-muted rounded-lg flex items-center justify-between">
                  <code className="text-sm break-all">{redirectUris.google}</code>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(redirectUris.google, 'google-uri')}
                  >
                    {copied === 'google-uri' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">6</div>
                  <span className="font-medium">Habilite as APIs necessárias</span>
                </div>
                <div className="ml-8 flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Calendar API
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">7</div>
                  <span className="font-medium">Copie Client ID e Client Secret</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Adicione como <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code> e{' '}
                  <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_SECRET</code> nas variáveis de ambiente do Vercel.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mercadopago" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                Mercado Pago OAuth Setup
              </CardTitle>
              <CardDescription>
                Configure o acesso à API do Mercado Pago para recebimento de pagamentos via PIX
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                  <span className="font-medium">Acesse o Mercado Pago Developers</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Mercado Pago Developers
                  </a>
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                  <span className="font-medium">Crie uma nova aplicação</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Clique em "Criar aplicação" e preencha os dados do seu negócio.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                  <span className="font-medium">Configure as URLs de redirecionamento</span>
                </div>
                <div className="ml-8 p-3 bg-muted rounded-lg flex items-center justify-between">
                  <code className="text-sm break-all">{redirectUris.mercadopago}</code>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(redirectUris.mercadopago, 'mp-uri')}
                  >
                    {copied === 'mp-uri' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</div>
                  <span className="font-medium">Habilite as permissões necessárias</span>
                </div>
                <div className="ml-8 space-y-1 text-sm text-muted-foreground">
                  <p>✓ <code>read</code> - Ler informações da conta</p>
                  <p>✓ <code>write</code> - Criar pagamentos</p>
                  <p>✓ <code>offline_access</code> - Acesso offline para refresh tokens</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">5</div>
                  <span className="font-medium">Copie as credenciais</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Adicione como <code className="bg-muted px-1 rounded">MP_CLIENT_ID</code>,{' '}
                  <code className="bg-muted px-1 rounded">MP_CLIENT_SECRET</code> e{' '}
                  <code className="bg-muted px-1 rounded">MP_REDIRECT_URI</code> nas variáveis de ambiente do Vercel.
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Importante:</strong> Para testes, use <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">MP_SANDBOX=true</code>.
                  Para produção, altere para <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">MP_SANDBOX=false</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="env" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Variáveis de Ambiente
              </CardTitle>
              <CardDescription>
                Configure estas variáveis no Vercel (Settings → Environment Variables)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {envVariables.map((env) => (
                  <div key={env.key} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <code className="font-mono text-sm font-bold">{env.key}</code>
                      {env.value && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(env.value!, env.key)}
                        >
                          {copied === env.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{env.description}</p>
                    {env.value && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                        Valor: {env.value}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                URLs de Redirecionamento
              </CardTitle>
              <CardDescription>
                Configure estas URLs nos respectivos consoles de desenvolvedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">Google Calendar</p>
                      <code className="text-sm break-all">{redirectUris.google}</code>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(redirectUris.google, 'google-uri-2')}
                    >
                      {copied === 'google-uri-2' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">Mercado Pago</p>
                      <code className="text-sm break-all">{redirectUris.mercadopago}</code>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(redirectUris.mercadopago, 'mp-uri-2')}
                    >
                      {copied === 'mp-uri-2' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
