import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function initialize() {
  console.log('=== Inicializando Sistema ===');
  
  // 1. Criar SuperAdmin
  const hashedPassword = await bcrypt.hash('@!Isa46936698', 10);
  
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'superadmin' } });
  
  if (!existingAdmin) {
    const superAdmin = await prisma.user.create({
      data: {
        email: 'netlinkassist@gmail.com',
        name: 'Super Admin',
        password: hashedPassword,
        role: 'superadmin',
        // emailVerified is not a field in the User model
      }
    });
    console.log('✅ SuperAdmin criado:', superAdmin.email);
  } else {
    console.log('✅ SuperAdmin já existe:', existingAdmin.email);
  }
  
  // 2. Criar configurações da Evolution API
  // Check if system configuration already exists
  const existingConfig = await prisma.systemConfiguration.findFirst();
  if (!existingConfig) {
    await prisma.systemConfiguration.create({
      data: {
        evolutionApiUrl: 'http://95.111.231.60:8080',
        evolutionApiKey: 'AGEND!A_zAP_2026@01070801',
        evolutionWebhookUrl: 'https://agendazap-ai.vercel.app/api/webhooks/evolution',
      }
    });
    console.log('✅ Configuração do sistema salva');
  } else {
    console.log('✅ Configuração do sistema já existe');
  }
  
  // 3. Criar planos de assinatura
  const plans = [
    {
      name: 'basico',
      displayName: 'Básico',
      description: 'Para profissionais autônomos',
      priceMonthly: 4990,
      priceYearly: 47880,
      maxProfessionals: 1,
      maxServices: 10,
      maxAppointmentsMonth: 100,
      maxClients: 200,
      features: ['whatsapp', 'appointments', 'clients'],
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'profissional',
      displayName: 'Profissional',
      description: 'Para pequenas equipes',
      priceMonthly: 9990,
      priceYearly: 95880,
      maxProfessionals: 3,
      maxServices: 30,
      maxAppointmentsMonth: 500,
      maxClients: 1000,
      features: ['whatsapp', 'appointments', 'clients', 'ai', 'reports'],
      isActive: true,
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: 'salao',
      displayName: 'Salão',
      description: 'Para salões e clínicas',
      priceMonthly: 19990,
      priceYearly: 191880,
      maxProfessionals: 10,
      maxServices: 100,
      maxAppointmentsMonth: 2000,
      maxClients: 5000,
      features: ['whatsapp', 'appointments', 'clients', 'ai', 'reports', 'mercadoPago'],
      isActive: true,
      sortOrder: 3,
    },
    {
      name: 'empresa',
      displayName: 'Empresa',
      description: 'Para grandes operações',
      priceMonthly: 39990,
      priceYearly: 383880,
      maxProfessionals: -1,
      maxServices: -1,
      maxAppointmentsMonth: -1,
      maxClients: -1,
      features: ['whatsapp', 'appointments', 'clients', 'ai', 'reports', 'mercadoPago', 'nfse', 'api'],
      isActive: true,
      sortOrder: 4,
    },
  ];
  
  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: plan.name } });
    if (!existing) {
      await prisma.subscriptionPlan.create({ data: plan });
      console.log('✅ Plano criado:', plan.displayName);
    } else {
      console.log('✅ Plano já existe:', plan.displayName);
    }
  }
  
  console.log('\n=== Inicialização Completa! ===');
}

initialize()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Erro:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
