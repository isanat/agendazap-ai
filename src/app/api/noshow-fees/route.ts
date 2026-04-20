import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/noshow-fees
 * List no-show fees with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const status = searchParams.get('status')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const where: any = {
      Appointment: { accountId }
    }

    if (status) {
      where.paid = status === 'paid'
    }

    const fees = await db.noShowFee.findMany({
      where,
      include: {
        Appointment: {
          include: {
            Client: true,
            Service: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform data for frontend
    const transformedFees = fees.map(fee => ({
      id: fee.id,
      appointmentId: fee.appointmentId,
      clientName: fee.Appointment.Client.name,
      clientPhone: fee.Appointment.Client.phone,
      serviceName: fee.Appointment.Service.name,
      datetime: fee.Appointment.datetime.toISOString(),
      amount: fee.amount,
      status: fee.paid ? 'paid' : 'pending',
      paidAt: fee.paidAt?.toISOString() || null,
      pixQrCode: fee.pixQrCode,
      pixDeepLink: fee.pixDeepLink,
      pixId: fee.pixId,
      reminderSent: fee.reminderSent,
      createdAt: fee.createdAt.toISOString()
    }))

    return NextResponse.json({ fees: transformedFees })
  } catch (error) {
    console.error('Error fetching no-show fees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/noshow-fees
 * Update a no-show fee (mark as paid, send reminder, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, paid, paidAt, reminderSent } = body

    if (!id) {
      return NextResponse.json({ error: 'Fee ID required' }, { status: 400 })
    }

    const updateData: any = {}
    
    if (paid !== undefined) {
      updateData.paid = paid
      if (paid) {
        updateData.paidAt = paidAt ? new Date(paidAt) : new Date()
      }
    }

    if (reminderSent !== undefined) {
      updateData.reminderSent = reminderSent
    }

    const fee = await db.noShowFee.update({
      where: { id },
      data: updateData,
      include: {
        Appointment: {
          include: {
            Client: true,
            Service: true
          }
        }
      }
    })

    return NextResponse.json({ fee })
  } catch (error) {
    console.error('Error updating no-show fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
