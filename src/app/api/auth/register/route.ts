import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, phone, businessName, whatsappNumber, businessType, acceptTerms } = body

    // Validation
    if (!email || !password || !name || !businessName || !whatsappNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate acceptTerms
    if (!acceptTerms) {
      return NextResponse.json(
        { error: 'Você deve aceitar os Termos de Uso e a Política de Privacidade' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      )
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'A senha deve conter pelo menos uma letra maiúscula' },
        { status: 400 }
      )
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: 'A senha deve conter pelo menos uma letra minúscula' },
        { status: 400 }
      )
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'A senha deve conter pelo menos um número' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password with bcrypt
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'owner',
      }
    })

    // Create account
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    const account = await db.account.create({
      data: {
        businessName,
        businessType: businessType || 'salon',
        whatsappNumber,
        ownerId: user.id,
        plan: 'basic',
        trialEndsAt,
        welcomeMessage: 'Olá! Bem-vindo ao {business_name}. Como posso ajudar você hoje?',
        confirmationMessage: 'Perfeito! Seu agendamento está confirmado para {date} às {time} com {professional}. Te esperamos!',
        reminderMessage: 'Olá {client_name}! Lembrete: você tem um agendamento em 2h às {time}.',
        noShowMessage: 'Infelizmente você não compareceu ao seu agendamento. Uma taxa de R$ {fee} foi gerada. Clique aqui para pagar via PIX.',
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      account: {
        id: account.id,
        businessName: account.businessName,
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
