'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Palette, Sun, Moon, Monitor, Check, RotateCcw,
  Sparkles, Eye, Type, Layout, Volume2, Bell
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

// Theme color presets
const colorPresets = [
  { name: 'Verde', primary: '#22c55e', secondary: '#16a34a', gradient: 'from-green-500 to-emerald-600' },
  { name: 'Azul', primary: '#3b82f6', secondary: '#2563eb', gradient: 'from-blue-500 to-blue-600' },
  { name: 'Roxo', primary: '#8b5cf6', secondary: '#7c3aed', gradient: 'from-purple-500 to-violet-600' },
  { name: 'Rosa', primary: '#ec4899', secondary: '#db2777', gradient: 'from-pink-500 to-rose-600' },
  { name: 'Laranja', primary: '#f97316', secondary: '#ea580c', gradient: 'from-orange-500 to-amber-600' },
  { name: 'Ciano', primary: '#06b6d4', secondary: '#0891b2', gradient: 'from-cyan-500 to-teal-600' },
]

// Font size presets
const fontSizes = [
  { name: 'Pequeno', value: 'small', scale: 0.875 },
  { name: 'Normal', value: 'normal', scale: 1 },
  { name: 'Grande', value: 'large', scale: 1.125 },
  { name: 'Muito Grande', value: 'xlarge', scale: 1.25 },
]

// Border radius presets
const radiusStyles = [
  { name: 'Quadrado', value: 'none', radius: '0px' },
  { name: 'Suave', value: 'sm', radius: '0.25rem' },
  { name: 'Médio', value: 'md', radius: '0.5rem' },
  { name: 'Arredondado', value: 'lg', radius: '0.75rem' },
  { name: 'Muito Arredondado', value: 'xl', radius: '1rem' },
]

interface ThemeSettings {
  theme: 'light' | 'dark' | 'system'
  primaryColor: string
  fontSize: string
  borderRadius: string
  reducedMotion: boolean
  highContrast: boolean
  compactMode: boolean
  soundEnabled: boolean
  notificationSound: string
}

const defaultSettings: ThemeSettings = {
  theme: 'system',
  primaryColor: '#22c55e',
  fontSize: 'normal',
  borderRadius: 'md',
  reducedMotion: false,
  highContrast: false,
  compactMode: false,
  soundEnabled: true,
  notificationSound: 'default',
}

export function ThemeCustomizer() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings)
  const [hasChanges, setHasChanges] = useState(false)
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light')

  // Load settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('agendazap-theme-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        // Only update if different from current state
        setSettings(prev => {
          const merged = { ...defaultSettings, ...parsed }
          if (JSON.stringify(prev) === JSON.stringify(merged)) return prev
          return merged
        })
      } catch {
        // Use defaults
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply theme changes
  useEffect(() => {
    const root = document.documentElement
    
    // Apply theme
    if (settings.theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else if (settings.theme === 'light') {
      root.classList.remove('dark')
      root.classList.add('light')
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    // Apply font size
    const fontSizeConfig = fontSizes.find(f => f.value === settings.fontSize)
    if (fontSizeConfig) {
      root.style.setProperty('--font-scale', fontSizeConfig.scale.toString())
    }

    // Apply border radius
    const radiusConfig = radiusStyles.find(r => r.value === settings.borderRadius)
    if (radiusConfig) {
      root.style.setProperty('--radius', radiusConfig.radius)
    }

    // Apply reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0s')
    } else {
      root.style.removeProperty('--animation-duration')
    }

    // Apply high contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Apply compact mode
    if (settings.compactMode) {
      root.classList.add('compact-mode')
    } else {
      root.classList.remove('compact-mode')
    }

  }, [settings])

  const updateSetting = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const saveSettings = () => {
    localStorage.setItem('agendazap-theme-settings', JSON.stringify(settings))
    setHasChanges(false)
    toast({
      title: 'Configurações salvas!',
      description: 'Suas preferências de tema foram aplicadas.',
    })
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    setHasChanges(true)
    toast({
      title: 'Configurações redefinidas',
      description: 'Todas as preferências voltaram ao padrão.',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-green-500" />
                Personalização
              </CardTitle>
              <CardDescription>
                Personalize a aparência do AgendaZap
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <Button onClick={saveSettings} size="sm" className="bg-green-500 hover:bg-green-600">
                  <Check className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              )}
              <Button onClick={resetSettings} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-1" />
                Resetar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="theme" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="theme">Tema</TabsTrigger>
              <TabsTrigger value="colors">Cores</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="accessibility">Acessibilidade</TabsTrigger>
            </TabsList>

            {/* Theme Tab */}
            <TabsContent value="theme" className="space-y-6">
              {/* Mode Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Modo de Tema</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', icon: Sun, label: 'Claro' },
                    { value: 'dark', icon: Moon, label: 'Escuro' },
                    { value: 'system', icon: Monitor, label: 'Sistema' },
                  ].map((mode) => (
                    <motion.button
                      key={mode.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => updateSetting('theme', mode.value as 'light' | 'dark' | 'system')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300',
                        settings.theme === mode.value
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg shadow-green-500/20'
                          : 'border-border hover:border-green-300 dark:hover:border-green-700'
                      )}
                    >
                      <mode.icon className={cn(
                        'h-6 w-6',
                        settings.theme === mode.value ? 'text-green-500' : 'text-muted-foreground'
                      )} />
                      <span className={cn(
                        'text-sm font-medium',
                        settings.theme === mode.value ? 'text-green-600' : 'text-foreground'
                      )}>
                        {mode.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Pré-visualização</Label>
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setPreviewMode('light')}
                    className={cn(
                      'p-4 rounded-xl border-2 cursor-pointer transition-all bg-white',
                      previewMode === 'light' ? 'border-green-500' : 'border-border'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-gray-900">Modo Claro</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-3/4 bg-gray-200 rounded" />
                      <div className="h-2 w-1/2 bg-gray-200 rounded" />
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setPreviewMode('dark')}
                    className={cn(
                      'p-4 rounded-xl border-2 cursor-pointer transition-all bg-gray-900',
                      previewMode === 'dark' ? 'border-green-500' : 'border-gray-700'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Moon className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">Modo Escuro</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-3/4 bg-gray-700 rounded" />
                      <div className="h-2 w-1/2 bg-gray-700 rounded" />
                    </div>
                  </motion.div>
                </div>
              </div>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-6">
              {/* Primary Color */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Cor Principal</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {colorPresets.map((color) => (
                    <motion.button
                      key={color.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updateSetting('primaryColor', color.primary)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                        settings.primaryColor === color.primary
                          ? 'border-primary shadow-lg'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full bg-gradient-to-br shadow-md',
                        color.gradient
                      )} />
                      <span className="text-xs font-medium">{color.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Custom Color */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Cor Personalizada</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cor selecionada</p>
                    <p className="text-xs text-muted-foreground">{settings.primaryColor}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="space-y-6">
              {/* Font Size */}
              <div className="space-y-4">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Tamanho da Fonte
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {fontSizes.map((size) => (
                    <motion.button
                      key={size.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => updateSetting('fontSize', size.value)}
                      className={cn(
                        'p-3 rounded-xl border-2 transition-all text-center',
                        settings.fontSize === size.value
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-border hover:border-green-300'
                      )}
                    >
                      <span style={{ fontSize: `${size.scale}rem` }} className="font-medium">
                        Aa
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{size.name}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div className="space-y-4">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Estilo de Bordas
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {radiusStyles.map((radius) => (
                    <motion.button
                      key={radius.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => updateSetting('borderRadius', radius.value)}
                      className={cn(
                        'p-3 transition-all text-center',
                        settings.borderRadius === radius.value
                          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                          : 'bg-muted/50 border-2 border-border hover:border-green-300'
                      )}
                      style={{ borderRadius: radius.radius }}
                    >
                      <div 
                        className="w-6 h-6 bg-green-500 mx-auto mb-2"
                        style={{ borderRadius: radius.radius }}
                      />
                      <p className="text-xs">{radius.name}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="space-y-0.5">
                  <Label className="font-medium">Modo Compacto</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduz o espaçamento entre elementos
                  </p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => updateSetting('compactMode', checked)}
                />
              </div>
            </TabsContent>

            {/* Accessibility Tab */}
            <TabsContent value="accessibility" className="space-y-6">
              {/* Reduced Motion */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30"
                    animate={settings.reducedMotion ? {} : { rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-5 w-5 text-purple-500" />
                  </motion.div>
                  <div className="space-y-0.5">
                    <Label className="font-medium">Reduzir Movimento</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimiza animações e transições
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.reducedMotion}
                  onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
                />
              </div>

              {/* High Contrast */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <Eye className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="font-medium">Alto Contraste</Label>
                    <p className="text-sm text-muted-foreground">
                      Aumenta o contraste para melhor legibilidade
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.highContrast}
                  onCheckedChange={(checked) => updateSetting('highContrast', checked)}
                />
              </div>

              {/* Sound Settings */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Volume2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="font-medium">Sons do Sistema</Label>
                    <p className="text-sm text-muted-foreground">
                      Reproduz sons para notificações e ações
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
                />
              </div>

              {/* Notification Sound */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Bell className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="font-medium">Som de Notificação</Label>
                    <p className="text-sm text-muted-foreground">
                      Escolha o som para alertas
                    </p>
                  </div>
                </div>
                <select
                  value={settings.notificationSound}
                  onChange={(e) => updateSetting('notificationSound', e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="default">Padrão</option>
                  <option value="gentle">Suave</option>
                  <option value="alert">Alerta</option>
                  <option value="none">Silencioso</option>
                </select>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Mini variant for sidebar
export function ThemeCustomizerMini() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    const savedSettings = localStorage.getItem('agendazap-theme-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setTheme(parsed.theme || 'system')
      } catch {
        // Use default
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cycleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
    
    // Apply theme
    const root = document.documentElement
    if (nextTheme === 'dark') {
      root.classList.add('dark')
    } else if (nextTheme === 'light') {
      root.classList.remove('dark')
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    // Save
    const savedSettings = localStorage.getItem('agendazap-theme-settings')
    const settings = savedSettings ? JSON.parse(savedSettings) : {}
    settings.theme = nextTheme
    localStorage.setItem('agendazap-theme-settings', JSON.stringify(settings))
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={cycleTheme}
      className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
    >
      {theme === 'light' ? (
        <Sun className="h-4 w-4 text-amber-500" />
      ) : theme === 'dark' ? (
        <Moon className="h-4 w-4 text-blue-400" />
      ) : (
        <Monitor className="h-4 w-4 text-muted-foreground" />
      )}
    </motion.button>
  )
}
