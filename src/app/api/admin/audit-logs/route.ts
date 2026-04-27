import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action') || 'all'
    const severity = searchParams.get('severity') || 'all'
    const userId = searchParams.get('userId') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (action !== 'all') {
      where.action = action
    }

    if (userId) {
      where.userId = userId
    }

    // Get audit logs
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          User: {
            select: {
              name: true,
              email: true
            }
          },
          Appointment: {
            include: {
              Client: {
                select: { name: true }
              },
              Service: {
                select: { name: true }
              },
              Account: {
                select: { businessName: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.auditLog.count({ where })
    ])

    // Transform for frontend
    const transformedLogs = logs.map(log => {
      // Determine severity based on action
      let severityLevel = 'info'
      if (log.action === 'delete' || log.action === 'logout') severityLevel = 'warning'
      if (log.action === 'error') severityLevel = 'error'
      if (log.action === 'create' || log.action === 'payment') severityLevel = 'success'

      return {
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        action: log.action,
        severity: severityLevel,
        userId: log.userId,
        userName: log.User?.name,
        userEmail: log.User?.email,
        accountId: log.Appointment?.accountId,
        accountName: log.Appointment?.Account?.businessName,
        resource: log.Appointment ? 'appointment' : 'system',
        resourceId: log.appointmentId,
        details: log.details,
        ipAddress: '127.0.0.1', // Would need to track this
        userAgent: 'Unknown' // Would need to track this
      }
    })

    // Filter by severity if specified
    const filteredLogs = severity !== 'all' 
      ? transformedLogs.filter(l => l.severity === severity)
      : transformedLogs

    // Calculate stats
    const stats = {
      total: logs.length,
      errors: transformedLogs.filter(l => l.severity === 'error').length,
      warnings: transformedLogs.filter(l => l.severity === 'warning').length,
      today: logs.filter(l => {
        const logDate = new Date(l.createdAt)
        const today = new Date()
        return logDate.toDateString() === today.toDateString()
      }).length
    }

    return NextResponse.json({
      logs: filteredLogs,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, appointmentId, details } = body

    const log = await db.auditLog.create({
      data: {
        id: nanoid(),
        userId,
        action,
        appointmentId,
        details
      }
    })

    return NextResponse.json({ log })
  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
