import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { getSalonTimezone, getNowInSalonTz, createDateInSalonTz } from '@/lib/booking-validation'
import { format } from 'date-fns'

/**
 * Verify that the request is authorized to access appointment operations.
 * Accepts either:
 * 1. An authenticated user via getAuthUser (JWT cookie or auth headers)
 * 2. An internal system call with x-internal-secret header matching INTERNAL_API_SECRET env var
 *    (used by webhooks and other internal services that create appointments programmatically)
 * 3. Fallback: x-account-id header (same auth level as clients/services/professionals APIs)
 */
async function verifyAppointmentAuth(request: NextRequest): Promise<{ authorized: boolean; authUser?: Awaited<ReturnType<typeof getAuthUser>>; accountId?: string }> {
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

  // Method 3: Fallback - check x-account-id header (same auth level as clients/services APIs)
  const accountId = request.headers.get('x-account-id') || new URL(request.url).searchParams.get('accountId')
  if (accountId) {
    // Verify the account actually exists
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: { id: true }
    })
    if (account) {
      return { authorized: true, accountId }
    }
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
    const { authorized, authUser, accountId: authAccountId } = await verifyAppointmentAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let accountId = searchParams.get('accountId') || authAccountId || ''
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
    // If authenticated via x-account-id header (no authUser), the accountId itself serves as authorization

    const where: any = { accountId }
    
    if (date) {
      // Use salon's timezone for date boundaries instead of server timezone
      // This ensures "today's appointments" are correct regardless of server location
      const salonTimezone = await getSalonTimezone(accountId)
      const startOfDay = createDateInSalonTz(date, '00:00', salonTimezone)
      const endOfDay = createDateInSalonTz(date, '23:59', salonTimezone)

      where.datetime = {
        gte: startOfDay,
        lte: endOfDay
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
    const { authorized, authUser, accountId: authAccountId } = await verifyAppointmentAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    let { 
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

    // Fallback: use accountId from auth if not provided in body
    if (!accountId) {
      accountId = request.headers.get('x-account-id') || authAccountId
    }

    if (!accountId || !serviceId || !professionalId || !datetime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If authenticated via user auth (not internal), verify account access
    if (authUser) {
      if (authUser.role !== 'superadmin' && authUser.accountId !== accountId) {
        return NextResponse.json({ error: 'Forbidden - no access to this account' }, { status: 403 })
      }
    }
    // If authenticated via x-account-id header (no authUser), the accountId itself serves as authorization

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

    // Calculate start/end time using salon's timezone
    // The client should send 'date' (YYYY-MM-DD) and 'time' (HH:mm) separately for timezone safety
    // But we also support raw 'datetime' for backward compatibility
    let startTime: Date

    if (body.date && body.time) {
      // Preferred: separate date + time with salon timezone conversion
      const salonTimezone = await getSalonTimezone(accountId)
      startTime = createDateInSalonTz(body.date, body.time, salonTimezone)
    } else {
      // Fallback: use the raw datetime (may have timezone issues)
      startTime = new Date(datetime)
    }

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
    const { authorized, authUser, accountId: authAccountId } = await verifyAppointmentAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, notes, professionalId, serviceId, clientId, datetime } = body

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })
    }

    // ── 2A: Read the existing appointment ──────────────────────────────
    const existingAppointment = await db.appointment.findUnique({
      where: { id },
      include: { Service: true, Professional: true, Client: true }
    })

    if (!existingAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Authorization: verify the user has access to this appointment's account
    if (authUser && authUser.role !== 'superadmin') {
      if (existingAppointment.accountId !== authUser.accountId) {
        return NextResponse.json({ error: 'Forbidden - no access to this appointment' }, { status: 403 })
      }
    }
    if (!authUser && authAccountId) {
      if (existingAppointment.accountId !== authAccountId) {
        return NextResponse.json({ error: 'Forbidden - no access to this appointment' }, { status: 403 })
      }
    }

    const updateData: Record<string, unknown> = {}
    let reassigned = false
    let reassignedFrom = ''
    let reassignedTo = ''
    let serviceChanged = false
    let datetimeChanged = false

    // Determine the effective professionalId and serviceId for downstream checks
    const effectiveProfessionalId = professionalId || existingAppointment.professionalId
    const effectiveServiceId = serviceId || existingAppointment.serviceId

    // ── 2B: Handle professionalId change (REASSIGNMENT) ───────────────
    if (professionalId && professionalId !== existingAppointment.professionalId) {
      // 1. Check status — only allow reassignment if pending or confirmed
      const blockedStatuses = ['completed', 'no_show', 'cancelled']
      if (blockedStatuses.includes(existingAppointment.status)) {
        return NextResponse.json(
          { error: `Cannot reassign appointment with status "${existingAppointment.status}"` },
          { status: 400 }
        )
      }

      // 2. Check service compatibility — the new professional must offer this service
      const serviceLink = await db.serviceProfessional.findUnique({
        where: { serviceId_professionalId: { serviceId: effectiveServiceId, professionalId } }
      })
      if (!serviceLink) {
        return NextResponse.json(
          { error: 'O profissional selecionado não oferece este serviço' },
          { status: 400 }
        )
      }

      // 3. Check schedule conflict for the new professional at the same datetime range
      const newProfessional = await db.professional.findUnique({
        where: { id: professionalId }
      })
      if (!newProfessional) {
        return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
      }

      // Determine the time range to check (may be updated later by serviceId/datetime changes)
      const checkStart = datetime ? new Date(datetime) : existingAppointment.datetime
      // Calculate end time: we'll use the effective service duration
      const effectiveService = serviceId
        ? await db.service.findUnique({ where: { id: serviceId } })
        : existingAppointment.Service
      const checkDuration = effectiveService?.durationMinutes || existingAppointment.Service.durationMinutes
      const checkEnd = new Date(checkStart.getTime() + checkDuration * 60000)

      const conflictingAppointments = await db.appointment.findMany({
        where: {
          professionalId,
          id: { not: id }, // Exclude the current appointment
          status: { notIn: ['cancelled'] },
          datetime: { lt: checkEnd },
          endTime: { gt: checkStart },
        }
      })

      if (conflictingAppointments.length > 0) {
        return NextResponse.json(
          { error: 'Conflito de horário: o profissional já tem um agendamento nesse horário' },
          { status: 409 }
        )
      }

      // 4. Check blocked slots for the new professional
      const blockedSlots = await db.blockedSlot.findMany({
        where: {
          accountId: existingAppointment.accountId,
          OR: [
            { professionalId },
            { professionalId: null },
          ],
          startDate: { lte: checkEnd },
          endDate: { gte: checkStart },
        }
      })

      if (blockedSlots.length > 0) {
        return NextResponse.json(
          { error: 'Horário bloqueado para este profissional' },
          { status: 409 }
        )
      }

      // 5. Recalculate price using effective service + new professional
      const newPrice = await getEffectivePrice(effectiveServiceId, professionalId)

      // 6. Handle PIX payment
      if (existingAppointment.pixPaid && newPrice !== existingAppointment.price) {
        return NextResponse.json(
          { error: 'Não é possível transferir agendamento com PIX pago que tem preço diferente' },
          { status: 400 }
        )
      }

      if (!existingAppointment.pixPaid && existingAppointment.pixId && newPrice !== existingAppointment.price) {
        // Cancel old PIX and generate new one
        updateData.pixId = null
        updateData.pixQrCode = null
        updateData.pixDeepLink = null
        updateData.pixExpiresAt = null

        const client = existingAppointment.Client
        const pixResult = await createPixPayment(
          existingAppointment.accountId,
          newPrice,
          `${effectiveService?.name || existingAppointment.Service.name} - ${id}`,
          id,
          client.email || undefined,
          client.name,
          client.cpf || undefined
        )

        if (pixResult) {
          updateData.pixQrCode = pixResult.qrCode
          updateData.pixDeepLink = pixResult.deepLink
          updateData.pixId = pixResult.pixId
          updateData.pixExpiresAt = pixResult.expiresAt
        }
      }

      updateData.price = newPrice
      updateData.professionalId = professionalId

      // 7. Recalculate endTime if service also changed (handled below in 2C)
      // If serviceId is NOT changing, still recalculate endTime from current service for safety
      if (!serviceId || serviceId === existingAppointment.serviceId) {
        const endTime = new Date(
          (datetime ? new Date(datetime) : existingAppointment.datetime).getTime() + checkDuration * 60000
        )
        updateData.endTime = endTime
      }

      // 8. Store audit data
      updateData.previousProfessionalId = existingAppointment.professionalId
      updateData.reassignedAt = new Date()
      updateData.reassignedBy = authUser?.id || 'system'

      reassigned = true
      reassignedFrom = existingAppointment.Professional?.name || 'Profissional anterior'
      reassignedTo = newProfessional.name

      // 9. Create AuditLog entry
      await db.auditLog.create({
        data: {
          appointmentId: id,
          userId: authUser?.id || null,
          action: 'reassign_professional',
          details: JSON.stringify({
            from: {
              professionalId: existingAppointment.professionalId,
              professionalName: existingAppointment.Professional?.name,
            },
            to: {
              professionalId,
              professionalName: newProfessional.name,
            },
            previousPrice: existingAppointment.price,
            newPrice,
            reason: 'Admin reassignment',
          }),
        },
      })
    }

    // ── 2C: Handle serviceId change ───────────────────────────────────
    if (serviceId && serviceId !== existingAppointment.serviceId) {
      // 1. Verify the service exists and is active
      const newService = await db.service.findUnique({ where: { id: serviceId } })
      if (!newService || !newService.isActive) {
        return NextResponse.json(
          { error: 'Serviço não encontrado ou inativo' },
          { status: 400 }
        )
      }

      // 2. Verify the (possibly new) professional offers this service
      const spLink = await db.serviceProfessional.findUnique({
        where: { serviceId_professionalId: { serviceId, professionalId: effectiveProfessionalId } }
      })
      if (!spLink) {
        return NextResponse.json(
          { error: 'O profissional selecionado não oferece este serviço' },
          { status: 400 }
        )
      }

      // 3. Recalculate price (if not already done during professional reassignment)
      if (!professionalId || professionalId === existingAppointment.professionalId) {
        const newPrice = await getEffectivePrice(serviceId, effectiveProfessionalId)

        // 4. Handle PIX payment
        if (existingAppointment.pixPaid && newPrice !== existingAppointment.price) {
          return NextResponse.json(
            { error: 'Não é possível alterar o serviço com PIX pago que tem preço diferente' },
            { status: 400 }
          )
        }

        if (!existingAppointment.pixPaid && existingAppointment.pixId && newPrice !== existingAppointment.price) {
          updateData.pixId = null
          updateData.pixQrCode = null
          updateData.pixDeepLink = null
          updateData.pixExpiresAt = null

          const client = existingAppointment.Client
          const pixResult = await createPixPayment(
            existingAppointment.accountId,
            newPrice,
            `${newService.name} - ${id}`,
            id,
            client.email || undefined,
            client.name,
            client.cpf || undefined
          )

          if (pixResult) {
            updateData.pixQrCode = pixResult.qrCode
            updateData.pixDeepLink = pixResult.deepLink
            updateData.pixId = pixResult.pixId
            updateData.pixExpiresAt = pixResult.expiresAt
          }
        }

        updateData.price = newPrice
      }

      // 5. Recalculate endTime from the new service's duration
      const newStart = datetime ? new Date(datetime) : existingAppointment.datetime
      updateData.endTime = new Date(newStart.getTime() + newService.durationMinutes * 60000)
      updateData.serviceId = serviceId

      serviceChanged = true

      // 6. Create AuditLog entry
      await db.auditLog.create({
        data: {
          appointmentId: id,
          userId: authUser?.id || null,
          action: 'change_service',
          details: JSON.stringify({
            from: {
              serviceId: existingAppointment.serviceId,
              serviceName: existingAppointment.Service?.name,
              price: existingAppointment.price,
            },
            to: {
              serviceId,
              serviceName: newService.name,
              price: (updateData.price as number) ?? existingAppointment.price,
            },
          }),
        },
      })
    }

    // ── 2D: Handle datetime change ────────────────────────────────────
    if (datetime) {
      const newDatetime = new Date(datetime)
      if (newDatetime.getTime() !== existingAppointment.datetime.getTime()) {
        // 1. Recalculate endTime based on service duration
        const effectiveDurationService = serviceId
          ? (await db.service.findUnique({ where: { id: serviceId } })) || existingAppointment.Service
          : existingAppointment.Service
        const newEndTime = new Date(
          newDatetime.getTime() + effectiveDurationService.durationMinutes * 60000
        )

        // 2. Check for conflicts with the professional's other appointments
        const effectiveProfId = effectiveProfessionalId
        const conflicts = await db.appointment.findMany({
          where: {
            professionalId: effectiveProfId,
            id: { not: id },
            status: { notIn: ['cancelled'] },
            datetime: { lt: newEndTime },
            endTime: { gt: newDatetime },
          }
        })

        if (conflicts.length > 0) {
          return NextResponse.json(
            { error: 'Conflito de horário: já existe um agendamento nesse horário' },
            { status: 409 }
          )
        }

        // 3. Check blocked slots
        const blockedSlots = await db.blockedSlot.findMany({
          where: {
            accountId: existingAppointment.accountId,
            OR: [
              { professionalId: effectiveProfId },
              { professionalId: null },
            ],
            startDate: { lte: newEndTime },
            endDate: { gte: newDatetime },
          }
        })

        if (blockedSlots.length > 0) {
          return NextResponse.json(
            { error: 'Horário bloqueado' },
            { status: 409 }
          )
        }

        updateData.datetime = newDatetime
        // Only set endTime if not already set by service change
        if (!updateData.endTime) {
          updateData.endTime = newEndTime
        }

        datetimeChanged = true

        // 4. Create AuditLog entry
        await db.auditLog.create({
          data: {
            appointmentId: id,
            userId: authUser?.id || null,
            action: 'change_datetime',
            details: JSON.stringify({
              from: {
                datetime: existingAppointment.datetime.toISOString(),
                endTime: existingAppointment.endTime.toISOString(),
              },
              to: {
                datetime: newDatetime.toISOString(),
                endTime: newEndTime.toISOString(),
              },
            }),
          },
        })
      }
    }

    // ── 2E: Handle status change ──────────────────────────────────────
    if (status) {
      updateData.status = status

      if (status === 'confirmed') {
        updateData.confirmedAt = new Date()
      } else if (status === 'cancelled') {
        updateData.cancelledAt = new Date()
        updateData.cancelledBy = authUser?.id || 'system'
      } else if (status === 'no_show') {
        // Create no-show fee with PIX payment
        const account = await db.account.findUnique({
          where: { id: existingAppointment.accountId }
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
              existingAppointment.accountId,
              account.noShowFeeAmount,
              `Taxa no-show - ${existingAppointment.Service.name}`,
              `noshow_${fee.id}`,
              existingAppointment.Client.email || undefined,
              existingAppointment.Client.name
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

    // ── 2F: Handle notes change ───────────────────────────────────────
    if (notes !== undefined) {
      updateData.notes = notes
    }

    // ── Handle clientId change ────────────────────────────────────────
    if (clientId && clientId !== existingAppointment.clientId) {
      const client = await db.client.findUnique({ where: { id: clientId } })
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      updateData.clientId = clientId
    }

    // ── If nothing to update, return early ────────────────────────────
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ appointment: existingAppointment })
    }

    // ── Perform the update ────────────────────────────────────────────
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

    // ── 2B (continued): Send WhatsApp notification on reassignment ────
    if (reassigned && appointment.Client?.phone) {
      try {
        const { sendWhatsAppMessage } = await import('@/app/api/webhooks/evolution/route')
        const serviceName = appointment.Service?.name || 'Serviço'
        const aptDate = format(new Date(appointment.datetime), 'dd/MM/yyyy')
        const aptTime = format(new Date(appointment.datetime), 'HH:mm')

        const message = `Olá ${appointment.Client.name}! Seu agendamento de ${serviceName} foi transferido de ${reassignedFrom} para ${reassignedTo}, no dia ${aptDate} às ${aptTime}. Qualquer dúvida, estou aqui! 😊`

        await sendWhatsAppMessage(existingAppointment.accountId, appointment.Client.phone, message)
        console.log(`[Reassignment] WhatsApp notification sent to ${appointment.Client.phone}`)
      } catch (waError) {
        // Don't fail the update if WhatsApp send fails — AuditLog already recorded
        console.warn('[Reassignment] Failed to send WhatsApp notification:', waError)
      }
    }

    // Return the appointment with metadata about what changed
    return NextResponse.json({
      appointment,
      reassigned,
      reassignedFrom,
      reassignedTo,
      serviceChanged,
      datetimeChanged,
    })
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const { authorized, authUser, accountId: authAccountId } = await verifyAppointmentAuth(request)
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
    // If authenticated via x-account-id header (no authUser), verify the appointment belongs to that account
    if (!authUser && authAccountId) {
      const existingAppointment = await db.appointment.findUnique({
        where: { id },
        select: { accountId: true }
      })
      if (!existingAppointment || existingAppointment.accountId !== authAccountId) {
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
