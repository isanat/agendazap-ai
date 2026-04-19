import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL
})

const accountId = 'cmo0lmilq0002la04kpnypmv8'

const services = [
  { name: 'Corte Masculino', description: 'Corte tradicional com máquina e tesoura', durationMinutes: 30, price: 45.0, category: 'corte' },
  { name: 'Corte Feminino', description: 'Corte moderno com técnicas avançadas', durationMinutes: 45, price: 80.0, category: 'corte' },
  { name: 'Barba Completa', description: 'Barba com navalha e toalha quente', durationMinutes: 30, price: 35.0, category: 'barba' },
  { name: 'Corte + Barba', description: 'Combo corte masculino + barba completa', durationMinutes: 60, price: 70.0, category: 'corte' },
  { name: 'Coloração', description: 'Tintura completa com produtos de qualidade', durationMinutes: 90, price: 120.0, category: 'coloracao' },
  { name: 'Mechas', description: 'Mechas luzes ou californianas', durationMinutes: 120, price: 180.0, category: 'coloracao' },
  { name: 'Hidratação', description: 'Tratamento de hidratação profunda', durationMinutes: 45, price: 60.0, category: 'tratamento' },
  { name: 'Botox Capilar', description: 'Tratamento de botox para redução de volume', durationMinutes: 60, price: 150.0, category: 'tratamento' },
  { name: 'Manicure', description: 'Mãos completas com esmaltação', durationMinutes: 45, price: 35.0, category: 'unhas' },
  { name: 'Pedicure', description: 'Pés completos com esmaltação', durationMinutes: 45, price: 40.0, category: 'unhas' },
  { name: 'Design de Sobrancelhas', description: 'Design com henna ou micropigmentação', durationMinutes: 30, price: 45.0, category: 'tratamento' },
  { name: 'Escova', description: 'Escova modeladora', durationMinutes: 30, price: 50.0, category: 'corte' },
]

async function main() {
  console.log('🌱 Seeding services for account:', accountId)
  
  for (const service of services) {
    try {
      const created = await prisma.service.create({
        data: {
          ...service,
          accountId,
          isActive: true
        }
      })
      console.log('✅ Created:', created.name)
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log('⚠️  Already exists:', service.name)
      } else {
        console.error('❌ Error creating', service.name, error.message)
      }
    }
  }
  
  const total = await prisma.service.count({ where: { accountId } })
  console.log(`\n🎉 Done! Total services: ${total}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
