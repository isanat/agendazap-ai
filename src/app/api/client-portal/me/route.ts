import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

/**
 * GET /api/client-portal/me
 * Returns the current client's data based on their authenticated user session.
 * Used by the Client Portal to identify which client is logged in.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)

    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Find the Client record linked to this user
    const client = await db.client.findFirst({
      where: {
        User: { id: authUser.id }
      }
    })

    let clientId = client?.id
    let clientData = client

    // Fallback: try to find by clientId if the user has one
    if (!client) {
      const user = await db.user.findUnique({
        where: { id: authUser.id },
      })

      if (user?.clientId) {
        clientData = await db.client.findUnique({
          where: { id: user.clientId }
        })
        clientId = user.clientId
      }
    }

    if (!clientData || !clientId) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Get account info
    const account = await db.account.findUnique({
      where: { id: clientData.accountId },
      select: {
        id: true,
        businessName: true,
        address: true,
        whatsappNumber: true,
      }
    })

    return NextResponse.json({
      client: {
        id: clientData.id,
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        loyaltyPoints: clientData.loyaltyPoints,
        totalAppointments: clientData.totalAppointments,
        noShowCount: clientData.noShowCount,
      },
      account: account ? {
        id: account.id,
        businessName: account.businessName,
        address: account.address,
        phone: account.whatsappNumber,
      } : null,
      accountId: clientData.accountId,
    })
  } catch (error) {
    console.error('Error fetching client portal data:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do cliente' },
      { status: 500 }
    )
  }
}
