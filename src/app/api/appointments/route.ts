import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'

/**
 * Verify that the request is authorized to access appointment operations.
 * Accepts either:
 * 1. An authenticated user via getAuthUser (JWT cookie or auth headers)
 * 2. An internal system call with x-internal-secret header matching INTERNAL_API_SECRET env var
 *    (used by webhooks and other internal services that create appointments programmatically)
 */
async function verifyAppointmentAuth(request: NextRequest): Promise<{ authorized: boolean; authUser?: Awaited<ReturnType<typeof getAuthUser>> }> {
  // Method 1: Check for internal system secret (for webhook/internal calls)
  const internalSecret = request.headers.get('x-internal-secret')
  if (internalSecret) {
    const expectedSecret = process.env.INTERNAL_API_SECRET
    if (expectedSecret && internalSecret === expectedSecret) {
      return { authorized: true }
    }
    // If the header is present but doesn't match, reject immediately
    console.warn('[appointments] Invalid internal secret provided')
    return { authorized: false }
  }

  // Method 2: Check for authenticated user
  const authUser = await getAuthUser(request)
  if (authUser) {
    return { authorized: true, authUser }
  }

  return { authorized: false }
}

// Helper to get effective price for an appointment (considering customPrice)
async function getEffectivePrice(serviceId: string, professionalId: string): Promise<number> {
  // Check if there's a custom price for this service+professional combo
  const serviceProfessional = await db.serviceProfessional.findUnique({
    where: { serviceId_professionalId: { serviceId, professionalId } },
    include: { Service: true }
  })

  if (serviceProfessional?.customPrice !== null && serviceProfessional?.customPrice !== undefined) {
    return serviceProfessional.customPrice
  }

  // Fall back to service default price
  if (serviceProfessional?.Service) {
    return serviceProfessional.Service.price
  }

  // Fallback: get service price directly
  const service = await db.service.findUnique({ where: { id: serviceId } })
  return service?.price || 0
}

// Helper to create a PIX payment via MercadoPago
async function createPixPayment(
  accountId: string,
  amount: number,
  description: string,
  externalReference: string,
  clientEmail?: string,
  clientName?: string,
  clientCpf?: string
): Promise<{
  qrCode?: string;
  deepLink?: string;
  pixId?: string;
  expiresAt?: Date;
  simulated?: boolean;
} | null> {
  try {
    // Check if account has MercadoPago configured
    const integration = await db.integration.findUnique({
      where: { accountId_type: { accountId, type: 'mercadopago' } }
    })

    if (!integration || integration.status !== 'connected') {
      // No MercadoPago connected - return simulated PIX
      console.log('[PIX] MercadoPago not configured, generating simulated PIX')
      return {
        qrCode: `00020126580014br.gov.bcb.pix0136${externalReference}`,
        deepLink: `pix://agendazap-${externalReference}`,
        pixId: `sim_${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        simulated: true,
      }
    }

    // Parse credentials
    const credentials = JSON.parse(integration.credentials)
    if (!credentials.accessToken) return null

    const apiBaseUrl = 'https://api.mercadopago.com'
    const expirationDate = new Date(Date.now() + 3600000).toISOString() // 1 hour

    // Build payer object with CPF if available
    const payer: Record<string, unknown> = {
      email: clientEmail || 'cliente@agendazap.com',
      first_name: clientName?.split(' ')[0] || 'Cliente',
      last_name: clientName?.split(' ').slice(1).join(' ') || '',
    }

    // Add CPF identification if available (important for PIX payments)
    if (clientCpf) {
      const cleanCpf = clientCpf.replace(/\D/g, '')
      if (cleanCpf.length === 11) {
        payer.identification = {
          type: 'CPF',
          number: cleanCpf
        }
        console.log(`[PIX] Including CPF in payment for ${clientName || 'client'}`)
      }
    }

    const response = await fetch(`${apiBaseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.accessToken}`,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: 'pix',
        external_reference: externalReference,
        date_of_expiration: expirationDate,
        payer,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[PIX] MercadoPago error:', error)
      return null
    }

    const data = await response.json()
    return {
      qrCode: data.point_of_interaction?.transaction_data?.qr_code,
      deepLink: data.point_of_interaction?.transaction_data?.bank_info?.deep_link,
      pixId: String(data.id),
      expiresAt: new Date(expirationDate),
    }
  } catch (error) {
    console.error('[PIX] Error creating payment:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { authorized, authUser } = await verifyAppointmentAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const professionalId = searchParams.get('professionalId')
    const clientId = searchParams.get('clientId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    // If authenticated via user auth (not internal), verify account access
    if (authUser) {
      if (authUser.role !== 'superadmin' && authUser.role !== 'client' && authUser.accountId !== accountId) {
        return NextResponse.json({ error: 'Forbidden - no access to this account' }, { status: 403 })
      }
    }

    const where: any = { accountId }
    
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      
      where.datetime = {
        gte: startDate,
        lte: endDate
      }
    }

    if (status) {
      where.status = status
    }

    // If professionalId filter is provided (used by professional-role users)
    if (professionalId) {
      where.professionalId = professionalId
    }

    // If clientId filter is provided (used by client portal)
    if (clientId) {
      where.clientId = clientId
    }

    const appointments = await db.appointment.findMany({
      where,
      orderBy: { datetime: 'asc' },
      include: {
        Client: true,
        Service: true,
        Professional: true,
        NoShowFee: true,
        Account: {
          select: { businessName: true, address: true, whatsappNumber: true }
        },
      }
    })

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { authorized, authUser } = await verifyAppointmentAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      accountId, 
      clientId, 
      serviceId, 
      professionalId, 
      datetime, 
      notes,
      clientName,
      clientPhone,
      generatePix
    } = body

    if (!accountId || !serviceId || !professionalId || !datetime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If authenticated via user auth (not internal), verify account access
    if (authUser) {
      if (authUser.role !== 'superadmin' && authUser.accountId !== accountId) {
        return NextResponse.json({ error: 'Forbidden - no access to this account' }, { status: 403 })
      }
    }

    // Get service to calculate end time and check custom pricing
    const service = await db.service.findUnique({
      where: { id: serviceId }
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Calculate effective price (considering ServiceProfessional.customPrice)
    const effectivePrice = await getEffectivePrice(serviceId, professionalId)

    // Find or create client
    let client
    if (clientId) {
      client = await db.client.findUnique({ where: { id: clientId } })
    } else if (clientName && clientPhone) {
      client = await db.client.findFirst({
        where: { accountId, phone: clientPhone }
      })
      
      if (!client) {
        client = await db.client.create({
          data: {
            accountId,
            name: clientName,
            phone: clientPhone,
            noShowScore: 50,
          }
        })
      }
    }

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 400 })
    }

    // Calculate end time
    const startTime = new Date(datetime)
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60000)

    // Check for blocked slots before creating appointment
    const blockedSlots = await db.blockedSlot.findMany({
      where: {
        accountId,
        OR: [
          { professionalId },  // Blocks for this specific professional
          { professionalId: null },  // Blocks for all professionals (account-wide)
        ],
        startDate: { lte: endTime },
        endDate: { gte: startTime },
      }
    })

    if (blockedSlots.length > 0) {
      const blockReason = blockedSlots[0].reason || 'unavailable'
      const blockDesc = blockedSlots[0].description || ''
      return NextResponse.json({ 
        error: `Horário indisponível: ${blockReason}${blockDesc ? ` - ${blockDesc}` : ''}`,
        blockedSlots 
      }, { status: 409 })
    }

    // Create the appointment
    const appointment = await db.appointment.create({
      data: {
        accountId,
        clientId: client.id,
        serviceId,
        professionalId,
        datetime: startTime,
        endTime,
        notes,
        price: effectivePrice,
        status: 'pending',
      },
      include: {
        Client: true,
        Service: true,
        Professional: true,
      }
    })

    // Generate PIX payment if requested and service has a price
    if (generatePix !== false && effectivePrice > 0) {
      const pixResult = await createPixPayment(
        accountId,
        effectivePrice,
        `${service.name} - ${appointment.id}`,
        appointment.id,
        client.email || undefined,
        client.name,
        client.cpf || undefined
      )

      if (pixResult) {
        await db.appointment.update({
          where: { id: appointment.id },
          data: {
            pixQrCode: pixResult.qrCode,
            pixDeepLink: pixResult.deepLink,
            pixExpiresAt: pixResult.expiresAt,
            pixPaid: false,
          }
        })

        // Return the appointment with PIX data
        return NextResponse.json({ 
          appointment: {
            ...appointment,
            pixQrCode: pixResult.qrCode,
            pixDeepLink: pixResult.deepLink,
            pixExpiresAt: pixResult.expiresAt,
            pixPaid: false,
          },
          pix: {
            qrCode: pixResult.qrCode,
            deepLink: pixResult.deepLink,
            expiresAt: pixResult.expiresAt,
            simulated: pixResult.simulated || false,
            amount: effectivePrice,
          },
          effectivePrice,
        })
      }
    }

    return NextResponse.json({ 
      appointment,
      effectivePrice,
    })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const { authorized, authUser } = await verifyAppointmentAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })
    }

    // If authenticated via user auth (not internal), verify access to this appointment
    if (authUser && authUser.role !== 'superadmin') {
      const existingAppointment = await db.appointment.findUnique({
        where: { id },
        select: { accountId: true }
      })
      if (!existingAppointment || existingAppointment.accountId !== authUser.accountId) {
        return NextResponse.json({ error: 'Forbidden - no access to this appointment' }, { status: 403 })
      }
    }

    const updateData: any = {}
    
    if (status) {
      updateData.status = status
      
      if (status === 'confirmed') {
        updateData.confirmedAt = new Date()
      } else if (status === 'cancelled') {
        updateData.cancelledAt = new Date()
      } else if (status === 'no_show') {
        // Create no-show fee with PIX payment
        const appointment = await db.appointment.findUnique({
          where: { id },
          include: { Service: true, Client: true }
        })
        
        if (appointment) {
          // Get account settings for fee amount
          const account = await db.account.findUnique({
            where: { id: appointment.accountId }
          })
          
          if (account?.noShowFeeEnabled) {
            // Check if fee already exists
            const existingFee = await db.noShowFee.findUnique({
              where: { appointmentId: id }
            })

            if (!existingFee) {
              // Create no-show fee
              const fee = await db.noShowFee.create({
                data: {
                  appointmentId: id,
                  amount: account.noShowFeeAmount,
                }
              })

              // Generate PIX for the no-show fee
              const pixResult = await createPixPayment(
                appointment.accountId,
                account.noShowFeeAmount,
                `Taxa no-show - ${appointment.Service.name}`,
                `noshow_${fee.id}`,
                appointment.Client.email || undefined,
                appointment.Client.name
              )

              if (pixResult) {
                await db.noShowFee.update({
                  where: { id: fee.id },
                  data: {
                    pixQrCode: pixResult.qrCode,
                    pixDeepLink: pixResult.deepLink,
                    pixId: pixResult.pixId,
                  }
                })
              }
            }
          }
        }
      }
    }
    
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const appointment = await db.appointment.update({
      where: { id },
      data: updateData,
      include: {
        Client: true,
        Service: true,
        Professional: true,
        NoShowFee: true,
      }
    })

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const { authorized, authUser } = await verifyAppointmentAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })
    }

    // If authenticated via user auth (not internal), verify access to this appointment
    if (authUser && authUser.role !== 'superadmin') {
      const existingAppointment = await db.appointment.findUnique({
        where: { id },
        select: { accountId: true }
      })
      if (!existingAppointment || existingAppointment.accountId !== authUser.accountId) {
        return NextResponse.json({ error: 'Forbidden - no access to this appointment' }, { status: 403 })
      }
    }

    await db.appointment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
