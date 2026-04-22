import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'

/**
 * Verify that the request is authorized to modify PIX payment status.
 * Accepts either:
 * 1. An authenticated user via getAuthUser (JWT cookie or auth headers)
 * 2. An internal system call with x-internal-secret header matching INTERNAL_API_SECRET env var
 */
async function verifyPixStatusAuth(request: NextRequest): Promise<boolean> {
  // Method 1: Check for internal system secret
  const internalSecret = request.headers.get('x-internal-secret')
  if (internalSecret) {
    const expectedSecret = process.env.INTERNAL_API_SECRET
    if (expectedSecret && internalSecret === expectedSecret) {
      return true
    }
    // If the header is present but doesn't match, reject immediately
    console.warn('[pix-status] Invalid internal secret provided')
    return false
  }

  // Method 2: Check for authenticated user
  const authUser = await getAuthUser(request)
  if (authUser) {
    return true
  }

  return false
}

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
 * Mark a PIX payment as paid (called by authenticated users or internal system)
 * 
 * SECURITY: This endpoint is now protected. Only accepts requests from:
 * 1. Authenticated users (via getAuthUser)
 * 2. Internal system calls with x-internal-secret header
 * 
 * The Mercado Pago webhook has its own dedicated endpoint at
 * /api/payments/mercadopago/webhook and should NOT use this endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization before processing
    const isAuthorized = await verifyPixStatusAuth(request)
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      )
    }

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
