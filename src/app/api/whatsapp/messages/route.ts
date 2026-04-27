import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const clientPhone = searchParams.get('clientPhone')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const where: any = { accountId }

    if (clientPhone) {
      where.clientPhone = clientPhone
    }

    const messages = await db.whatsappMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Transform data for frontend
    const transformedMessages = messages.map(msg => ({
      id: msg.id,
      phone: msg.clientPhone,
      direction: msg.direction,
      message: msg.message,
      timestamp: msg.createdAt.toISOString(),
      status: msg.status,
      intent: msg.intent,
      messageType: msg.messageType
    }))

    return NextResponse.json({ messages: transformedMessages })
  } catch (error) {
    console.error('Error fetching WhatsApp messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, clientPhone, direction, message, messageType, intent, appointmentId } = body

    if (!accountId || !clientPhone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const whatsappMessage = await db.whatsappMessage.create({
      data: {
        accountId,
        clientPhone,
        direction: direction || 'outgoing',
        message,
        messageType: messageType || 'text',
        intent,
        appointmentId,
        status: 'sent'
      }
    })

    return NextResponse.json({ message: whatsappMessage })
  } catch (error) {
    console.error('Error creating WhatsApp message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
