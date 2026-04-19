import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const services = await db.service.findMany({
      where: { accountId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[POST /api/services] Request body:', JSON.stringify(body, null, 2))

    const { accountId, name, description, durationMinutes, price, category, isActive } = body

    if (!accountId || !name || !durationMinutes || price === undefined) {
      console.log('[POST /api/services] Missing required fields:', { accountId, name, durationMinutes, price })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('[POST /api/services] Creating service with data:', {
      accountId,
      name,
      description: description || null,
      durationMinutes: parseInt(durationMinutes) || 30,
      price: parseFloat(price) || 0,
      category: category || 'outros',
      isActive: isActive !== undefined ? isActive : true,
    })

    const service = await db.service.create({
      data: {
        accountId,
        name,
        description: description || null,
        durationMinutes: parseInt(durationMinutes) || 30,
        price: parseFloat(price) || 0,
        category: category || 'outros',
        isActive: isActive !== undefined ? isActive : true,
      }
    })

    console.log('[POST /api/services] Service created successfully:', service.id)
    return NextResponse.json({ service })
  } catch (error) {
    console.error('[POST /api/services] Error creating service:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, durationMinutes, price, category, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'Service ID required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (durationMinutes !== undefined) updateData.durationMinutes = parseInt(durationMinutes) || 30
    if (price !== undefined) updateData.price = parseFloat(price) || 0
    if (category !== undefined) updateData.category = category
    if (isActive !== undefined) updateData.isActive = isActive

    const service = await db.service.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Service ID required' }, { status: 400 })
    }

    await db.service.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
