import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

/**
 * GET /api/reports
 * Returns real statistics from the database for the reports page.
 * 
 * Query params:
 * - accountId (required): The account to get reports for
 * - period: week | month | quarter | year (default: month)
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)

    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const period = searchParams.get('period') || 'month'

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 })
    }

    // Verify access
    if (authUser.role !== 'superadmin' && authUser.accountId !== accountId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Calculate date ranges based on period
    const now = new Date()
    let periodStart: Date
    let previousPeriodStart: Date
    let previousPeriodEnd: Date

    switch (period) {
      case 'week':
        periodStart = new Date(now)
        periodStart.setDate(now.getDate() - now.getDay())
        periodStart.setHours(0, 0, 0, 0)
        previousPeriodStart = new Date(periodStart)
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7)
        previousPeriodEnd = new Date(periodStart)
        break
      case 'quarter':
        periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        previousPeriodStart = new Date(periodStart)
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 3)
        previousPeriodEnd = new Date(periodStart)
        break
      case 'year':
        periodStart = new Date(now.getFullYear(), 0, 1)
        previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1)
        previousPeriodEnd = new Date(periodStart)
        break
      case 'month':
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        previousPeriodEnd = new Date(periodStart)
        break
    }

    // --- Fetch all data in parallel ---

    // Current period appointments with service data
    const currentAppointments = await db.appointment.findMany({
      where: {
        accountId,
        datetime: { gte: periodStart },
      },
      include: {
        Service: { select: { name: true, price: true } },
        Client: { select: { id: true, name: true } },
        NoShowFee: true,
      },
    })

    // Previous period appointments for comparison
    const previousAppointments = await db.appointment.findMany({
      where: {
        accountId,
        datetime: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd,
        },
      },
      include: {
        Service: { select: { price: true } },
      },
    })

    // No-show fees for PIX recovery calculation
    const noShowFees = await db.noShowFee.findMany({
      where: {
        paid: true,
        Appointment: { accountId },
      },
      include: {
        Appointment: {
          select: { datetime: true }
        }
      },
    })

    // --- Calculate KPIs ---

    // Total revenue (sum of prices for completed/confirmed appointments)
    const revenueAppointments = currentAppointments.filter(
      a => a.status === 'completed' || a.status === 'confirmed'
    )
    const totalRevenue = revenueAppointments.reduce(
      (sum, apt) => sum + (apt.price ?? apt.Service?.price ?? 0), 0
    )

    // Previous period revenue
    const previousRevenueAppointments = previousAppointments.filter(
      a => a.status === 'completed' || a.status === 'confirmed'
    )
    const previousRevenue = previousRevenueAppointments.reduce(
      (sum, apt) => sum + (apt.price ?? apt.Service?.price ?? 0), 0
    )

    // Revenue growth rate
    const revenueGrowth = previousRevenue > 0
      ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
      : 0

    // Total appointments
    const totalAppointments = currentAppointments.length
    const previousTotalAppointments = previousAppointments.length
    const appointmentGrowth = previousTotalAppointments > 0
      ? Math.round(((totalAppointments - previousTotalAppointments) / previousTotalAppointments) * 100)
      : 0

    // Appointment count by status
    const appointmentsByStatus: Record<string, number> = {}
    currentAppointments.forEach(apt => {
      appointmentsByStatus[apt.status] = (appointmentsByStatus[apt.status] || 0) + 1
    })

    // No-show rate
    const noShowCount = appointmentsByStatus['no_show'] || 0
    const completedCount = appointmentsByStatus['completed'] || 0
    const totalForNoShowRate = noShowCount + completedCount
    const noShowRate = totalForNoShowRate > 0
      ? parseFloat(((noShowCount / totalForNoShowRate) * 100).toFixed(1))
      : 0

    // Previous no-show rate
    const previousNoShows = previousAppointments.filter(a => a.status === 'no_show').length
    const previousCompleted = previousAppointments.filter(a => a.status === 'completed').length
    const previousTotalForRate = previousNoShows + previousCompleted
    const previousNoShowRate = previousTotalForRate > 0
      ? ((previousNoShows / previousTotalForRate) * 100)
      : 0
    const noShowRateChange = previousNoShowRate > 0
      ? parseFloat((noShowRate - previousNoShowRate).toFixed(1))
      : 0

    // Lost revenue from no-shows
    const lostRevenue = currentAppointments
      .filter(a => a.status === 'no_show')
      .reduce((sum, apt) => sum + (apt.price ?? apt.Service?.price ?? 0), 0)

    // PIX recovery amount
    const pixRecoveryAmount = noShowFees
      .filter(fee => fee.Appointment && new Date(fee.Appointment.datetime) >= periodStart)
      .reduce((sum, fee) => sum + (fee.paid ? fee.amount : 0), 0)

    // --- Top Clients by Revenue ---
    const clientRevenueMap: Record<string, { name: string; revenue: number; visits: number }> = {}
    revenueAppointments.forEach(apt => {
      const clientId = apt.clientId
      if (!clientRevenueMap[clientId]) {
        clientRevenueMap[clientId] = {
          name: apt.Client?.name || 'Cliente',
          revenue: 0,
          visits: 0,
        }
      }
      clientRevenueMap[clientId].revenue += (apt.price ?? apt.Service?.price ?? 0)
      clientRevenueMap[clientId].visits += 1
    })
    const topClients = Object.entries(clientRevenueMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // --- Top Services by Bookings ---
    const serviceBookingsMap: Record<string, { name: string; count: number; revenue: number }> = {}
    currentAppointments.forEach(apt => {
      const serviceId = apt.serviceId
      if (!serviceBookingsMap[serviceId]) {
        serviceBookingsMap[serviceId] = {
          name: apt.Service?.name || 'Serviço',
          count: 0,
          revenue: 0,
        }
      }
      serviceBookingsMap[serviceId].count += 1
      serviceBookingsMap[serviceId].revenue += (apt.price ?? apt.Service?.price ?? 0)
    })
    const topServices = Object.entries(serviceBookingsMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // --- Weekly/Monthly Revenue Data for Charts ---
    const revenueChartData: { label: string; revenue: number; appointments: number }[] = []

    if (period === 'week') {
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      for (let d = 0; d < 7; d++) {
        const dayStart = new Date(periodStart)
        dayStart.setDate(periodStart.getDate() + d)
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 1)

        const dayAppointments = currentAppointments.filter(apt => {
          const aptDate = new Date(apt.datetime)
          return aptDate >= dayStart && aptDate < dayEnd
        })

        const dayRevenue = dayAppointments
          .filter(a => a.status === 'completed' || a.status === 'confirmed')
          .reduce((sum, apt) => sum + (apt.price ?? apt.Service?.price ?? 0), 0)

        revenueChartData.push({
          label: dayNames[d],
          revenue: dayRevenue,
          appointments: dayAppointments.length,
        })
      }
    } else {
      // Monthly breakdown for month/quarter/year
      const months = period === 'year' ? 12 : period === 'quarter' ? 3 : 1
      for (let m = 0; m < months; m++) {
        const monthStart = new Date(periodStart)
        monthStart.setMonth(periodStart.getMonth() + m)
        const monthEnd = new Date(monthStart)
        monthEnd.setMonth(monthEnd.getMonth() + 1)

        const monthAppointments = currentAppointments.filter(apt => {
          const aptDate = new Date(apt.datetime)
          return aptDate >= monthStart && aptDate < monthEnd
        })

        const monthRevenue = monthAppointments
          .filter(a => a.status === 'completed' || a.status === 'confirmed')
          .reduce((sum, apt) => sum + (apt.price ?? apt.Service?.price ?? 0), 0)

        revenueChartData.push({
          label: monthStart.toLocaleDateString('pt-BR', { month: 'short' }),
          revenue: monthRevenue,
          appointments: monthAppointments.length,
        })
      }
    }

    // --- No-show Trend (last 6 months) ---
    const noShowTrend: { month: string; rate: number }[] = []
    for (let m = 5; m >= 0; m--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - m, 1)
      const mEnd = new Date(mStart)
      mEnd.setMonth(mEnd.getMonth() + 1)

      const monthNoShows = await db.appointment.count({
        where: { accountId, status: 'no_show', datetime: { gte: mStart, lt: mEnd } }
      })
      const monthCompleted = await db.appointment.count({
        where: { accountId, status: 'completed', datetime: { gte: mStart, lt: mEnd } }
      })
      const totalForRate = monthNoShows + monthCompleted
      const rate = totalForRate > 0 ? parseFloat(((monthNoShows / totalForRate) * 100).toFixed(1)) : 0

      noShowTrend.push({
        month: mStart.toLocaleDateString('pt-BR', { month: 'short' }),
        rate,
      })
    }

    // --- Service Distribution for Pie Chart ---
    const serviceDistribution = Object.entries(serviceBookingsMap)
      .map(([id, data]) => ({
        id,
        name: data.name,
        value: data.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)

    return NextResponse.json({
      period,
      periodStart: periodStart.toISOString(),
      kpis: {
        totalRevenue,
        revenueGrowth,
        totalAppointments,
        appointmentGrowth,
        noShowRate,
        noShowRateChange,
        lostRevenue,
        noShowCount,
        pixRecoveryAmount,
        appointmentsByStatus,
      },
      topClients,
      topServices,
      revenueChartData,
      noShowTrend,
      serviceDistribution,
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar relatórios' },
      { status: 500 }
    )
  }
}
