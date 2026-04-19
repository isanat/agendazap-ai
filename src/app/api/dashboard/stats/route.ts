import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get real dashboard statistics for an account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 })
    }

    // Get current date info
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Today's appointments
    const todayAppointments = await db.appointment.count({
      where: {
        accountId,
        datetime: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })

    // Week appointments
    const weekAppointments = await db.appointment.count({
      where: {
        accountId,
        datetime: {
          gte: startOfWeek,
          lt: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    })

    // Month appointments
    const monthAppointments = await db.appointment.count({
      where: {
        accountId,
        datetime: { gte: startOfMonth }
      }
    })

    // Last month appointments for comparison
    const lastMonthAppointments = await db.appointment.count({
      where: {
        accountId,
        datetime: {
          gte: startOfLastMonth,
          lt: endOfLastMonth
        }
      }
    })

    // Get completed appointments with service prices
    const completedAppointments = await db.appointment.findMany({
      where: {
        accountId,
        status: 'completed',
        datetime: { gte: startOfMonth }
      },
      include: {
        Service: {
          select: { price: true }
        }
      }
    })

    const monthRevenue = completedAppointments.reduce((sum, apt) => sum + (apt.Service?.price || 0), 0)

    // No-show stats
    const noShows = await db.appointment.count({
      where: { accountId, status: 'no_show' }
    })
    const completed = await db.appointment.count({
      where: { accountId, status: 'completed' }
    })
    const totalForNoShowRate = noShows + completed
    const noShowRate = totalForNoShowRate > 0 ? Math.round((noShows / totalForNoShowRate) * 100) : 0

    // Lost revenue from no-shows this month
    const noShowAppointments = await db.appointment.findMany({
      where: {
        accountId,
        status: 'no_show',
        datetime: { gte: startOfMonth }
      },
      include: {
        Service: { select: { price: true } }
      }
    })
    const lostRevenue = noShowAppointments.reduce((sum, apt) => sum + (apt.Service?.price || 0), 0)

    // Occupancy rate (simplified - based on working hours)
    const workingHoursPerWeek = 48
    const avgAppointmentDuration = 30
    const possibleAppointmentsPerWeek = (workingHoursPerWeek * 60) / avgAppointmentDuration
    const thisWeekAppointments = await db.appointment.count({
      where: {
        accountId,
        datetime: { gte: startOfWeek }
      }
    })
    const occupancyRate = Math.round((thisWeekAppointments / possibleAppointmentsPerWeek) * 100)

    // Total clients
    const totalClients = await db.client.count({
      where: { accountId }
    })

    // New clients this month
    const newClientsThisMonth = await db.client.count({
      where: {
        accountId,
        createdAt: { gte: startOfMonth }
      }
    })

    // Today's appointments with details
    const todayAppointmentsList = await db.appointment.findMany({
      where: {
        accountId,
        datetime: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      include: {
        Client: { select: { name: true } },
        Service: { select: { name: true, durationMinutes: true } },
        Professional: { select: { name: true } }
      },
      orderBy: { datetime: 'asc' }
    })

    // Recent activity
    const recentAppointments = await db.appointment.findMany({
      where: { accountId },
      include: {
        Client: { select: { name: true } },
        Service: { select: { name: true } },
        Professional: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // No-show alerts
    const noShowAlerts = await db.client.findMany({
      where: {
        accountId,
        noShowScore: { gte: 70 }
      },
      take: 5
    })

    // Recovered revenue
    const recoveredRevenue = await db.noShowFee.aggregate({
      where: {
        paid: true,
        Appointment: { accountId }
      },
      _sum: { amount: true }
    })

    // Growth rate
    const growthRate = lastMonthAppointments > 0
      ? Math.round(((monthAppointments - lastMonthAppointments) / lastMonthAppointments) * 100)
      : 0

    return NextResponse.json({
      stats: {
        todayAppointments,
        weekAppointments,
        monthAppointments,
        monthRevenue,
        noShowRate,
        lostRevenue,
        occupancyRate: Math.min(occupancyRate, 100),
        totalClients,
        newClientsThisMonth,
        growthRate,
        recoveredRevenue: recoveredRevenue._sum.amount || 0
      },
      todayAppointments: todayAppointmentsList.map(apt => ({
        id: apt.id,
        time: apt.datetime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        client: apt.Client?.name || 'Cliente',
        service: apt.Service?.name || 'Serviço',
        professional: apt.Professional?.name || 'Profissional',
        status: apt.status
      })),
      recentActivity: recentAppointments.map(apt => ({
        id: apt.id,
        type: apt.status === 'no_show' ? 'noshow' :
              apt.status === 'completed' ? 'completed' :
              apt.status === 'confirmed' ? 'appointment' : 'appointment',
        title: apt.status === 'no_show' ? 'No-Show Detectado' :
               apt.status === 'completed' ? 'Atendimento Concluído' : 'Novo Agendamento',
        description: `${apt.Client?.name || 'Cliente'} - ${apt.Service?.name || 'Serviço'}`,
        timestamp: apt.createdAt
      })),
      noShowAlerts: noShowAlerts.map(client => ({
        id: client.id,
        name: client.name,
        phone: client.phone,
        noShowScore: client.noShowScore
      }))
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas do dashboard' },
      { status: 500 }
    )
  }
}
