import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    const account = await db.account.findUnique({
      where: { id },
      include: {
        User: true,
        Service: { where: { isActive: true } },
        Professional: { where: { isActive: true } },
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    const account = await db.account.update({
      where: { id },
      data: {
        businessName: data.businessName,
        businessType: data.businessType,
        whatsappNumber: data.whatsappNumber,
        openingTime: data.openingTime,
        closingTime: data.closingTime,
        workingDays: data.workingDays,
        timezone: data.timezone,
        noShowFeeEnabled: data.noShowFeeEnabled,
        noShowFeeAmount: data.noShowFeeAmount,
        noShowFeeDeadline: data.noShowFeeDeadline,
        reminder24h: data.reminder24h,
        reminder2h: data.reminder2h,
        welcomeMessage: data.welcomeMessage,
        confirmationMessage: data.confirmationMessage,
        reminderMessage: data.reminderMessage,
        noShowMessage: data.noShowMessage,
        // Business info fields
        instagram: data.instagram,
        facebook: data.facebook,
        website: data.website,
        description: data.description,
        address: data.address,
        addressCity: data.addressCity,
        addressState: data.addressState,
        addressZipCode: data.addressZipCode,
        addressComplement: data.addressComplement,
        googleMapsUrl: data.googleMapsUrl,
      }
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    // Filter out undefined values to only update provided fields
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value
      }
    }

    const account = await db.account.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error patching account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
