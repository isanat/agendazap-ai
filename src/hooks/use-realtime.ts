'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeEvent {
  type: 'points_update' | 'package_update' | 'notification' | 'appointment_update';
  accountId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UseRealtimeOptions {
  accountId: string | null;
  userId?: string;
  onPointsUpdate?: (data: {
    clientId: string;
    points: number;
    operation: 'earn' | 'redeem' | 'expire' | 'bonus';
    description?: string;
  }) => void;
  onPackageUpdate?: (data: {
    clientPackageId: string;
    action: 'purchased' | 'used' | 'expired';
    remainingSessions?: number;
  }) => void;
  onNotification?: (data: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
  }) => void;
  onAppointmentUpdate?: (data: {
    appointmentId: string;
    action: 'created' | 'updated' | 'cancelled' | 'completed';
  }) => void;
}

/**
 * Check if the app is running in production/Vercel environment
 * In production, WebSocket connections to local ports don't work
 * because there's no persistent server in serverless environments
 */
function isProductionEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for Vercel deployment
  const hostname = window.location.hostname;
  const isVercel = hostname.includes('vercel.app') || 
                   hostname.includes('.vercel.app') ||
                   hostname.endsWith('.vercel.app');
  
  // Also check for other production indicators
  const isProductionDomain = !hostname.includes('localhost') && 
                             !hostname.includes('127.0.0.1') &&
                             !hostname.includes('[::1]');
  
  return isVercel || (process.env.NODE_ENV === 'production' && isProductionDomain);
}

export function useRealtime({
  accountId,
  userId,
  onPointsUpdate,
  onPackageUpdate,
  onNotification,
  onAppointmentUpdate,
}: UseRealtimeOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Check if running in production (Vercel)
  const isProduction = isProductionEnvironment();

  useEffect(() => {
    // Skip WebSocket connection in production/Vercel environment
    // In serverless environments, there's no persistent WebSocket server
    if (isProduction) {
      console.log('WebSocket disabled in production environment');
      return;
    }
    
    if (!accountId) return;

    // Connect to realtime service (only in development/local)
    socketRef.current = io('/?XTransformPort=3003', {
      path: '/',
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to realtime service');
      setIsConnected(true);

      // Join account room
      if (accountId && userId) {
        socket.emit('join-account', { accountId, userId });
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from realtime service');
      setIsConnected(false);
    });

    socket.on('joined', (data: { accountId: string; message: string }) => {
      console.log(`Joined account room: ${data.accountId}`);
    });

    socket.on('realtime-event', (event: RealtimeEvent) => {
      switch (event.type) {
        case 'points_update':
          onPointsUpdate?.(event.data as Parameters<NonNullable<typeof onPointsUpdate>>[0]);
          break;
        case 'package_update':
          onPackageUpdate?.(event.data as Parameters<NonNullable<typeof onPackageUpdate>>[0]);
          break;
        case 'notification':
          onNotification?.(event.data as Parameters<NonNullable<typeof onNotification>>[0]);
          break;
        case 'appointment_update':
          onAppointmentUpdate?.(event.data as Parameters<NonNullable<typeof onAppointmentUpdate>>[0]);
          break;
      }
    });

    socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [accountId, userId, onPointsUpdate, onPackageUpdate, onNotification, onAppointmentUpdate, isProduction]);

  // Emit points update
  const emitPointsUpdate = useCallback((data: {
    clientId: string;
    points: number;
    operation: 'earn' | 'redeem' | 'expire' | 'bonus';
    description?: string;
  }) => {
    if (!socketRef.current || !accountId) return;
    socketRef.current.emit('points-update', {
      accountId,
      ...data,
    });
  }, [accountId]);

  // Emit package update
  const emitPackageUpdate = useCallback((data: {
    clientPackageId: string;
    action: 'purchased' | 'used' | 'expired';
    remainingSessions?: number;
  }) => {
    if (!socketRef.current || !accountId) return;
    socketRef.current.emit('package-update', {
      accountId,
      ...data,
    });
  }, [accountId]);

  // Emit notification
  const emitNotification = useCallback((data: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
  }) => {
    if (!socketRef.current || !accountId) return;
    socketRef.current.emit('notification', {
      accountId,
      ...data,
    });
  }, [accountId]);

  // Emit appointment update
  const emitAppointmentUpdate = useCallback((data: {
    appointmentId: string;
    action: 'created' | 'updated' | 'cancelled' | 'completed';
  }) => {
    if (!socketRef.current || !accountId) return;
    socketRef.current.emit('appointment-update', {
      accountId,
      ...data,
    });
  }, [accountId]);

  return {
    isConnected,
    emitPointsUpdate,
    emitPackageUpdate,
    emitNotification,
    emitAppointmentUpdate,
  };
}
