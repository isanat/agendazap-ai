import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSalonTimezone, getNowInSalonTz, createDateInSalonTz } from '@/lib/booking-validation'

// GET - Get real dashboard statistics for an account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 })
    }

    // Get salon timezone for correct date boundaries
    const salonTimezone = await getSalonTimezone(accountId)
    const salonNow = getNowInSalonTz(salonTimezone)

    // Use salon timezone for all date calculations
    const now = salonNow.now
    const today = createDateInSalonTz(salonNow.isoDate, '00:00', salonTimezone)
    const tomorrowStart = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    // Calculate week start (Sunday) in salon timezone
    const salonDayOfWeek = salonNow.dayOfWeek // 0=Sun
    const weekStartIso = new Date(salonNow.now.getTime() - salonDayOfWeek * 24 * 60 * 60 * 1000)
    const startOfWeek = createDateInSalonTz(weekStartIso.toISOString().substring(0, 10), '00:00', salonTimezone)

    // Month boundaries in salon timezone
    const year = parseInt(salonNow.isoDate.substring(0, 4))
    const month = parseInt(salonNow.isoDate.substring(5, 7)) - 1
    const startOfMonth = createDateInSalonTz(`${year}-${String(month + 1).padStart(2, '0')}-01`, '00:00', salonTimezone)
    const startOfLastMonth = month === 0
      ? createDateInSalonTz(`${year - 1}-12-01`, '00:00', salonTimezone)
      : createDateInSalonTz(`${year}-${String(month).padStart(2, '0')}-01`, '00:00', salonTimezone)
    const endOfLastMonth = new Date(startOfMonth.getTime() - 1)

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

    // === CHART DATA ===

    // 1. Weekly revenue data (last 7 days)
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const weeklyRevenueData: { name: string; receita: number; agendamentos: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today)
      dayStart.setDate(today.getDate() - i)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const dayAppointments = await db.appointment.findMany({
        where: {
          accountId,
          status: 'completed',
          datetime: { gte: dayStart, lt: dayEnd }
        },
        include: {
          Service: { select: { price: true } }
        }
      })

      const dayRevenue = dayAppointments.reduce((sum, apt) => sum + (apt.Service?.price || 0), 0)
      const dayCount = await db.appointment.count({
        where: {
          accountId,
          datetime: { gte: dayStart, lt: dayEnd }
        }
      })

      weeklyRevenueData.push({
        name: dayLabels[dayStart.getDay()],
        receita: dayRevenue,
        agendamentos: dayCount
      })
    }

    // 2. Service distribution data (from appointments, not just service list)
    const serviceDistributionRaw = await db.appointment.groupBy({
      by: ['serviceId'],
      where: { accountId },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 7
    })

    // Fetch service names for the grouped data
    const serviceIds = serviceDistributionRaw.map(s => s.serviceId)
    const servicesInfo = await db.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true }
    })
    const serviceNameMap = new Map(servicesInfo.map(s => [s.id, s.name]))

    const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#6B7280', '#EC4899', '#14B8A6']
    const serviceDistributionData = serviceDistributionRaw.map((item, index) => ({
      name: serviceNameMap.get(item.serviceId) || 'Serviço',
      value: item._count.serviceId,
      color: COLORS[index % COLORS.length]
    }))

    // 3. No-show trend data (last 6 months)
    const noShowTrendData: { month: string; rate: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const monthNoShows = await db.appointment.count({
        where: {
          accountId,
          status: 'no_show',
          datetime: { gte: monthStart, lt: new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000) }
        }
      })
      const monthCompleted = await db.appointment.count({
        where: {
          accountId,
          status: 'completed',
          datetime: { gte: monthStart, lt: new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000) }
        }
      })
      const total = monthNoShows + monthCompleted
      const rate = total > 0 ? Math.round((monthNoShows / total) * 100) : 0

      noShowTrendData.push({
        month: monthStart.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        rate
      })
    }

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
      })),
      chartData: {
        weeklyRevenue: weeklyRevenueData,
        serviceDistribution: serviceDistributionData,
        noShowTrend: noShowTrendData
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas do dashboard' },
      { status: 500 }
    )
  }
}
