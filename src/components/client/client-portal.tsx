'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, Clock, MapPin, CreditCard, Package, Gift, Star,
  CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, QrCode
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'

interface ClientAppointment {
  id: string
  datetime: string
  endTime: string
  status: string
  price: number | null
  pixQrCode: string | null
  pixPaid: boolean
  pixExpiresAt: string | null
  Service: { name: string; durationMinutes: number; price: number }
  Professional: { name: string }
  Account: { businessName: string; address?: string; whatsappNumber?: string }
}

interface ClientData {
  id: string
  name: string
  email?: string
  phone: string
  loyaltyPoints: number
  totalAppointments: number
  noShowCount: number
}

interface AccountData {
  id: string
  businessName: string
  address?: string
  phone: string
}

interface ClientPackage {
  id: string
  Package: { name: string; description?: string }
  expiryDate: string
  totalSessions: number
  usedSessions: number
  status: string
  remainingSessions: number
  progress: number
  isExpired: boolean
}

interface LoyaltyData {
  client: { id: string; name: string; loyaltyPoints: number }
  program: { pointsPerReal: number; redemptionRate: number; minimumPoints: number; maxDiscountPercent: number } | null
  availableDiscount: number
  canRedeem: boolean
  transactions: { id: string; points: number; type: string; description: string | null; createdAt: string }[]
}

export function ClientPortal() {
  const [activeTab, setActiveTab] = useState('appointments')
  const [isLoading, setIsLoading] = useState(true)
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<ClientAppointment[]>([])
  const [packages, setPackages] = useState<ClientPackage[]>([])
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadAllData = async () => {
    try {
      setError(null)

      // Step 1: Get client identity from /api/client-portal/me
      const meResponse = await authFetch('/api/client-portal/me')
      if (!meResponse.ok) {
        if (meResponse.status === 401) {
          setError('Sessão expirada. Faça login novamente.')
          return
        }
        throw new Error('Erro ao carregar dados do cliente')
      }

      const meData = await meResponse.json()
      const client = meData.client as ClientData
      const account = meData.account as AccountData
      const accId = meData.accountId as string

      setClientData(client)
      setAccountData(account)
      setAccountId(accId)

      // Step 2: Load appointments, packages, and loyalty in parallel
      const [appointmentsRes, packagesRes, loyaltyRes] = await Promise.allSettled([
        authFetch(`/api/appointments?accountId=${accId}&clientId=${client.id}`),
        authFetch(`/api/packages/client?accountId=${accId}&clientId=${client.id}`),
        authFetch(`/api/loyalty/points?accountId=${accId}&clientId=${client.id}`),
      ])

      // Process appointments
      if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value.ok) {
        const appointmentsData = await appointmentsRes.value.json()
        const appts = (appointmentsData.appointments || []).map((apt: any) => ({
          id: apt.id,
          datetime: apt.datetime,
          endTime: apt.endTime,
          status: apt.status,
          price: apt.price ?? apt.Service?.price ?? 0,
          pixQrCode: apt.pixQrCode,
          pixPaid: apt.pixPaid ?? false,
          pixExpiresAt: apt.pixExpiresAt,
          Service: apt.Service || { name: 'Serviço', durationMinutes: 30, price: 0 },
          Professional: apt.Professional || { name: 'Profissional' },
          Account: apt.Account || { businessName: account?.businessName || '', address: '', whatsappNumber: '' },
        }))
        setAppointments(appts)
      } else {
        console.error('Error loading appointments:', appointmentsRes)
        setAppointments([])
      }

      // Process packages
      if (packagesRes.status === 'fulfilled' && packagesRes.value.ok) {
        const packagesData = await packagesRes.value.json()
        const pkgs = Array.isArray(packagesData) ? packagesData : (packagesData.packages || [])
        setPackages(pkgs)
      } else {
        console.error('Error loading packages:', packagesRes)
        setPackages([])
      }

      // Process loyalty
      if (loyaltyRes.status === 'fulfilled' && loyaltyRes.value.ok) {
        const loyaltyResult = await loyaltyRes.value.json()
        setLoyaltyData(loyaltyResult)
      } else {
        console.error('Error loading loyalty:', loyaltyRes)
        setLoyaltyData(null)
      }
    } catch (err) {
      console.error('Error loading client portal data:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      toast.error('Erro ao carregar seus dados')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadAllData()
    toast.success('Dados atualizados!')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Confirmado</Badge>
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
      case 'completed': return <Badge className="bg-blue-500/10 text-blue-600"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>
      case 'no_show': return <Badge className="bg-red-500/10 text-red-600"><XCircle className="w-3 h-3 mr-1" />Não Compareceu</Badge>
      case 'cancelled': return <Badge className="bg-gray-500/10 text-gray-600"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPixStatusBadge = (apt: ClientAppointment) => {
    if (!apt.pixQrCode) return null

    if (apt.pixPaid) {
      return (
        <Badge className="bg-green-500/10 text-green-600 text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />PIX Pago
        </Badge>
      )
    }

    const isExpired = apt.pixExpiresAt && new Date(apt.pixExpiresAt) < new Date()
    if (isExpired) {
      return (
        <Badge className="bg-red-500/10 text-red-600 text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />PIX Expirado
        </Badge>
      )
    }

    return (
      <Badge className="bg-amber-500/10 text-amber-600 text-xs">
        <QrCode className="w-3 h-3 mr-1" />PIX Pendente
      </Badge>
    )
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const upcomingAppointments = appointments.filter(a => ['pending', 'confirmed'].includes(a.status))
  const pastAppointments = appointments.filter(a => ['completed', 'no_show', 'cancelled'].includes(a.status))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    )
  }

  if (error && !clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-lg font-medium text-red-600">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Meus Agendamentos</h1>
              <p className="text-xs text-muted-foreground">
                {accountData?.businessName || 'Portal do Cliente'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {clientData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white">
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14 bg-white/20 border-2 border-white/30">
                    <AvatarFallback className="bg-transparent text-white text-lg font-bold">
                      {clientData.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold">{clientData.name}</h2>
                    <p className="text-white/80 text-sm">{clientData.email || clientData.phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-300" />
                      <span className="text-xl font-bold">{clientData.loyaltyPoints}</span>
                    </div>
                    <p className="text-xs text-white/80">pontos</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x">
                <div className="p-3 text-center"><p className="text-xl font-bold text-emerald-600">{clientData.totalAppointments}</p><p className="text-xs text-muted-foreground">Agendamentos</p></div>
                <div className="p-3 text-center"><p className="text-xl font-bold text-blue-600">{packages.filter(p => p.status === 'active').length}</p><p className="text-xs text-muted-foreground">Pacotes</p></div>
                <div className="p-3 text-center"><p className="text-xl font-bold text-amber-600">{clientData.loyaltyPoints}</p><p className="text-xs text-muted-foreground">Pontos</p></div>
              </div>
            </Card>
          </motion.div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="appointments" className="gap-2"><Calendar className="w-4 h-4" />Agendamentos</TabsTrigger>
            <TabsTrigger value="packages" className="gap-2"><Package className="w-4 h-4" />Pacotes</TabsTrigger>
            <TabsTrigger value="loyalty" className="gap-2"><Gift className="w-4 h-4" />Fidelidade</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-600" />Próximos</h3>
              {upcomingAppointments.length === 0 ? (
                <Card className="p-6 text-center">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-muted-foreground">Nenhum agendamento futuro</p>
                  <p className="text-xs text-muted-foreground mt-1">Seus próximos agendamentos aparecerão aqui</p>
                </Card>
              ) : (
                <div className="space-y-3">{upcomingAppointments.map((apt, i) => (
                  <motion.div key={apt.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card><CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{apt.Service.name}</p>
                          <p className="text-sm text-muted-foreground">com {apt.Professional.name}</p>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(apt.datetime)} às {formatTime(apt.datetime)}</span>
                        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />R$ {(apt.price ?? apt.Service.price).toFixed(2)}</span>
                      </div>
                      {apt.pixQrCode && (
                        <div className="mt-2 flex items-center gap-2">
                          {getPixStatusBadge(apt)}
                        </div>
                      )}
                    </CardContent></Card>
                  </motion.div>
                ))}</div>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-600" />Histórico</h3>
              {pastAppointments.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">Nenhum histórico</p>
                  <p className="text-xs text-muted-foreground mt-1">Seus agendamentos concluídos aparecerão aqui</p>
                </Card>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">{pastAppointments.map(apt => (
                  <Card key={apt.id} className="opacity-80"><CardContent className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{apt.Service.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(apt.datetime)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      {getStatusBadge(apt.status)}
                      <p className="text-xs text-muted-foreground">R$ {(apt.price ?? apt.Service.price).toFixed(2)}</p>
                      {apt.pixQrCode && <div>{getPixStatusBadge(apt)}</div>}
                    </div>
                  </CardContent></Card>
                ))}</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-purple-600" />Meus Pacotes</h3>
            {packages.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                <p className="text-muted-foreground">Você não possui pacotes</p>
                <p className="text-xs text-muted-foreground mt-1">Pacotes adquiridos aparecerão aqui</p>
              </Card>
            ) : (
              <div className="space-y-3">{packages.map((pkg, i) => {
                const progress = pkg.progress ?? (pkg.totalSessions > 0 ? Math.round((pkg.usedSessions / pkg.totalSessions) * 100) : 0)
                const remaining = pkg.remainingSessions ?? (pkg.totalSessions - pkg.usedSessions)
                const isExpired = pkg.isExpired || pkg.status === 'expired'
                return (
                  <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className={cn(isExpired && "opacity-60")}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{pkg.Package.name}</CardTitle>
                          <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                            {pkg.status === 'active' ? 'Ativo' : pkg.status === 'used' ? 'Utilizado' : 'Expirado'}
                          </Badge>
                        </div>
                        {pkg.Package.description && <CardDescription>{pkg.Package.description}</CardDescription>}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sessões</span><span>{remaining} de {pkg.totalSessions}</span></div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">Válido até {formatDate(pkg.expiryDate)}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}</div>
            )}
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-6">
            <h3 className="font-semibold flex items-center gap-2"><Gift className="w-5 h-5 text-amber-600" />Programa de Fidelidade</h3>
            {clientData && (
              <>
                <Card className="overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm opacity-80 mb-1">Seus Pontos</p>
                    <p className="text-5xl font-bold mb-2">{clientData.loyaltyPoints}</p>
                    {loyaltyData?.program && (
                      <p className="text-sm opacity-80">= R$ {(clientData.loyaltyPoints / loyaltyData.program.redemptionRate).toFixed(2)} em descontos</p>
                    )}
                    {loyaltyData?.canRedeem && (
                      <p className="text-sm mt-2 bg-white/20 rounded-full px-3 py-1 inline-block">
                        ✓ Pontos suficientes para resgate!
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Loyalty Transactions */}
                {loyaltyData?.transactions && loyaltyData.transactions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Histórico de Pontos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                      {loyaltyData.transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">
                              {tx.type === 'earn' ? 'Ganho' : tx.type === 'redeem' ? 'Resgate' : tx.type === 'bonus' ? 'Bônus' : tx.type === 'expire' ? 'Expirado' : tx.type}
                            </p>
                            {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
                          </div>
                          <span className={cn(
                            'text-sm font-medium',
                            tx.points > 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {tx.points > 0 ? '+' : ''}{tx.points} pts
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card><CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><span className="text-emerald-600 font-bold text-sm">1</span></div>
                    <div><p className="font-medium text-sm">Ganhe pontos</p><p className="text-xs text-muted-foreground">{loyaltyData?.program ? `${loyaltyData.program.pointsPerReal} ponto(s) por R$ gasto` : '1 ponto por R$ gasto'}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-blue-600 font-bold text-sm">2</span></div>
                    <div><p className="font-medium text-sm">Acumule</p><p className="text-xs text-muted-foreground">Junte pontos a cada visita</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><span className="text-amber-600 font-bold text-sm">3</span></div>
                    <div><p className="font-medium text-sm">Resgate</p><p className="text-xs text-muted-foreground">{loyaltyData?.program ? `${loyaltyData.program.minimumPoints} pontos mínimos = R$ ${(1 / loyaltyData.program.redemptionRate).toFixed(2)} de desconto` : '100 pontos = R$ 1,00 de desconto'}</p></div>
                  </div>
                </CardContent></Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="grid grid-cols-3">
          {[
            { id: 'appointments', icon: Calendar, label: 'Agendamentos' },
            { id: 'packages', icon: Package, label: 'Pacotes' },
            { id: 'loyalty', icon: Gift, label: 'Fidelidade' }
          ].map(tab => (
            <Button key={tab.id} variant="ghost" className={cn('flex-col py-3 h-auto rounded-none', activeTab === tab.id && 'text-emerald-600 bg-emerald-50')} onClick={() => setActiveTab(tab.id)}>
              <tab.icon className="w-5 h-5" /><span className="text-xs mt-1">{tab.label}</span>
            </Button>
          ))}
        </div>
      </nav>
    </div>
  )
}
