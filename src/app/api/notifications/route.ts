import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface NotificationItem {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

// Helper to verify user authentication
function getUserFromHeaders(request: NextRequest): { userId: string; accountId: string; role: string } | null {
  const userId = request.headers.get('x-user-id')
  const accountId = request.headers.get('x-account-id')
  const role = request.headers.get('x-user-role')

  if (!userId || !accountId) {
    return null
  }

  return { userId, accountId, role: role || 'owner' }
}

// GET - List notifications for the current user/account
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Since we don't have a dedicated Notification table in the schema,
    // we'll generate notifications from existing data
    const notifications: NotificationItem[] = []
    const now = new Date()

    // Get recent appointments for the account
    const recentAppointments = await db.appointment.findMany({
      where: {
        accountId: user.accountId,
        datetime: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        Client: true,
        Service: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Generate notifications from appointments
    recentAppointments.forEach(apt => {
      const isUpcoming = new Date(apt.datetime) >= now
      
      if (apt.status === 'confirmed' && isUpcoming) {
        notifications.push({
          id: `apt-confirmed-${apt.id}`,
          type: 'success',
          title: 'Agendamento Confirmado',
          message: `${apt.Client.name} confirmou o agendamento para ${apt.Service.name}`,
          timestamp: apt.confirmedAt || apt.createdAt,
          read: true,
          actionUrl: '/appointments',
          actionLabel: 'Ver agendamento'
        })
      }

      if (apt.status === 'pending' && isUpcoming) {
        notifications.push({
          id: `apt-pending-${apt.id}`,
          type: 'info',
          title: 'Novo Agendamento',
          message: `${apt.Client.name} agendou ${apt.Service.name} para ${new Date(apt.datetime).toLocaleDateString('pt-BR')}`,
          timestamp: apt.createdAt,
          read: false,
          actionUrl: '/appointments',
          actionLabel: 'Confirmar'
        })
      }

      if (apt.status === 'cancelled') {
        notifications.push({
          id: `apt-cancelled-${apt.id}`,
          type: 'warning',
          title: 'Agendamento Cancelado',
          message: `${apt.Client.name} cancelou o agendamento de ${apt.Service.name}`,
          timestamp: apt.cancelledAt || apt.createdAt,
          read: apt.cancelledBy === 'client',
          actionUrl: '/appointments'
        })
      }

      if (apt.status === 'no_show') {
        notifications.push({
          id: `apt-noshow-${apt.id}`,
          type: 'error',
          title: 'Cliente Não Compareceu',
          message: `${apt.Client.name} não compareceu ao agendamento de ${apt.Service.name}`,
          timestamp: apt.datetime,
          read: false,
          actionUrl: '/noshow-fees',
          actionLabel: 'Aplicar taxa'
        })
      }
    })

    // Get no-show fees for payment notifications
    const noShowFees = await db.noShowFee.findMany({
      where: {
        Appointment: {
          accountId: user.accountId
        }
      },
      include: {
        Appointment: {
          include: { Client: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    noShowFees.forEach(fee => {
      if (fee.paid && fee.paidAt) {
        notifications.push({
          id: `payment-${fee.id}`,
          type: 'success',
          title: 'Pagamento Recebido',
          message: `Taxa de no-show de R$ ${fee.amount.toFixed(2)} paga por ${fee.Appointment.Client.name}`,
          timestamp: fee.paidAt,
          read: true
        })
      } else {
        notifications.push({
          id: `fee-pending-${fee.id}`,
          type: 'warning',
          title: 'Taxa Pendente',
          message: `Taxa de R$ ${fee.amount.toFixed(2)} pendente para ${fee.Appointment.Client.name}`,
          timestamp: fee.createdAt,
          read: false,
          actionUrl: '/noshow-fees',
          actionLabel: 'Cobrar'
        })
      }
    })

    // Check for account subscription status
    const account = await db.account.findUnique({
      where: { id: user.accountId },
      include: { AccountSubscription: true }
    })

    if (account) {
      // Check plan expiration
      if (account.planExpiresAt) {
        const daysUntilExpiry = Math.ceil(
          (account.planExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
        
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          notifications.push({
            id: `plan-expiry-${account.id}`,
            type: 'warning',
            title: 'Plano Expirando',
            message: `Seu plano expira em ${daysUntilExpiry} dias. Renove para continuar usando todos os recursos.`,
            timestamp: now,
            read: false,
            actionUrl: '/settings',
            actionLabel: 'Renovar agora'
          })
        }
      }

      // Check trial status
      if (account.trialEndsAt && account.trialEndsAt > now) {
        const daysLeft = Math.ceil(
          (account.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
        
        if (daysLeft <= 3) {
          notifications.push({
            id: `trial-ending-${account.id}`,
            type: 'info',
            title: 'Período de Teste',
            message: `Seu período de teste termina em ${daysLeft} dias. Assine um plano para continuar.`,
            timestamp: now,
            read: false,
            actionUrl: '/settings',
            actionLabel: 'Ver planos'
          })
        }
      }
    }

    // Check for integrations status
    const integrations = await db.integration.findMany({
      where: { accountId: user.accountId }
    })

    integrations.forEach(integration => {
      if (integration.status === 'error' && integration.errorMessage) {
        notifications.push({
          id: `integration-error-${integration.id}`,
          type: 'error',
          title: 'Erro de Integração',
          message: `${integration.type}: ${integration.errorMessage}`,
          timestamp: integration.updatedAt,
          read: false,
          actionUrl: '/settings/integrations',
          actionLabel: 'Corrigir'
        })
      }

      if (integration.status === 'pending') {
        notifications.push({
          id: `integration-pending-${integration.id}`,
          type: 'info',
          title: 'Integração Pendente',
          message: `A integração com ${integration.type} aguarda configuração.`,
          timestamp: integration.createdAt,
          read: false,
          actionUrl: '/settings/integrations',
          actionLabel: 'Configurar'
        })
      }
    })

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Filter unread if requested
    const filteredNotifications = unreadOnly 
      ? notifications.filter(n => !n.read)
      : notifications

    // Paginate
    const startIndex = (page - 1) * limit
    const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + limit)

    // Calculate stats
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {
        info: notifications.filter(n => n.type === 'info').length,
        warning: notifications.filter(n => n.type === 'warning').length,
        error: notifications.filter(n => n.type === 'error').length,
        success: notifications.filter(n => n.type === 'success').length
      }
    }

    return NextResponse.json({
      notifications: paginatedNotifications,
      pagination: {
        page,
        limit,
        total: filteredNotifications.length,
        totalPages: Math.ceil(filteredNotifications.length / limit)
      },
      stats
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new notification (for system/superadmin use)
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, id, type, title, message, targetAccountId, actionUrl, actionLabel } = body

    // Handle delete action
    if (action === 'delete' && id) {
      // In a real implementation with a Notification table:
      // await db.notification.delete({ where: { id } })
      return NextResponse.json({ success: true, message: 'Notification deleted' })
    }

    // Handle create notification (superadmin only)
    if (user.role !== 'superadmin' && targetAccountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // In a real implementation, you would:
    // 1. Create a Notification table in Prisma schema
    // 2. Store the notification in the database
    // 3. Optionally push via WebSocket for real-time updates

    const newNotification = {
      id: `notif-${Date.now()}`,
      type: type || 'info',
      title: title || 'Nova Notificação',
      message: message || '',
      timestamp: new Date(),
      read: false,
      actionUrl,
      actionLabel,
      accountId: targetAccountId || user.accountId
    }

    return NextResponse.json({
      success: true,
      notification: newNotification
    })

  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Mark notification(s) as read
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, markAll, read = true } = body

    if (markAll) {
      // In a real implementation with Notification table:
      // await db.notification.updateMany({
      //   where: { accountId: user.accountId },
      //   data: { read: true }
      // })
      
      return NextResponse.json({ 
        success: true, 
        message: 'All notifications marked as read' 
      })
    }

    if (id) {
      // In a real implementation:
      // await db.notification.update({
      //   where: { id },
      //   data: { read }
      // })
      
      return NextResponse.json({ 
        success: true, 
        message: `Notification ${id} marked as ${read ? 'read' : 'unread'}` 
      })
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 })

  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a notification
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    // In a real implementation:
    // await db.notification.delete({
    //   where: { 
    //     id,
    //     accountId: user.accountId // Ensure user owns the notification
    //   }
    // })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
