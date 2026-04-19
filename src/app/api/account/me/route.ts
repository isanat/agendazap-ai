import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/account/me - Get current user's account
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        Account: {
          select: {
            id: true,
            businessName: true,
            businessType: true,
            whatsappNumber: true,
            whatsappConnected: true,
            whatsappSession: true,
            instagram: true,
            facebook: true,
            website: true,
            description: true,
            address: true,
            addressCity: true,
            addressState: true,
            addressZipCode: true,
            addressComplement: true,
            googleMapsUrl: true,
            openingTime: true,
            closingTime: true,
            workingDays: true,
            noShowFeeEnabled: true,
            noShowFeeAmount: true,
            noShowFeeDeadline: true,
            reminder24h: true,
            reminder2h: true,
            welcomeMessage: true,
            confirmationMessage: true,
            reminderMessage: true,
            noShowMessage: true,
            plan: true,
          }
        }
      }
    })

    if (!user || !user.Account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ account: user.Account })
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/account/me - Update current user's account
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Filter out undefined values
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        updateData[key] = value
      }
    }

    const account = await db.account.update({
      where: { id: session.user.accountId },
      data: updateData
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
