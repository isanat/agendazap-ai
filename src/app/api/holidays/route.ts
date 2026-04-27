import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const holidays = await db.holiday.findMany({
      where: { accountId },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json({ holidays })
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, date, description, isRecurring, professionalId } = body

    if (!accountId || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const holiday = await db.holiday.create({
      data: {
        accountId,
        date: new Date(date),
        description,
        isRecurring: isRecurring || false,
        professionalId
      }
    })

    return NextResponse.json({ holiday })
  } catch (error) {
    console.error('Error creating holiday:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Holiday ID required' }, { status: 400 })
    }

    await db.holiday.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting holiday:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
