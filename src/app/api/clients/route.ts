import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let accountId = searchParams.get('accountId')

    // Fallback: try x-account-id header from authFetch
    if (!accountId) {
      accountId = request.headers.get('x-account-id')
    }

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const clients = await db.client.findMany({
      where: { accountId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { Appointment: true }
        }
      }
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { accountId, name, phone, email, notes } = body

    // Fallback: try x-account-id header from authFetch
    if (!accountId) {
      accountId = request.headers.get('x-account-id')
    }

    if (!accountId || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if client with same phone exists
    const existingClient = await db.client.findFirst({
      where: { accountId, phone }
    })

    if (existingClient) {
      return NextResponse.json({ client: existingClient })
    }

    const client = await db.client.create({
      data: {
        accountId,
        name,
        phone,
        email,
        notes,
        noShowScore: 50,
      }
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, phone, email, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const client = await db.client.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        notes,
      }
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    await db.client.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
