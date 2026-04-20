import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/payments/pix-status?appointmentId=xxx
 * Check the PIX payment status for an appointment or no-show fee
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointmentId')
    const noShowFeeId = searchParams.get('noShowFeeId')

    if (appointmentId) {
      const appointment = await db.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          pixQrCode: true,
          pixDeepLink: true,
          pixExpiresAt: true,
          pixPaid: true,
          Service: { select: { name: true, price: true } },
        }
      })

      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
      }

      // Check if PIX has expired
      const isExpired = appointment.pixExpiresAt ? new Date() > appointment.pixExpiresAt : false

      return NextResponse.json({
        appointmentId: appointment.id,
        pixQrCode: appointment.pixQrCode,
        pixDeepLink: appointment.pixDeepLink,
        pixExpiresAt: appointment.pixExpiresAt,
        pixPaid: appointment.pixPaid,
        isExpired,
        serviceName: appointment.Service.name,
        amount: appointment.Service.price,
      })
    }

    if (noShowFeeId) {
      const fee = await db.noShowFee.findUnique({
        where: { id: noShowFeeId },
        include: {
          Appointment: {
            include: {
              Client: true,
              Service: true,
            }
          }
        }
      })

      if (!fee) {
        return NextResponse.json({ error: 'No-show fee not found' }, { status: 404 })
      }

      return NextResponse.json({
        noShowFeeId: fee.id,
        pixQrCode: fee.pixQrCode,
        pixDeepLink: fee.pixDeepLink,
        pixId: fee.pixId,
        paid: fee.paid,
        paidAt: fee.paidAt,
        reminderSent: fee.reminderSent,
        amount: fee.amount,
        clientName: fee.Appointment.Client.name,
        serviceName: fee.Appointment.Service.name,
      })
    }

    return NextResponse.json({ error: 'Provide appointmentId or noShowFeeId' }, { status: 400 })
  } catch (error) {
    console.error('Error checking PIX status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/payments/pix-status
 * Mark a PIX payment as paid (called by MercadoPago webhook or manually)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appointmentId, noShowFeeId, paid } = body

    if (appointmentId) {
      const appointment = await db.appointment.update({
        where: { id: appointmentId },
        data: {
          pixPaid: paid !== undefined ? paid : true,
        }
      })

      // If payment confirmed, also update appointment status to confirmed
      if (appointment.pixPaid && appointment.status === 'pending') {
        await db.appointment.update({
          where: { id: appointmentId },
          data: { status: 'confirmed', confirmedAt: new Date() }
        })
      }

      return NextResponse.json({ success: true, pixPaid: appointment.pixPaid })
    }

    if (noShowFeeId) {
      const fee = await db.noShowFee.update({
        where: { id: noShowFeeId },
        data: {
          paid: paid !== undefined ? paid : true,
          paidAt: paid !== false ? new Date() : null,
        }
      })

      return NextResponse.json({ success: true, paid: fee.paid })
    }

    return NextResponse.json({ error: 'Provide appointmentId or noShowFeeId' }, { status: 400 })
  } catch (error) {
    console.error('Error updating PIX status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
