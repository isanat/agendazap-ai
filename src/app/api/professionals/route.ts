import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const professionals = await db.professional.findMany({
      where: { accountId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ professionals })
  } catch (error) {
    console.error('Error fetching professionals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, name, phone, email, color } = body

    if (!accountId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const professional = await db.professional.create({
      data: {
        accountId,
        name,
        phone,
        email,
        color: color || '#10B981',
        isActive: true,
      }
    })

    return NextResponse.json({ professional })
  } catch (error) {
    console.error('Error creating professional:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, phone, email, color, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'Professional ID required' }, { status: 400 })
    }

    const professional = await db.professional.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        color,
        isActive,
      }
    })

    return NextResponse.json({ professional })
  } catch (error) {
    console.error('Error updating professional:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Professional ID required' }, { status: 400 })
    }

    await db.professional.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting professional:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
