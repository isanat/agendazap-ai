'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, Clock, MessageSquare, Plus, Trash2, Edit, 
  Check, X, Sparkles, Send, Eye, Copy, Info,
  ChevronDown, ChevronUp, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ReminderTemplate {
  id: string
  name: string
  triggerTime: number // hours before appointment
  triggerType: 'hours_before' | 'day_before' | 'week_before'
  message: string
  isActive: boolean
  channels: ('whatsapp' | 'sms' | 'email')[]
  includeConfirmationLink: boolean
}

// Default templates
const defaultTemplates: ReminderTemplate[] = [
  {
    id: '1',
    name: 'Lembrete 24h',
    triggerTime: 24,
    triggerType: 'hours_before',
    message: 'Olá {cliente}! 👋\n\nLembramos que você tem um agendamento amanhã:\n📅 {data} às {hora}\n💇 {servico} com {profissional}\n\nConfirme respondendo SIM ou cancele respondendo NÃO.\n\nAté logo! ✨',
    isActive: true,
    channels: ['whatsapp'],
    includeConfirmationLink: true
  },
  {
    id: '2',
    name: 'Lembrete 2h',
    triggerTime: 2,
    triggerType: 'hours_before',
    message: 'Oi {cliente}! ⏰\n\nSeu agendamento é em 2 horas:\n💇 {servico}\n📍 Estamos te esperando!\n\nPrecisando de algo, é só chamar. 📱',
    isActive: true,
    channels: ['whatsapp'],
    includeConfirmationLink: false
  },
  {
    id: '3',
    name: 'Confirmação 1 semana',
    triggerTime: 168,
    triggerType: 'week_before',
    message: 'Olá {cliente}! 🌟\n\nVocê tem um agendamento marcado para:\n📅 {data} às {hora}\n💇 {servico}\n\nConfirme sua presença respondendo esta mensagem!\n\nAté lá! 💫',
    isActive: false,
    channels: ['whatsapp'],
    includeConfirmationLink: true
  }
]

// Available variables for message templates
const availableVariables = [
  { name: 'cliente', description: 'Nome do cliente' },
  { name: 'data', description: 'Data do agendamento' },
  { name: 'hora', description: 'Horário do agendamento' },
  { name: 'servico', description: 'Nome do serviço' },
  { name: 'profissional', description: 'Nome do profissional' },
  { name: 'valor', description: 'Valor do serviço' },
  { name: 'duracao', description: 'Duração do serviço' },
  { name: 'endereco', description: 'Endereço do estabelecimento' },
]

export function ReminderSettings() {
  const [templates, setTemplates] = useState<ReminderTemplate[]>(defaultTemplates)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const [formData, setFormData] = useState<Partial<ReminderTemplate>>({
    name: '',
    triggerTime: 24,
    triggerType: 'hours_before',
    message: '',
    isActive: true,
    channels: ['whatsapp'],
    includeConfirmationLink: true
  })

  const handleToggleTemplate = (id: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    ))
    toast.success('Status do lembrete atualizado')
  }

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success('Lembrete removido')
  }

  const handleEditTemplate = (template: ReminderTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      triggerTime: template.triggerTime,
      triggerType: template.triggerType,
      message: template.message,
      isActive: template.isActive,
      channels: template.channels,
      includeConfirmationLink: template.includeConfirmationLink
    })
    setIsEditDialogOpen(true)
  }

  const handleAddTemplate = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      triggerTime: 24,
      triggerType: 'hours_before',
      message: 'Olá {cliente}! 👋\n\nLembrete do seu agendamento:\n📅 {data} às {hora}\n💇 {servico}\n\nAté logo! ✨',
      isActive: true,
      channels: ['whatsapp'],
      includeConfirmationLink: true
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveTemplate = () => {
    if (!formData.name || !formData.message) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (editingTemplate) {
      // Update existing
      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, ...formData } as ReminderTemplate
          : t
      ))
      toast.success('Lembrete atualizado com sucesso')
    } else {
      // Add new
      const newTemplate: ReminderTemplate = {
        id: Date.now().toString(),
        name: formData.name || '',
        triggerTime: formData.triggerTime || 24,
        triggerType: formData.triggerType || 'hours_before',
        message: formData.message || '',
        isActive: formData.isActive ?? true,
        channels: formData.channels || ['whatsapp'],
        includeConfirmationLink: formData.includeConfirmationLink ?? true
      }
      setTemplates(prev => [...prev, newTemplate])
      toast.success('Novo lembrete criado')
    }

    setIsEditDialogOpen(false)
  }

  const handlePreview = (message: string) => {
    // Replace variables with sample data
    let preview = message
      .replace(/{cliente}/g, 'Maria Silva')
      .replace(/{data}/g, '15/04/2025')
      .replace(/{hora}/g, '14:30')
      .replace(/{servico}/g, 'Corte + Hidratação')
      .replace(/{profissional}/g, 'Ana Paula')
      .replace(/{valor}/g, 'R$ 120,00')
      .replace(/{duracao}/g, '1h30min')
      .replace(/{endereco}/g, 'Rua das Flores, 123 - Centro')
    
    setPreviewMessage(preview)
    setIsPreviewOpen(true)
  }

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message)
    toast.success('Mensagem copiada!')
  }

  const insertVariable = (variable: string) => {
    const variableTag = `{${variable}}`
    setFormData(prev => ({
      ...prev,
      message: (prev.message || '') + variableTag
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Lembretes Automáticos
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure lembretes automáticos para seus clientes
          </p>
        </div>
        
        <Button onClick={handleAddTemplate} className="bg-gradient-to-r from-amber-500 to-orange-600">
          <Plus className="w-4 h-4 mr-1" />
          Novo Lembrete
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.filter(t => t.isActive).length}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.filter(t => t.channels.includes('whatsapp')).length}</p>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates List */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={cn(
                'transition-all hover:shadow-md',
                !template.isActive && 'opacity-60'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        template.isActive ? 'bg-green-500/10' : 'bg-gray-500/10'
                      )}>
                        <Bell className={cn(
                          'w-5 h-5',
                          template.isActive ? 'text-green-600' : 'text-gray-400'
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{template.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {template.triggerType === 'hours_before' && `${template.triggerTime}h antes`}
                            {template.triggerType === 'day_before' && '1 dia antes'}
                            {template.triggerType === 'week_before' && '1 semana antes'}
                          </Badge>
                          {template.channels.includes('whatsapp') && (
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                              WhatsApp
                            </Badge>
                          )}
                          {template.includeConfirmationLink && (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                              <Zap className="w-2.5 h-2.5 mr-0.5" />
                              Confirmação
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.message.substring(0, 100)}...
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={() => handleToggleTemplate(template.id)}
                      />
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePreview(template.message)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Lembrete' : 'Novo Lembrete'}
            </DialogTitle>
            <DialogDescription>
              Configure quando e como o lembrete será enviado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Lembrete</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Lembrete 24h"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Quando enviar</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value: 'hours_before' | 'day_before' | 'week_before') => 
                    setFormData(prev => ({ ...prev, triggerType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours_before">Horas antes</SelectItem>
                    <SelectItem value="day_before">Dia antes</SelectItem>
                    <SelectItem value="week_before">Semana antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {formData.triggerType === 'hours_before' && (
              <div className="space-y-2">
                <Label>Horas antes do agendamento</Label>
                <Input
                  type="number"
                  value={formData.triggerTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, triggerTime: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={168}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Digite sua mensagem..."
                className="min-h-[150px]"
              />
              
              {/* Variables */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {availableVariables.map((v) => (
                    <Button
                      key={v.name}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => insertVariable(v.name)}
                    >
                      {`{${v.name}}`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Incluir link de confirmação</Label>
                <p className="text-xs text-muted-foreground">
                  Adiciona botão para cliente confirmar presença
                </p>
              </div>
              <Switch
                checked={formData.includeConfirmationLink}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeConfirmationLink: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar este lembrete automaticamente
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="outline"
              onClick={() => handlePreview(formData.message || '')}
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button onClick={handleSaveTemplate} className="bg-gradient-to-r from-amber-500 to-orange-600">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-500" />
              Preview da Mensagem
            </DialogTitle>
            <DialogDescription>
              Como o cliente receberá a mensagem
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">WhatsApp</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => handleCopyMessage(previewMessage)}>
              <Copy className="w-4 h-4 mr-1" />
              Copiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
