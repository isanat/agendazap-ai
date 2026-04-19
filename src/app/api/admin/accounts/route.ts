import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getAuthUser } from '@/lib/auth-helpers'

// GET - List all accounts with stats
export async function GET(request: NextRequest) {
  try {
    // Require superadmin authentication
    const authUser = await getAuthUser(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmins podem acessar este endpoint.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all' // all, active, inactive, trial
    const plan = searchParams.get('plan') || 'all'

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.AccountWhereInput = {}

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { whatsappNumber: { contains: search, mode: 'insensitive' } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (status === 'active') {
      where.whatsappConnected = true
    } else if (status === 'inactive') {
      where.whatsappConnected = false
    } else if (status === 'trial') {
      where.trialEndsAt = { gte: new Date() }
    }

    if (plan !== 'all') {
      where.plan = plan
    }

    // Get accounts with related data
    const [accounts, total] = await Promise.all([
      db.account.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              createdAt: true,
            }
          },
          AccountSubscription: {
            include: {
              SubscriptionPlan: true
            }
          },
          _count: {
            select: {
              Service: true,
              Professional: true,
              Client: true,
              Appointment: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.account.count({ where })
    ])

    // Get appointment counts for current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const appointmentsThisMonth = await db.appointment.count({
          where: {
            accountId: account.id,
            datetime: { gte: startOfMonth }
          }
        })

        const completedAppointments = await db.appointment.count({
          where: {
            accountId: account.id,
            status: 'completed'
          }
        })

        const noShows = await db.appointment.count({
          where: {
            accountId: account.id,
            status: 'no_show'
          }
        })

        return {
          ...account,
          stats: {
            appointmentsThisMonth,
            completedAppointments,
            noShows,
            noShowRate: completedAppointments + noShows > 0 
              ? Math.round((noShows / (completedAppointments + noShows)) * 100) 
              : 0
          }
        }
      })
    )

    return NextResponse.json({
      accounts: accountsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar empresas' },
      { status: 500 }
    )
  }
}

// PUT - Update account status/plan
export async function PUT(request: NextRequest) {
  try {
    // Require superadmin authentication
    const authUser = await getAuthUser(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmins podem acessar este endpoint.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID da empresa é obrigatório' },
        { status: 400 }
      )
    }

    const account = await db.account.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar empresa' },
      { status: 500 }
    )
  }
}

// DELETE - Delete account
export async function DELETE(request: NextRequest) {
  try {
    // Require superadmin authentication
    const authUser = await getAuthUser(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmins podem acessar este endpoint.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da empresa é obrigatório' },
        { status: 400 }
      )
    }

    await db.account.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir empresa' },
      { status: 500 }
    )
  }
}
