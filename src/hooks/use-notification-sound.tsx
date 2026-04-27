'use client'

import { useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

// Sound types
const SOUND_TYPES = {
  default: '/sounds/notification.mp3',
  gentle: '/sounds/gentle.mp3',
  alert: '/sounds/alert.mp3',
  success: '/sounds/success.mp3',
}

// Sound settings interface
interface SoundSettings {
  enabled: boolean
  volume: number
  soundType: keyof typeof SOUND_TYPES
}

const defaultSettings: SoundSettings = {
  enabled: true,
  volume: 0.5,
  soundType: 'default',
}

/**
 * Hook for playing notification sounds
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(typeof window !== 'undefined' ? new Audio() : null)
  
  const playSound = useCallback((type: keyof typeof SOUND_TYPES = 'default') => {
    const settings = getSettings()
    
    if (!settings.enabled) return
    
    try {
      const audio = audioRef.current
      if (audio) {
        audio.src = SOUND_TYPES[type] || SOUND_TYPES.default
        audio.volume = settings.volume
        audio.currentTime = 0
        audio.play().catch(() => {
          // Ignore autoplay errors
        })
      }
    } catch {
      // Ignore sound errors
    }
  }, [])

  const playCustomSound = useCallback((soundUrl: string) => {
    const settings = getSettings()
    
    if (!settings.enabled) return
    
    try {
      const audio = audioRef.current
      if (audio) {
        audio.src = soundUrl
        audio.volume = settings.volume
        audio.currentTime = 0
        audio.play().catch(() => {
          // Ignore autoplay errors
        })
      }
    } catch {
      // Ignore sound errors
    }
  }, [])

  return { playSound, playCustomSound }
}

/**
 * Get sound settings from localStorage
 */
function getSettings(): SoundSettings {
  if (typeof window === 'undefined') return defaultSettings
  
  try {
    const saved = localStorage.getItem('agendazap-sound-settings')
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) }
    }
  } catch {
    // Ignore
  }
  
  return defaultSettings
}

/**
 * Save sound settings to localStorage
 */
export function saveSoundSettings(settings: Partial<SoundSettings>) {
  if (typeof window === 'undefined') return
  
  try {
    const current = getSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem('agendazap-sound-settings', JSON.stringify(updated))
  } catch {
    // Ignore
  }
}

/**
 * Play a notification sound (imperative API)
 */
export function playNotificationSound(type: keyof typeof SOUND_TYPES = 'default') {
  const settings = getSettings()
  
  if (!settings.enabled) return
  
  try {
    const audio = new Audio(SOUND_TYPES[type] || SOUND_TYPES.default)
    audio.volume = settings.volume
    audio.play().catch(() => {
      // Ignore autoplay errors
    })
  } catch {
    // Ignore sound errors
  }
}

/**
 * Sound settings component for the settings page
 */
export function SoundSettings() {
  const { toast } = useToast()
  
  const settings = getSettings()
  
  const handleToggle = (enabled: boolean) => {
    saveSoundSettings({ enabled })
    toast({
      title: enabled ? 'Sons ativados' : 'Sons desativados',
      duration: 2000,
    })
  }
  
  const handleVolumeChange = (volume: number) => {
    saveSoundSettings({ volume })
  }
  
  const handleTypeChange = (soundType: keyof typeof SOUND_TYPES) => {
    saveSoundSettings({ soundType })
    playNotificationSound(soundType)
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Sons de Notificação</h3>
          <p className="text-sm text-muted-foreground">
            Toque sons para alertas e notificações
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!settings.enabled)}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${settings.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
      
      {settings.enabled && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Som</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(SOUND_TYPES).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type as keyof typeof SOUND_TYPES)}
                  className={`
                    px-3 py-2 text-sm rounded-lg border transition-colors
                    ${settings.soundType === type
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
