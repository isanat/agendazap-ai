import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'

/**
 * GET /api/blocked-slots
 * List blocked slots for an account, optionally filtered by professional and date range
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const professionalId = searchParams.get('professionalId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const where: any = { accountId }

    if (professionalId) {
      where.professionalId = professionalId
    }

    if (startDate && endDate) {
      where.OR = [
        // Slots that overlap with the requested range
        {
          startDate: { lte: new Date(endDate) },
          endDate: { gte: new Date(startDate) },
        }
      ]
    }

    const blockedSlots = await db.blockedSlot.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        Professional: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    return NextResponse.json({ blockedSlots })
  } catch (error) {
    console.error('Error fetching blocked slots:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/blocked-slots
 * Create a new blocked slot
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, professionalId, startDate, endDate, reason, description } = body

    if (!accountId || !startDate || !endDate) {
      return NextResponse.json({ error: 'accountId, startDate, and endDate are required' }, { status: 400 })
    }

    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start >= end) {
      return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 })
    }

    // Check for overlapping appointments if a specific professional is set
    if (professionalId) {
      const overlappingAppointments = await db.appointment.findMany({
        where: {
          professionalId,
          status: { in: ['pending', 'confirmed'] },
          datetime: { lt: end },
          endTime: { gt: start },
        },
        include: { Client: true, Service: true }
      })

      if (overlappingAppointments.length > 0) {
        return NextResponse.json({
          error: `Existem ${overlappingAppointments.length} agendamentos neste horário. Cancele ou reagende antes de bloquear.`,
          conflictingAppointments: overlappingAppointments.map(a => ({
            id: a.id,
            clientName: a.Client.name,
            serviceName: a.Service.name,
            datetime: a.datetime,
          }))
        }, { status: 409 })
      }
    }

    const blockedSlot = await db.blockedSlot.create({
      data: {
        accountId,
        professionalId: professionalId || null,
        startDate: start,
        endDate: end,
        reason: reason || 'unavailable',
        description: description || null,
      },
      include: {
        Professional: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    return NextResponse.json({ blockedSlot })
  } catch (error) {
    console.error('Error creating blocked slot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/blocked-slots
 * Update a blocked slot
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, startDate, endDate, reason, description } = body

    if (!id) {
      return NextResponse.json({ error: 'Blocked slot ID required' }, { status: 400 })
    }

    const updateData: any = {}
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)
    if (reason) updateData.reason = reason
    if (description !== undefined) updateData.description = description

    const blockedSlot = await db.blockedSlot.update({
      where: { id },
      data: updateData,
      include: {
        Professional: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    return NextResponse.json({ blockedSlot })
  } catch (error) {
    console.error('Error updating blocked slot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/blocked-slots
 * Delete a blocked slot
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Blocked slot ID required' }, { status: 400 })
    }

    await db.blockedSlot.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blocked slot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
