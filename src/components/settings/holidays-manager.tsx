'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Trash2, Clock, Sun, Coffee, PartyPopper, Heart, Star, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getStoredAccountId } from '@/hooks/use-data'

interface Holiday {
  id: string
  name: string
  date: string
  type: 'holiday' | 'vacation' | 'blocked'
  recurring: boolean
  allDay: boolean
  notes?: string | null
}

const holidayIcons: Record<string, typeof Sun> = {
  holiday: PartyPopper,
  vacation: Coffee,
  blocked: X,
}

const holidayColors: Record<string, string> = {
  holiday: 'bg-purple-500/10 text-purple-600 border-purple-200',
  vacation: 'bg-orange-500/10 text-orange-600 border-orange-200',
  blocked: 'bg-red-500/10 text-red-600 border-red-200',
}

const holidayLabels: Record<string, string> = {
  holiday: 'Feriado',
  vacation: 'Férias',
  blocked: 'Bloqueado',
}

export function HolidaysManager() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'holiday' as Holiday['type'],
    recurring: false,
    allDay: true,
    notes: ''
  })

  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = getStoredAccountId()
    setAccountId(id)
  }, [])

  const fetchHolidays = useCallback(async () => {
    if (!accountId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/holidays?accountId=${accountId}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch holidays')
      
      const data = await response.json()
      const transformedHolidays = (data.holidays || []).map((holiday: any) => ({
        id: holiday.id,
        name: holiday.description || 'Sem nome',
        date: holiday.date,
        type: holiday.type || 'holiday',
        recurring: holiday.isRecurring,
        allDay: true,
        notes: holiday.notes
      }))
      setHolidays(transformedHolidays)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching holidays:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  const handleAdd = async () => {
    if (!formData.name || !formData.date) {
      toast.error('Preencha o nome e a data')
      return
    }

    if (!accountId) {
      toast.error('Account ID não encontrado')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accountId,
          date: formData.date,
          description: formData.name,
          isRecurring: formData.recurring,
          type: formData.type
        })
      })

      if (!response.ok) throw new Error('Failed to create holiday')

      toast.success('Data especial adicionada!')
      setIsDialogOpen(false)
      setFormData({
        name: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'holiday',
        recurring: false,
        allDay: true,
        notes: ''
      })
      fetchHolidays()
    } catch (err) {
      toast.error('Erro ao adicionar data especial')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/holidays?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to delete holiday')

      toast.success('Data removida')
      fetchHolidays()
    } catch (err) {
      toast.error('Erro ao remover data')
      console.error(err)
    }
  }

  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  // No account state
  if (!accountId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">Conta não encontrada</h3>
        <p className="text-muted-foreground text-sm">Faça login para gerenciar datas especiais</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <Calendar className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium mb-1">Erro ao carregar datas</h3>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Button onClick={fetchHolidays}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Holidays */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Próximos Dias Especiais
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {upcomingHolidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum dia especial cadastrado</p>
                <p className="text-sm">Clique em "Adicionar" para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingHolidays.map((holiday, index) => {
                  const Icon = holidayIcons[holiday.type]
                  const holidayDate = new Date(holiday.date)
                  return (
                    <motion.div
                      key={holiday.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-md group',
                        holidayColors[holiday.type]
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        holidayColors[holiday.type]
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{holiday.name}</p>
                          {holiday.recurring && (
                            <Badge variant="secondary" className="text-xs">Recorrente</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(holidayDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('capitalize', holidayColors[holiday.type])}>
                        {holidayLabels[holiday.type]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(holiday.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* All Holidays List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Todos os Dias Especiais</CardTitle>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma data especial cadastrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map((holiday) => {
                const Icon = holidayIcons[holiday.type]
                return (
                  <div
                    key={holiday.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Icon className={cn('w-4 h-4', holidayColors[holiday.type].split(' ')[1])} />
                    <span className="flex-1 font-medium">{holiday.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(holiday.date), 'dd/MM/yyyy')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {holidayLabels[holiday.type]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(holiday.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Holiday Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Dia Especial</DialogTitle>
            <DialogDescription>
              Adicione feriados, férias ou bloqueios no calendário
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Natal, Férias, Manutenção..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: Holiday['type']) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">🎉 Feriado</SelectItem>
                    <SelectItem value="vacation">☕ Férias</SelectItem>
                    <SelectItem value="blocked">🚫 Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Recorrente</Label>
                <p className="text-xs text-muted-foreground">
                  Repetir todos os anos
                </p>
              </div>
              <Switch
                checked={formData.recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, recurring: checked })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Input
                placeholder="Observações opcionais..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAdd} 
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
