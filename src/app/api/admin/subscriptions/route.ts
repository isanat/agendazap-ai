import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const plan = searchParams.get('plan') || 'all'

    const skip = (page - 1) * limit

    // Build where clause for subscriptions
    const where: any = {}

    if (status !== 'all') {
      where.status = status
    }

    if (plan !== 'all') {
      where.plan = { name: plan.toLowerCase() }
    }

    // Get subscriptions with account info
    const [subscriptions, total] = await Promise.all([
      db.accountSubscription.findMany({
        where,
        include: {
          Account: {
            select: {
              id: true,
              businessName: true,
              User: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          SubscriptionPlan: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.accountSubscription.count({ where })
    ])

    // Transform for frontend
    const transformedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      accountName: sub.Account.businessName,
      ownerName: sub.Account.User.name,
      ownerEmail: sub.Account.User.email,
      planName: sub.SubscriptionPlan?.displayName || sub.SubscriptionPlan?.name || 'Unknown',
      planPrice: sub.SubscriptionPlan?.priceMonthly || 0,
      billingCycle: sub.billingCycle,
      status: sub.status,
      startDate: sub.currentPeriodStart.toISOString(),
      renewalDate: sub.currentPeriodEnd.toISOString(),
      paymentMethod: 'PIX', // Would need to track this
      mrr: sub.SubscriptionPlan?.priceMonthly || 0,
      features: [] // Would need to get from plan
    }))

    // Calculate stats
    const stats = {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.status === 'active').length,
      pastDue: subscriptions.filter(s => s.status === 'past_due').length,
      canceled: subscriptions.filter(s => s.status === 'canceled').length,
      mrr: subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.SubscriptionPlan?.priceMonthly || 0), 0),
      churnRate: total > 0 
        ? Math.round((subscriptions.filter(s => s.status === 'canceled').length / total) * 100)
        : 0
    }

    return NextResponse.json({
      subscriptions: transformedSubscriptions,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, planId } = body

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (planId) updateData.planId = planId

    if (status === 'canceled') {
      updateData.canceledAt = new Date()
    }

    const subscription = await db.accountSubscription.update({
      where: { id },
      data: updateData,
      include: {
        Account: {
          select: {
            businessName: true
          }
        }
      }
    })

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
