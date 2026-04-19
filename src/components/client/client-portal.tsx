'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, Clock, MapPin, CreditCard, Package, Gift, Star,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface ClientAppointment {
  id: string
  datetime: string
  endTime: string
  status: string
  Service: { name: string; durationMinutes: number; price: number }
  Professional: { name: string }
  account: { businessName: string; address?: string; phone: string }
}

interface ClientData {
  id: string
  name: string
  email?: string
  phone: string
  loyaltyPoints: number
  totalAppointments: number
}

interface ClientPackage {
  id: string
  Package: { name: string; description?: string }
  expiryDate: string
  totalSessions: number
  usedSessions: number
  status: string
}

export function ClientPortal() {
  const [activeTab, setActiveTab] = useState('appointments')
  const [isLoading, setIsLoading] = useState(true)
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [appointments, setAppointments] = useState<ClientAppointment[]>([])
  const [packages, setPackages] = useState<ClientPackage[]>([])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setClientData({
        id: '1', name: 'Maria Silva', email: 'maria@email.com',
        phone: '(11) 99999-0000', loyaltyPoints: 350, totalAppointments: 12
      })
      
      setAppointments([
        { id: '1', datetime: '2025-01-20T10:00:00', endTime: '2025-01-20T11:00:00', status: 'confirmed',
          Service: { name: 'Corte Feminino', durationMinutes: 60, price: 80 },
          Professional: { name: 'Ana Paula' },
          account: { businessName: 'Salão Beleza Total', address: 'Rua das Flores, 123', phone: '(11) 3333-0000' }
        },
        { id: '2', datetime: '2025-01-25T14:00:00', endTime: '2025-01-25T15:30:00', status: 'pending',
          Service: { name: 'Manicure + Pedicure', durationMinutes: 90, price: 60 },
          Professional: { name: 'Carla Santos' },
          account: { businessName: 'Salão Beleza Total', address: 'Rua das Flores, 123', phone: '(11) 3333-0000' }
        },
        { id: '3', datetime: '2025-01-10T09:00:00', endTime: '2025-01-10T10:00:00', status: 'completed',
          Service: { name: 'Hidratação', durationMinutes: 60, price: 50 },
          Professional: { name: 'Ana Paula' },
          account: { businessName: 'Salão Beleza Total', address: 'Rua das Flores, 123', phone: '(11) 3333-0000' }
        }
      ])
      
      setPackages([
        { id: '1', Package: { name: 'Pacote Beleza', description: '5 sessões de corte + hidratação' },
          expiryDate: '2025-07-01', totalSessions: 5, usedSessions: 2, status: 'active' }
      ])
      
      setIsLoading(false)
    }
    loadData()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Confirmado</Badge>
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
      case 'completed': return <Badge className="bg-blue-500/10 text-blue-600"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const upcomingAppointments = appointments.filter(a => ['pending', 'confirmed'].includes(a.status))
  const pastAppointments = appointments.filter(a => a.status === 'completed')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Meus Agendamentos</h1>
            <p className="text-xs text-muted-foreground">Portal do Cliente</p>
          </div>
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
                <div className="p-3 text-center"><p className="text-xl font-bold text-blue-600">{packages.length}</p><p className="text-xs text-muted-foreground">Pacotes</p></div>
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
                <Card className="p-6 text-center"><Calendar className="w-10 h-10 mx-auto text-muted-foreground opacity-50 mb-2" /><p className="text-muted-foreground">Nenhum agendamento</p></Card>
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
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(apt.datetime)} às {formatTime(apt.datetime)}</span>
                        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />R$ {apt.Service.price.toFixed(2)}</span>
                      </div>
                    </CardContent></Card>
                  </motion.div>
                ))}</div>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-600" />Histórico</h3>
              {pastAppointments.length === 0 ? (
                <Card className="p-6 text-center"><p className="text-muted-foreground">Nenhum histórico</p></Card>
              ) : (
                <div className="space-y-2">{pastAppointments.map(apt => (
                  <Card key={apt.id} className="opacity-80"><CardContent className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{apt.Service.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(apt.datetime)}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(apt.status)}
                      <p className="text-xs text-muted-foreground mt-1">R$ {apt.Service.price.toFixed(2)}</p>
                    </div>
                  </CardContent></Card>
                ))}</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-purple-600" />Meus Pacotes</h3>
            {packages.length === 0 ? (
              <Card className="p-8 text-center"><Package className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" /><p className="text-muted-foreground">Você não possui pacotes</p></Card>
            ) : (
              <div className="space-y-3">{packages.map((pkg, i) => {
                const progress = (pkg.usedSessions / pkg.totalSessions) * 100
                return (
                  <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className={cn(pkg.status === 'expired' && "opacity-60")}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{pkg.Package.name}</CardTitle>
                          <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>{pkg.status === 'active' ? 'Ativo' : 'Expirado'}</Badge>
                        </div>
                        {pkg.Package.description && <CardDescription>{pkg.Package.description}</CardDescription>}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sessões</span><span>{pkg.totalSessions - pkg.usedSessions} de {pkg.totalSessions}</span></div>
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
                    <p className="text-sm opacity-80">= R$ {(clientData.loyaltyPoints / 100).toFixed(2)} em descontos</p>
                  </CardContent>
                </Card>
                <Card><CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><span className="text-emerald-600 font-bold text-sm">1</span></div>
                    <div><p className="font-medium text-sm">Ganhe pontos</p><p className="text-xs text-muted-foreground">1 ponto por R$ gasto</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-blue-600 font-bold text-sm">2</span></div>
                    <div><p className="font-medium text-sm">Acumule</p><p className="text-xs text-muted-foreground">Junte pontos a cada visita</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><span className="text-amber-600 font-bold text-sm">3</span></div>
                    <div><p className="font-medium text-sm">Resgate</p><p className="text-xs text-muted-foreground">100 pontos = R$ 1,00 de desconto</p></div>
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
