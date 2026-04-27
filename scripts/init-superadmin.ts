import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Initializing system...');

  // Check if superadmin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'superadmin' }
  });

  if (existingSuperAdmin) {
    console.log('SuperAdmin already exists:', existingSuperAdmin.email);
    
    // Check if password needs migration to bcrypt
    if (!existingSuperAdmin.password.startsWith('$2')) {
      console.log('Migrating password to bcrypt...');
      const hashedPassword = await hash('@!Isa46936698', 12);
      await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: { password: hashedPassword }
      });
      console.log('Password migrated to bcrypt!');
    }
    return;
  }

  // Create superadmin with bcrypt hashed password
  const superAdminEmail = 'netlinkassist@gmail.com';
  const superAdminPassword = '@!Isa46936698';
  const superAdminName = 'Super Admin AgendaZap';

  const hashedPassword = await hash(superAdminPassword, 12);

  const superAdmin = await prisma.user.create({
    data: {
      email: superAdminEmail,
      password: hashedPassword,
      name: superAdminName,
      role: 'superadmin',
      isActive: true,
    }
  });

  console.log('SuperAdmin created successfully!');
  console.log('Email:', superAdminEmail);
  console.log('Password:', superAdminPassword);

  // Create default plans if they don't exist
  const plansCount = await prisma.subscriptionPlan.count();
  
  if (plansCount === 0) {
    console.log('Creating default plans...');
    
    const defaultPlans = [
      {
        name: 'basic',
        displayName: 'Básico',
        description: 'Perfeito para profissionais autônomos',
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
        isActive: true,
        isPopular: false,
        sortOrder: 1,
      },
      {
        name: 'pro',
        displayName: 'Profissional',
        description: 'Ideal para pequenos negócios',
        priceMonthly: 99.90,
        priceYearly: 958.80,
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
      },
      {
        name: 'salon',
        displayName: 'Salão',
        description: 'Para salões e clínicas estéticas',
        priceMonthly: 199.90,
        priceYearly: 1918.80,
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
      },
      {
        name: 'enterprise',
        displayName: 'Empresa',
        description: 'Para redes e grandes negócios',
        priceMonthly: 399.90,
        priceYearly: 3838.80,
        maxProfessionals: 50,
        maxServices: 500,
        maxAppointmentsMonth: 10000,
        maxClients: 50000,
        includeWhatsApp: true,
        includeAiAssistant: true,
        includeMercadoPago: true,
        includeNfsE: true,
        includeReports: true,
        includeCustomDomain: true,
        includePrioritySupport: true,
        isActive: true,
        isPopular: false,
        sortOrder: 4,
      },
    ];

    for (const plan of defaultPlans) {
      await prisma.subscriptionPlan.create({ data: plan });
    }
    
    console.log('Default plans created!');
  }

  // Create system configuration if it doesn't exist
  const systemConfig = await prisma.systemConfiguration.findFirst();
  
  if (!systemConfig) {
    await prisma.systemConfiguration.create({
      data: {
        systemName: 'AgendaZap',
        platformFeePercent: 5,
        platformFeeFixed: 0.50,
        // Evolution API credentials
        evolutionApiUrl: 'http://95.111.231.60:8080',
        evolutionApiKey: 'AGEND!A_zAP_2026@01070801',
        evolutionWebhookUrl: 'https://agendazap-ai.vercel.app/api/webhooks/evolution',
      }
    });
    
    console.log('System configuration created with Evolution API credentials!');
  } else {
    // Update with Evolution API credentials
    await prisma.systemConfiguration.update({
      where: { id: systemConfig.id },
      data: {
        evolutionApiUrl: 'http://95.111.231.60:8080',
        evolutionApiKey: 'AGEND!A_zAP_2026@01070801',
        evolutionWebhookUrl: 'https://agendazap-ai.vercel.app/api/webhooks/evolution',
      }
    });
    
    console.log('System configuration updated with Evolution API credentials!');
  }

  console.log('\n=== Initialization Complete ===');
  console.log('SuperAdmin Email:', superAdminEmail);
  console.log('SuperAdmin Password:', superAdminPassword);
  console.log('Evolution API URL: http://95.111.231.60:8080');
  console.log('Evolution API Key: AGEND!A_zAP_2026@01070801');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
