import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
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

    const appointments = await db.appointment.findMany({
      where,
      orderBy: { datetime: 'asc' },
      include: {
        Client: true,
        Service: true,
        Professional: true,
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
    const body = await request.json()
    const { 
      accountId, 
      clientId, 
      serviceId, 
      professionalId, 
      datetime, 
      notes,
      clientName,
      clientPhone
    } = body

    if (!accountId || !serviceId || !professionalId || !datetime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get service to calculate end time
    const service = await db.service.findUnique({
      where: { id: serviceId }
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

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

    const appointment = await db.appointment.create({
      data: {
        accountId,
        clientId: client.id,
        serviceId,
        professionalId,
        datetime: startTime,
        endTime,
        notes,
        status: 'pending',
      },
      include: {
        Client: true,
        Service: true,
        Professional: true,
      }
    })

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })
    }

    const updateData: any = {}
    
    if (status) {
      updateData.status = status
      
      if (status === 'confirmed') {
        updateData.confirmedAt = new Date()
      } else if (status === 'cancelled') {
        updateData.cancelledAt = new Date()
      } else if (status === 'no_show') {
        // Create no-show fee
        const appointment = await db.appointment.findUnique({
          where: { id },
          include: { Service: true }
        })
        
        if (appointment) {
          // Get account settings for fee amount
          const account = await db.account.findUnique({
            where: { id: appointment.accountId }
          })
          
          if (account?.noShowFeeEnabled) {
            await db.noShowFee.create({
              data: {
                appointmentId: id,
                amount: account.noShowFeeAmount,
              }
            })
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })
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
