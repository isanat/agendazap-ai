'use client';

import { useCallback, useEffect, useState } from 'react';

export type NotificationSound = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'message' 
  | 'appointment' 
  | 'payment'
  | 'reminder';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

const SOUND_CONFIGS: Record<NotificationSound, SoundConfig> = {
  success: { frequency: 800, duration: 200, type: 'sine', volume: 0.3 },
  error: { frequency: 300, duration: 400, type: 'square', volume: 0.3 },
  warning: { frequency: 500, duration: 300, type: 'triangle', volume: 0.3 },
  message: { frequency: 600, duration: 150, type: 'sine', volume: 0.2 },
  appointment: { frequency: 700, duration: 250, type: 'sine', volume: 0.3 },
  payment: { frequency: 900, duration: 200, type: 'sine', volume: 0.3 },
  reminder: { frequency: 550, duration: 300, type: 'triangle', volume: 0.25 },
};

interface UseSoundNotificationsReturn {
  playSound: (sound: NotificationSound) => void;
  isMuted: boolean;
  toggleMute: () => void;
  isSupported: boolean;
}

// Helper function to check support
function checkAudioSupport(): boolean {
  if (typeof window === 'undefined') return true;
  const AudioContextClass = window.AudioContext || 
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return !!AudioContextClass;
}

// Helper function to get mute preference
function getMutePreference(): boolean {
  if (typeof window === 'undefined') return false;
  const savedMuted = localStorage.getItem('agendazap-sound-muted');
  return savedMuted === 'true';
}

export function useSoundNotifications(): UseSoundNotificationsReturn {
  const [isMuted, setIsMuted] = useState(getMutePreference);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isSupported] = useState(checkAudioSupport);

  const initAudioContext = useCallback(() => {
    if (!audioContext && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || 
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        setAudioContext(ctx);
        return ctx;
      }
    }
    return audioContext;
  }, [audioContext]);

  const playSound = useCallback((sound: NotificationSound) => {
    if (isMuted || !isSupported) return;

    try {
      const ctx = initAudioContext();
      if (!ctx) return;

      // Resume audio context if suspended (required by browsers)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const config = SOUND_CONFIGS[sound];
      
      // Create oscillator
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

      // Set volume envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration / 1000);

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Play sound
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration / 1000);

      // Play a second tone for some sounds (more pleasant)
      if (sound === 'success' || sound === 'payment') {
        const oscillator2 = ctx.createOscillator();
        const gainNode2 = ctx.createGain();

        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(config.frequency * 1.25, ctx.currentTime + 0.15);

        gainNode2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
        gainNode2.gain.linearRampToValueAtTime(config.volume * 0.8, ctx.currentTime + 0.16);
        gainNode2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        oscillator2.connect(gainNode2);
        gainNode2.connect(ctx.destination);

        oscillator2.start(ctx.currentTime + 0.15);
        oscillator2.stop(ctx.currentTime + 0.35);
      }

    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [isMuted, isSupported, initAudioContext, audioContext]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('agendazap-sound-muted', String(newMuted));
  }, [isMuted]);

  return {
    playSound,
    isMuted,
    toggleMute,
    isSupported,
  };
}

// Utility function to play notification with browser notification
export async function playNotificationWithSound(
  title: string,
  options: NotificationOptions,
  sound: NotificationSound
): Promise<Notification | null> {
  // Show browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    return new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    });
  }

  return null;
}

// Standalone function to play sound (for use outside of components)
export function playStandaloneSound(sound: NotificationSound, muted: boolean = false): void {
  if (muted) return;

  try {
    const AudioContextClass = window.AudioContext || 
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const config = SOUND_CONFIGS[sound];
    
    // Create oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

    // Set volume envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration / 1000);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Play sound
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + config.duration / 1000);

    // Resume audio context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}
