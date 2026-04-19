import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando seed de dados de teste...\n');

  // ==========================================
  // 1. CRIAR ACCOUNT AGENDAZAP (A PRÓPRIA EMPRESA)
  // ==========================================
  console.log('📦 Criando Account AgendaZap (empresa do sistema)...');
  
  const agendazapUserId = 'agendazap_system_user';
  const agendazapAccountId = 'agendazap_system_account';
  
  // Criar usuário do AgendaZap
  const agendazapUser = await prisma.user.upsert({
    where: { id: agendazapUserId },
    update: {},
    create: {
      id: agendazapUserId,
      email: 'sistema@agendazap.com',
      password: '$2a$12$AgendaZapSystem2024Hash', // Senha: Sistema@2024
      name: 'Sistema AgendaZap',
      role: 'owner',
      isActive: true,
      updatedAt: new Date(),
    }
  });
  console.log(`  ✅ Usuário: ${agendazapUser.email}`);
  
  // Criar account do AgendaZap
  const agendazapAccount = await prisma.account.upsert({
    where: { id: agendazapAccountId },
    update: {},
    create: {
      id: agendazapAccountId,
      businessName: 'AgendaZap - Sistema de Agendamento',
      businessType: 'technology',
      whatsappNumber: '+5511999999999', // Número fictício para o sistema
      whatsappConnected: false,
      description: 'Sistema de agendamento inteligente com WhatsApp e IA',
      address: 'Av. Paulista, 1000',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01310-100',
      plan: 'enterprise',
      ownerId: agendazapUserId,
      openingTime: '08:00',
      closingTime: '22:00',
      workingDays: '1,2,3,4,5,6,7',
      updatedAt: new Date(),
    }
  });
  console.log(`  ✅ Account: ${agendazapAccount.businessName}`);
  
  // Criar assinatura Enterprise para o AgendaZap
  const enterprisePlan = await prisma.subscriptionPlan.findFirst({
    where: { name: 'enterprise' }
  });
  
  if (enterprisePlan) {
    const now = new Date();
    const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    
    await prisma.accountSubscription.upsert({
      where: { accountId: agendazapAccountId },
      update: {},
      create: {
        id: 'agendazap_subscription',
        accountId: agendazapAccountId,
        planId: enterprisePlan.id,
        status: 'active',
        billingCycle: 'yearly',
        currentPeriodStart: now,
        currentPeriodEnd: oneYearLater,
        updatedAt: new Date(),
      }
    });
    console.log(`  ✅ Assinatura Enterprise criada`);
  }

  // ==========================================
  // 2. CRIAR 3 AGENTES DE TESTE
  // ==========================================
  console.log('\n📦 Criando 3 agentes de teste...\n');
  
  const testAgents = [
    {
      id: 'test_agent_1',
      email: 'barbeiro@teste.com',
      name: 'Carlos Barbeiro',
      businessName: 'Barbearia do Carlos',
      businessType: 'barbershop',
      whatsappNumber: '+5511911111111',
      plan: 'basic' as const,
      address: 'Rua das Facas, 123',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01234-000',
    },
    {
      id: 'test_agent_2',
      email: 'clinica@teste.com',
      name: 'Dra. Maria Santos',
      businessName: 'Clínica Estética Beleza',
      businessType: 'clinic',
      whatsappNumber: '+5511922222222',
      plan: 'salon' as const,
      address: 'Av. Beleza, 456',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '04567-000',
    },
    {
      id: 'test_agent_3',
      email: 'spa@teste.com',
      name: 'João Spa',
      businessName: 'Spa Relaxamento Total',
      businessType: 'spa',
      whatsappNumber: '+5511933333333',
      plan: 'pro' as const,
      address: 'Rua da Paz, 789',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '07890-000',
    },
  ];

  for (const agent of testAgents) {
    console.log(`  🔸 Criando ${agent.businessName}...`);
    
    // Criar usuário
    const user = await prisma.user.upsert({
      where: { id: agent.id },
      update: {},
      create: {
        id: agent.id,
        email: agent.email,
        password: '$2a$12$TestAgent2024Hash', // Senha: Teste@2024
        name: agent.name,
        role: 'owner',
        isActive: true,
        updatedAt: new Date(),
      }
    });
    console.log(`    ✅ Usuário: ${user.email}`);
    
    // Criar account
    const account = await prisma.account.upsert({
      where: { id: `${agent.id}_account` },
      update: {},
      create: {
        id: `${agent.id}_account`,
        businessName: agent.businessName,
        businessType: agent.businessType,
        whatsappNumber: agent.whatsappNumber,
        whatsappConnected: false,
        description: `Estabelecimento de teste: ${agent.businessName}`,
        address: agent.address,
        addressCity: agent.addressCity,
        addressState: agent.addressState,
        addressZipCode: agent.addressZipCode,
        plan: agent.plan,
        ownerId: agent.id,
        openingTime: '09:00',
        closingTime: '18:00',
        workingDays: '1,2,3,4,5',
        updatedAt: new Date(),
      }
    });
    console.log(`    ✅ Account: ${account.businessName}`);
    
    // Criar assinatura
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { name: agent.plan }
    });
    
    if (plan) {
      const now = new Date();
      const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      await prisma.accountSubscription.upsert({
        where: { accountId: `${agent.id}_account` },
        update: {},
        create: {
          id: `${agent.id}_subscription`,
          accountId: `${agent.id}_account`,
          planId: plan.id,
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodStart: now,
          currentPeriodEnd: oneMonthLater,
          updatedAt: new Date(),
        }
      });
      console.log(`    ✅ Assinatura ${plan.displayName} criada`);
    }
    
    // Criar alguns serviços de exemplo
    const services = agent.businessType === 'barbershop' 
      ? [
          { name: 'Corte de Cabelo', duration: 30, price: 35 },
          { name: 'Barba', duration: 20, price: 25 },
          { name: 'Corte + Barba', duration: 45, price: 50 },
        ]
      : agent.businessType === 'clinic'
      ? [
          { name: 'Limpeza de Pele', duration: 60, price: 150 },
          { name: 'Peeling', duration: 45, price: 200 },
          { name: 'Massagem Facial', duration: 30, price: 80 },
        ]
      : [
          { name: 'Massagem Relaxante', duration: 60, price: 120 },
          { name: 'Hidratação', duration: 45, price: 90 },
          { name: 'Dia de Spa', duration: 180, price: 350 },
        ];
    
    for (const svc of services) {
      await prisma.service.upsert({
        where: { id: `${agent.id}_svc_${svc.name.toLowerCase().replace(/\s+/g, '_')}` },
        update: {},
        create: {
          id: `${agent.id}_svc_${svc.name.toLowerCase().replace(/\s+/g, '_')}`,
          accountId: `${agent.id}_account`,
          name: svc.name,
          durationMinutes: svc.duration,
          price: svc.price,
          isActive: true,
          category: 'servico',
          updatedAt: new Date(),
        }
      });
    }
    console.log(`    ✅ ${services.length} serviços criados`);
    
    // Criar um profissional
    await prisma.professional.upsert({
      where: { id: `${agent.id}_prof_1` },
      update: {},
      create: {
        id: `${agent.id}_prof_1`,
        accountId: `${agent.id}_account`,
        name: agent.name,
        isActive: true,
        openingTime: '09:00',
        closingTime: '18:00',
        workingDays: '1,2,3,4,5',
        updatedAt: new Date(),
      }
    });
    console.log(`    ✅ Profissional criado`);
    
    // Criar alguns clientes
    const clientNames = ['Ana Silva', 'Bruno Costa', 'Carla Lima'];
    for (let i = 0; i < clientNames.length; i++) {
      await prisma.client.upsert({
        where: { id: `${agent.id}_client_${i}` },
        update: {},
        create: {
          id: `${agent.id}_client_${i}`,
          accountId: `${agent.id}_account`,
          name: clientNames[i],
          phone: `+55119${90000000 + i}`,
          email: `${clientNames[i].toLowerCase().replace(' ', '.')}@teste.com`,
          updatedAt: new Date(),
        }
      });
    }
    console.log(`    ✅ 3 clientes criados`);
    
    console.log('');
  }

  // ==========================================
  // RESUMO FINAL
  // ==========================================
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 RESUMO FINAL:');
  console.log('═══════════════════════════════════════════════════════');
  
  const totalUsers = await prisma.user.count();
  const totalAccounts = await prisma.account.count();
  const totalSubscriptions = await prisma.accountSubscription.count();
  const totalServices = await prisma.service.count();
  const totalClients = await prisma.client.count();
  const totalProfessionals = await prisma.professional.count();
  
  console.log(`  👤 Total Usuários: ${totalUsers}`);
  console.log(`  🏢 Total Accounts: ${totalAccounts}`);
  console.log(`  💳 Total Assinaturas: ${totalSubscriptions}`);
  console.log(`  🛠️ Total Serviços: ${totalServices}`);
  console.log(`  👥 Total Clientes: ${totalClients}`);
  console.log(`  👔 Total Profissionais: ${totalProfessionals}`);
  
  console.log('\n✅ Seed concluído com sucesso!');
  console.log('\n📝 CREDENCIAIS DE TESTE:');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SuperAdmin: netlinkassist@gmail.com (senha existente)');
  console.log('  AgendaZap: sistema@agendazap.com / Sistema@2024');
  console.log('  Barbeiro: barbeiro@teste.com / Teste@2024');
  console.log('  Clínica: clinica@teste.com / Teste@2024');
  console.log('  Spa: spa@teste.com / Teste@2024');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
