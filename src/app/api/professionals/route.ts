import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let accountId = searchParams.get('accountId')
    const userId = searchParams.get('userId')

    // Fallback: try x-account-id header from authFetch
    if (!accountId) {
      accountId = request.headers.get('x-account-id')
    }

    // If userId is provided, get the professional linked to that user
    // (professional user viewing their own schedule)
    if (userId && !accountId) {
      const professional = await db.professional.findUnique({
        where: { userId },
        include: {
          Account: {
            select: { id: true, businessName: true }
          },
          ServiceProfessional: {
            include: { Service: true }
          }
        }
      })

      if (!professional) {
        return NextResponse.json({ error: 'Professional not found for this user' }, { status: 404 })
      }

      return NextResponse.json({ professionals: [professional], professionalOnly: true })
    }

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const professionals = await db.professional.findMany({
      where: { accountId },
      orderBy: { name: 'asc' },
      include: {
        User: {
          select: { id: true, email: true, isActive: true }
        },
        ServiceProfessional: {
          include: { Service: true }
        }
      }
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
    let { accountId, name, phone, email, color, createUserAccount, userPassword, services } = body

    // Fallback: try x-account-id header from authFetch
    if (!accountId) {
      accountId = request.headers.get('x-account-id')
    }

    if (!accountId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let linkedUserId: string | null = null

    // If email is provided and createUserAccount is true (or implied),
    // create a User account with role "professional" and link them
    if (email && createUserAccount !== false) {
      // Check if a user with this email already exists
      const existingUser = await db.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        // If user exists and doesn't have a professional link, we can link them
        const existingProfessional = await db.professional.findUnique({
          where: { userId: existingUser.id }
        })

        if (!existingProfessional) {
          // Link existing user to new professional
          linkedUserId = existingUser.id
          // Update user role to include professional access
          if (existingUser.role === 'owner') {
            // Don't change owner role
          } else {
            await db.user.update({
              where: { id: existingUser.id },
              data: { role: 'professional' }
            })
          }
        }
        // If user already has a professional link, skip user creation
      } else {
        // Create new user with role "professional"
        const passwordToUse = userPassword || generateTemporaryPassword()
        const hashedPassword = await hashPassword(passwordToUse)

        const newUser = await db.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            phone: phone || null,
            role: 'professional',
            isActive: true,
          }
        })

        linkedUserId = newUser.id
      }
    }

    const professional = await db.professional.create({
      data: {
        accountId,
        name,
        phone,
        email,
        color: color || '#10B981',
        isActive: true,
        userId: linkedUserId,
        ...(services && services.length > 0 && {
          ServiceProfessional: {
            create: services.map((serviceId: string) => ({
              serviceId,
            })),
          },
        }),
      },
      include: {
        User: {
          select: { id: true, email: true, isActive: true }
        },
        ServiceProfessional: {
          include: { Service: true }
        }
      }
    })

    return NextResponse.json({ 
      professional,
      userCreated: !!linkedUserId,
      message: linkedUserId 
        ? 'Profissional criado com acesso ao sistema. Eles podem fazer login com o email cadastrado.'
        : 'Profissional criado sem acesso ao sistema.'
    })
  } catch (error) {
    console.error('Error creating professional:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, phone, email, color, isActive, createUserAccount, userPassword, unlinkUser, services } = body

    if (!id) {
      return NextResponse.json({ error: 'Professional ID required' }, { status: 400 })
    }

    const existingProfessional = await db.professional.findUnique({
      where: { id },
      include: {
        User: {
          select: { id: true, email: true, isActive: true, name: true, phone: true, role: true }
        }
      }
    })

    if (!existingProfessional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    
    // Only include fields that are explicitly provided (not undefined)
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone || null
    if (email !== undefined) updateData.email = email || null
    if (color !== undefined) updateData.color = color
    if (isActive !== undefined) updateData.isActive = isActive

    // Handle user linking/unlinking
    if (unlinkUser && existingProfessional.userId) {
      // Unlink the user account
      updateData.userId = null
      // Optionally deactivate the user
      if (existingProfessional.User) {
        await db.user.update({
          where: { id: existingProfessional.userId },
          data: { isActive: false }
        })
      }
    } else if (createUserAccount && email && !existingProfessional.userId) {
      // Link or create user account
      const existingUser = await db.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        const existingLink = await db.professional.findUnique({
          where: { userId: existingUser.id }
        })
        if (!existingLink) {
          updateData.userId = existingUser.id
        }
      } else {
        const passwordToUse = userPassword || generateTemporaryPassword()
        const hashedPassword = await hashPassword(passwordToUse)

        const newUser = await db.user.create({
          data: {
            email,
            password: hashedPassword,
            name: name || existingProfessional.name,
            phone: phone || existingProfessional.phone,
            role: 'professional',
            isActive: true,
          }
        })
        updateData.userId = newUser.id
      }
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key]
    })

    // Handle services association
    if (services !== undefined) {
      // Delete existing service associations
      await db.serviceProfessional.deleteMany({
        where: { professionalId: id }
      })

      // Create new service associations
      if (Array.isArray(services) && services.length > 0) {
        // Validate that all serviceIds exist
        const validServices = await db.service.findMany({
          where: { id: { in: services }, accountId: existingProfessional.accountId },
          select: { id: true }
        })
        const validServiceIds = validServices.map(s => s.id)
        
        if (validServiceIds.length > 0) {
          await db.serviceProfessional.createMany({
            data: validServiceIds.map((serviceId: string) => ({
              professionalId: id,
              serviceId,
            })),
            skipDuplicates: true,
          })
        }
      }
    }

    const professional = await db.professional.update({
      where: { id },
      data: updateData,
      include: {
        User: {
          select: { id: true, email: true, isActive: true }
        },
        ServiceProfessional: {
          include: { Service: true }
        }
      }
    })

    return NextResponse.json({ professional })
  } catch (error) {
    console.error('Error updating professional:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    // Provide more specific error for Prisma unique constraint violations
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return NextResponse.json({ error: 'Conflito: já existe um profissional com esses dados', details: message }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const unlinkUser = searchParams.get('unlinkUser') === 'true'

    if (!id) {
      return NextResponse.json({ error: 'Professional ID required' }, { status: 400 })
    }

    // Get the professional to check for linked user
    const professional = await db.professional.findUnique({
      where: { id },
      include: { User: true }
    })

    if (professional?.userId && professional.User) {
      if (unlinkUser) {
        // Deactivate the linked user account
        await db.user.update({
          where: { id: professional.userId },
          data: { isActive: false }
        })
      }
      // Unlink before deleting professional (due to SetNull)
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

// Generate a temporary password for professional user accounts
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const length = 10
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
