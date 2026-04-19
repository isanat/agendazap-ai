'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, WifiOff, RefreshCw, X, 
  Smartphone, Bell, Check 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWA } from '@/hooks/use-pwa';

// Helper function to check if PWA prompt was dismissed
function wasPromptDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
  if (!dismissedAt) return false;
  const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
  return daysSince < 7;
}

// Helper function to check notification permission
function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
  return Notification.permission;
}

// Helper function to check if notification prompt was dismissed
function wasNotificationPromptDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const dismissedAt = localStorage.getItem('notification-prompt-dismissed');
  return !!dismissedAt;
}

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(wasPromptDismissed);
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    const success = await installApp();
    if (!success) {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
      >
        <Card className="border-green-200 dark:border-green-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Smartphone className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Instalar AgendaZap</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Instale o app para acesso rápido, notificações e uso offline.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={handleInstall}
                    disabled={installing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {installing ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Instalando...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        Instalar
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    Agora não
                  </Button>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function OfflineIndicator() {
  const { isOffline } = usePWA();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4"
        >
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <WifiOff className="h-4 w-4" />
            Você está offline. Algumas funcionalidades podem estar limitadas.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function UpdatePrompt() {
  const { needsUpdate, updateApp } = usePWA();

  if (!needsUpdate) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 right-4 z-[100]"
      >
        <Card className="border-blue-200 dark:border-blue-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Atualização disponível</p>
                <p className="text-xs text-muted-foreground">
                  Uma nova versão do app está disponível.
                </p>
              </div>
              <Button size="sm" onClick={updateApp} className="ml-2">
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState(getNotificationPermission);

  useEffect(() => {
    // Show prompt if not yet decided and not previously dismissed
    if (permission === 'default' && !wasNotificationPromptDismissed()) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [permission]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
      >
        <Card className="border-purple-200 dark:border-purple-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Ativar notificações</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receba alertas de novos agendamentos, lembretes e mensagens.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={requestPermission}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Ativar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    Não, obrigado
                  </Button>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
