'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/auth-fetch'

interface RevenueChartProps {
  accountId?: string | null
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#6B7280', '#EC4899', '#14B8A6']

export function RevenueChart({ accountId }: RevenueChartProps) {
  const [data, setData] = useState<{ name: string; receita: number; agendamentos: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const result = await response.json()
          // Use chart data from the API response
          if (result.chartData?.weeklyRevenue) {
            setData(result.chartData.weeklyRevenue)
          }
        }
      } catch (error) {
        console.error('Error fetching revenue data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            Receita e Agendamentos (Semana)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            Receita e Agendamentos (Semana)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">Sem dados de receita</p>
            <p className="text-sm">Os dados aparecerão conforme os agendamentos forem concluídos</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-500" />
          Receita e Agendamentos (Semana)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'receita') return [`R$ ${value.toFixed(2)}`, 'Receita']
                  return [value, 'Agendamentos']
                }}
              />
              <Bar dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} name="Receita (R$)" />
              <Bar dataKey="agendamentos" fill="#6B7280" radius={[4, 4, 0, 0]} name="Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function NoShowTrendChart({ accountId }: RevenueChartProps) {
  const [data, setData] = useState<{ month: string; rate: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const result = await response.json()
          // Use no-show trend chart data from the API response
          if (result.chartData?.noShowTrend) {
            setData(result.chartData.noShowTrend)
          }
        }
      } catch (error) {
        console.error('Error fetching no-show trend:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-amber-500" />
            Tendência de No-Show
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-amber-500" />
            Tendência de No-Show
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <LineChartIcon className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">Sem dados suficientes</p>
            <p className="text-sm">A tendência aparecerá com mais histórico</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon className="w-5 h-5 text-amber-500" />
          Tendência de No-Show
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 15]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value}%`, 'Taxa']}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ fill: '#F59E0B', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function ServiceDistributionChart({ accountId }: RevenueChartProps) {
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!accountId) {
        setLoading(false)
        return
      }

      try {
        // Use the stats endpoint which now includes service distribution from actual appointments
        const response = await authFetch(`/api/dashboard/stats?accountId=${accountId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.chartData?.serviceDistribution && result.chartData.serviceDistribution.length > 0) {
            setData(result.chartData.serviceDistribution)
          } else {
            // Fallback: fetch from services endpoint for services without appointments yet
            const servicesResponse = await authFetch(`/api/services?accountId=${accountId}`)
            if (servicesResponse.ok) {
              const servicesResult = await servicesResponse.json()
              const services = servicesResult.services || []
              const distribution = services.slice(0, 7).map((service: any, index: number) => ({
                name: service.name,
                value: service._count?.appointments || 0,
                color: COLORS[index % COLORS.length]
              }))
              setData(distribution)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching service distribution:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-purple-500" />
            Distribuição de Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-purple-500" />
            Distribuição de Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <PieChartIcon className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">Nenhum serviço cadastrado</p>
            <p className="text-sm">Cadastre serviços para ver a distribuição</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-purple-500" />
          Distribuição de Serviços
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value}`, 'Agendamentos']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
