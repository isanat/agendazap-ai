import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file with override to ensure correct DATABASE_URL
config({ path: resolve(process.cwd(), '.env'), override: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const prisma = new PrismaClient({
  datasourceUrl: databaseUrl
});

async function main() {
  console.log('📦 Criando planos de assinatura...\n');

  const plans = [
    {
      name: 'basic',
      displayName: 'Básico',
      description: 'Ideal para profissionais autônomos',
      priceMonthly: 49.90,
      priceYearly: 478.80,
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
      isPopular: false,
      sortOrder: 1
    },
    {
      name: 'pro',
      displayName: 'Profissional',
      description: 'Para pequenos negócios em crescimento',
      priceMonthly: 99.90,
      priceYearly: 958.80,
      maxProfessionals: 3,
      maxServices: 25,
      maxAppointmentsMonth: 500,
      maxClients: 2000,
      includeWhatsApp: true,
      includeAiAssistant: true,
      includeMercadoPago: true,
      includeNfsE: false,
      includeReports: true,
      includeCustomDomain: false,
      includePrioritySupport: false,
      isPopular: true,
      sortOrder: 2
    },
    {
      name: 'salon',
      displayName: 'Salão',
      description: 'Perfeito para salões e clínicas',
      priceMonthly: 199.90,
      priceYearly: 1918.80,
      maxProfessionals: 10,
      maxServices: 50,
      maxAppointmentsMonth: 2000,
      maxClients: 10000,
      includeWhatsApp: true,
      includeAiAssistant: true,
      includeMercadoPago: true,
      includeNfsE: true,
      includeReports: true,
      includeCustomDomain: true,
      includePrioritySupport: true,
      isPopular: false,
      sortOrder: 3
    },
    {
      name: 'enterprise',
      displayName: 'Empresa',
      description: 'Para grandes empresas e franquias',
      priceMonthly: 399.90,
      priceYearly: 3838.80,
      maxProfessionals: -1, // Ilimitado
      maxServices: -1,
      maxAppointmentsMonth: -1,
      maxClients: -1,
      includeWhatsApp: true,
      includeAiAssistant: true,
      includeMercadoPago: true,
      includeNfsE: true,
      includeReports: true,
      includeCustomDomain: true,
      includePrioritySupport: true,
      isPopular: false,
      sortOrder: 4
    }
  ];

  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { name: plan.name }
    });

    if (existing) {
      console.log(`✅ Plano "${plan.displayName}" já existe`);
      continue;
    }

    await prisma.subscriptionPlan.create({ data: plan });
    console.log(`✅ Plano "${plan.displayName}" criado - R$ ${plan.priceMonthly}/mês`);
  }

  console.log('\n✅ Planos criados com sucesso!');
}

main()
  .catch(e => console.error('ERRO:', e))
  .finally(() => prisma.$disconnect());
