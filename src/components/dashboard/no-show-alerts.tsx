'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getStoredAccountId } from '@/hooks/use-data'
import { authFetch } from '@/lib/auth-fetch'

interface NoShowAlert {
  id: string
  clientName: string
  clientPhone: string
  noShowScore: number
  nextAppointment?: {
    date: string
    time: string
    serviceName: string
  }
  totalAppointments: number
  noShowCount: number
}

interface NoShowAlertsProps {
  accountId?: string | null
}

export function NoShowAlerts({ accountId }: NoShowAlertsProps) {
  const [alerts, setAlerts] = useState<NoShowAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    const effectiveAccountId = accountId || getStoredAccountId()
    if (!effectiveAccountId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch clients with high no-show scores and upcoming appointments
      const [clientsRes, appointmentsRes] = await Promise.all([
        fetch(`/api/clients?accountId=${effectiveAccountId}`),
        fetch(`/api/appointments?accountId=${effectiveAccountId}`)
      ])

      if (!clientsRes.ok || !appointmentsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const clientsData = await clientsRes.json()
      const appointmentsData = await appointmentsRes.json()

      // Filter clients with high no-show scores (>= 60)
      const highRiskClients = (clientsData.clients || [])
        .filter((client: any) => client.noShowScore >= 60)
        .map((client: any) => {
          // Find next appointment for this client
          const upcomingApt = (appointmentsData.appointments || [])
            .filter((apt: any) => 
              apt.clientId === client.id && 
              apt.status !== 'completed' && 
              apt.status !== 'cancelled' && 
              apt.status !== 'no_show' &&
              new Date(apt.datetime) >= new Date()
            )
            .sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())[0]

          return {
            id: client.id,
            clientName: client.name,
            clientPhone: client.phone,
            noShowScore: client.noShowScore,
            nextAppointment: upcomingApt ? {
              date: new Date(upcomingApt.datetime).toLocaleDateString('pt-BR'),
              time: new Date(upcomingApt.datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              serviceName: upcomingApt.service?.name || 'Serviço'
            } : undefined,
            totalAppointments: client.totalAppointments || 0,
            noShowCount: client.noShowCount || 0
          }
        })
        .slice(0, 5) // Limit to top 5

      setAlerts(highRiskClients)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching no-show alerts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Alertas de No-Show
            </CardTitle>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertas de No-Show
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <p>Erro ao carregar alertas</p>
            <Button variant="outline" size="sm" onClick={fetchAlerts} className="mt-2">
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertas de No-Show
          </CardTitle>
          <Badge variant="secondary">{alerts.length} clientes</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>Nenhum cliente com alto risco de no-show</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{alert.clientName}</h4>
                    <p className="text-sm text-muted-foreground">{alert.clientPhone}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-orange-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-semibold">{alert.noShowScore}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Risco de no-show</p>
                  </div>
                </div>
                
                {alert.nextAppointment && (
                  <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          Próximo: {alert.nextAppointment.date} às {alert.nextAppointment.time}
                        </span>
                      </div>
                      <Badge variant="outline">{alert.nextAppointment.serviceName}</Badge>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Histórico: {alert.noShowCount} no-shows em {alert.totalAppointments} agendamentos
                  </div>
                  <Button size="sm" variant="outline">
                    Cobrar Antecipado
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function RecentNoShows({ accountId }: NoShowAlertsProps) {
  const [recentNoShows, setRecentNoShows] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRecentNoShows = async () => {
      const effectiveAccountId = accountId || getStoredAccountId()
      if (!effectiveAccountId) {
        setIsLoading(false)
        return
      }

      try {
        const response = await authFetch(`/api/noshow-fees?accountId=${effectiveAccountId}`)
        if (response.ok) {
          const data = await response.json()
          // Get recent no-show fees
          const recent = (data.fees || [])
            .slice(0, 3)
            .map((fee: any) => ({
              client: fee.clientName,
              date: new Date(fee.datetime).toLocaleDateString('pt-BR'),
              time: new Date(fee.datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              fee: `R$ ${fee.amount.toFixed(2)}`,
              paid: fee.status === 'paid'
            }))
          setRecentNoShows(recent)
        }
      } catch (err) {
        console.error('Error fetching recent no-shows:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentNoShows()
  }, [accountId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            No-Shows Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          No-Shows Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentNoShows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>Nenhum no-show recente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentNoShows.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium">{item.client}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.date} às {item.time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.fee}</p>
                  <Badge variant={item.paid ? 'default' : 'destructive'} className="text-xs">
                    {item.paid ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
