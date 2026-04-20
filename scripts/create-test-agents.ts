import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env file first
config({ path: resolve(process.cwd(), '.env'), override: true })

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating test agents...')

  const testAgents = [
    {
      businessName: 'Salão Beleza Total',
      businessType: 'salon',
      whatsappNumber: '+55 11 99999-0001',
      ownerName: 'Maria Silva',
      ownerEmail: 'maria@belezatotal.com',
      plan: 'pro',
    },
    {
      businessName: 'Clínica Estética Bella',
      businessType: 'clinic',
      whatsappNumber: '+55 11 99999-0002',
      ownerName: 'Ana Costa',
      ownerEmail: 'ana@clinicabella.com',
      plan: 'salon',
    },
    {
      businessName: 'Barbearia Estilo',
      businessType: 'barbershop',
      whatsappNumber: '+55 11 99999-0003',
      ownerName: 'Carlos Santos',
      ownerEmail: 'carlos@barbeariaestilo.com',
      plan: 'basic',
    },
  ]

  // Get or create subscription plans
  let basicPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'basic' } })
  let proPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'pro' } })
  let salonPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'salon' } })

  if (!basicPlan) {
    basicPlan = await prisma.subscriptionPlan.create({
      data: {
        id: nanoid(),
        name: 'basic',
        displayName: 'Básico',
        description: 'Plano inicial para pequenos negócios',
        priceMonthly: 49.90,
        priceYearly: 499.00,
        maxProfessionals: 1,
        maxServices: 10,
        maxAppointmentsMonth: 100,
        maxClients: 500,
        includeWhatsApp: true,
        includeAiAssistant: false,
        includeMercadoPago: true,
        includeNfsE: false,
        includeReports: true,
        includeCustomDomain: false,
        includePrioritySupport: false,
        isActive: true,
        isPopular: false,
        sortOrder: 1,
        updatedAt: new Date(),
      },
    })
    console.log('Created basic plan')
  }

  if (!proPlan) {
    proPlan = await prisma.subscriptionPlan.create({
      data: {
        id: nanoid(),
        name: 'pro',
        displayName: 'Profissional',
        description: 'Plano completo para negócios em crescimento',
        priceMonthly: 99.90,
        priceYearly: 999.00,
        maxProfessionals: 3,
        maxServices: 30,
        maxAppointmentsMonth: 500,
        maxClients: 2000,
        includeWhatsApp: true,
        includeAiAssistant: true,
        includeMercadoPago: true,
        includeNfsE: false,
        includeReports: true,
        includeCustomDomain: false,
        includePrioritySupport: false,
        isActive: true,
        isPopular: true,
        sortOrder: 2,
        updatedAt: new Date(),
      },
    })
    console.log('Created pro plan')
  }

  if (!salonPlan) {
    salonPlan = await prisma.subscriptionPlan.create({
      data: {
        id: nanoid(),
        name: 'salon',
        displayName: 'Salão',
        description: 'Plano premium para salões de beleza',
        priceMonthly: 199.90,
        priceYearly: 1999.00,
        maxProfessionals: 10,
        maxServices: 100,
        maxAppointmentsMonth: 2000,
        maxClients: 10000,
        includeWhatsApp: true,
        includeAiAssistant: true,
        includeMercadoPago: true,
        includeNfsE: true,
        includeReports: true,
        includeCustomDomain: true,
        includePrioritySupport: true,
        isActive: true,
        isPopular: false,
        sortOrder: 3,
        updatedAt: new Date(),
      },
    })
    console.log('Created salon plan')
  }

  const passwordHash = await hash('Teste@123', 10)

  for (const agent of testAgents) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: agent.ownerEmail },
    })

    if (existingUser) {
      console.log(`User ${agent.ownerEmail} already exists, skipping...`)
      continue
    }

    // Create user
    const userId = nanoid()
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: agent.ownerEmail,
        password: passwordHash,
        name: agent.ownerName,
        role: 'owner',
        isActive: true,
        updatedAt: new Date(),
      },
    })

    // Create account
    const accountId = nanoid()
    const account = await prisma.account.create({
      data: {
        id: accountId,
        businessName: agent.businessName,
        businessType: agent.businessType,
        whatsappNumber: agent.whatsappNumber,
        whatsappConnected: false,
        plan: agent.plan,
        ownerId: userId,
        updatedAt: new Date(),
      },
    })

    // Get the correct plan
    const planMap: Record<string, typeof basicPlan> = {
      basic: basicPlan,
      pro: proPlan,
      salon: salonPlan,
    }
    const selectedPlan = planMap[agent.plan]

    // Create subscription
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    await prisma.accountSubscription.create({
      data: {
        id: nanoid(),
        accountId: accountId,
        planId: selectedPlan.id,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      },
    })

    // Create some sample services
    const services = agent.businessType === 'barbershop' 
      ? [
          { name: 'Corte Masculino', durationMinutes: 30, price: 35.00 },
          { name: 'Barba', durationMinutes: 20, price: 25.00 },
          { name: 'Corte + Barba', durationMinutes: 45, price: 50.00 },
        ]
      : agent.businessType === 'clinic'
      ? [
          { name: 'Limpeza de Pele', durationMinutes: 60, price: 150.00 },
          { name: 'Peeling', durationMinutes: 45, price: 120.00 },
          { name: 'Massagem Relaxante', durationMinutes: 60, price: 100.00 },
        ]
      : [
          { name: 'Corte Feminino', durationMinutes: 45, price: 80.00 },
          { name: 'Manicure', durationMinutes: 30, price: 35.00 },
          { name: 'Pedicure', durationMinutes: 30, price: 35.00 },
          { name: 'Coloração', durationMinutes: 90, price: 150.00 },
        ]

    for (const service of services) {
      await prisma.service.create({
        data: {
          id: nanoid(),
          accountId: accountId,
          name: service.name,
          durationMinutes: service.durationMinutes,
          price: service.price,
          isActive: true,
          updatedAt: new Date(),
        },
      })
    }

    // Create a professional
    await prisma.professional.create({
      data: {
        id: nanoid(),
        accountId: accountId,
        name: agent.ownerName,
        isActive: true,
        updatedAt: new Date(),
      },
    })

    console.log(`Created agent: ${agent.businessName} (${agent.ownerEmail})`)
  }

  console.log('\nTest agents created successfully!')
  console.log('\nLogin credentials for all agents:')
  console.log('Password: Teste@123')
  console.log('\nAgents:')
  for (const agent of testAgents) {
    console.log(`- ${agent.businessName}: ${agent.ownerEmail}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
