'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wifi, WifiOff, QrCode, MessageSquare, 
  RefreshCw, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/auth-fetch';
import { getStoredAccountId } from '@/hooks/use-data';

interface WhatsAppStatusWidgetProps {
  accountId?: string | null;
  mini?: boolean;
  onConnect?: () => void;
}

export function WhatsAppStatusWidget({ accountId: propAccountId, mini = false, onConnect }: WhatsAppStatusWidgetProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>('unknown');
  const [instanceName, setInstanceName] = useState<string>('');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const accountId = propAccountId || getStoredAccountId();

  const fetchStatus = async () => {
    if (!accountId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authFetch('/api/whatsapp/evolution?action=status');
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status || 'unknown');
        setIsConnected(data.status === 'open' || data.status === 'connected');
        setInstanceName(data.instanceName || '');
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [accountId]);

  if (mini) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : isConnected ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-amber-500" />
        )}
        <span className="text-xs font-medium">
          WhatsApp {isConnected ? 'Conectado' : 'Desconectado'}
        </span>
        {isConnected && (
          <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">
            Ativo
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      "overflow-hidden",
      isConnected 
        ? "border-green-200 dark:border-green-800" 
        : "border-amber-200 dark:border-amber-800"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-600" />
            WhatsApp
          </div>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px]",
                isConnected 
                  ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" 
                  : "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
              )}
            >
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            isConnected 
              ? "bg-green-100 dark:bg-green-900/30" 
              : "bg-amber-100 dark:bg-amber-900/30"
          )}>
            {isConnected ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CheckCircle className="w-6 h-6 text-green-600" />
              </motion.div>
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isConnected ? 'Tudo funcionando!' : 'Conexão necessária'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isConnected 
                ? instanceName 
                  ? `Instância: ${instanceName}` 
                  : 'Recebendo mensagens'
                : 'Conecte para receber agendamentos'}
            </p>
          </div>
        </div>

        {lastSync && (
          <p className="text-[10px] text-muted-foreground">
            Última verificação: {lastSync.toLocaleTimeString('pt-BR')}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={fetchStatus}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            size="sm"
            className={cn(
              "flex-1 text-xs",
              isConnected 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            )}
            onClick={onConnect}
          >
            <QrCode className="w-3 h-3 mr-1" />
            {isConnected ? 'Reconectar' : 'Conectar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
