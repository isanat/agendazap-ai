import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // Require superadmin authentication
    const authUser = await getAuthUser(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmins podem acessar este endpoint.' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status') || 'all'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role !== 'all') {
      where.role = role
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          Account: {
            select: {
              id: true,
              businessName: true,
              plan: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where })
    ])

    // Transform users for frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      accountId: user.Account?.id || null,
      accountName: user.Account?.businessName || null,
      planName: user.Account?.plan || null,
      createdAt: user.createdAt.toISOString(),
      lastLogin: null, // Would need to track this
      loginCount: 0 // Would need to track this
    }))

    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Require superadmin authentication
    const authUser = await getAuthUser(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmins podem acessar este endpoint.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, isActive, role, name, email, phone } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const updateData: any = {}
    if (isActive !== undefined) updateData.isActive = isActive
    if (role) updateData.role = role
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    updateData.updatedAt = new Date()

    const user = await db.user.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require superadmin authentication
    const authUser = await getAuthUser(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmins podem acessar este endpoint.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    await db.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
