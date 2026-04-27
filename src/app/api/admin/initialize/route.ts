import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import type { SubscriptionPlan } from '@prisma/client';

// POST - Inicializar o sistema com superadmin e planos padrão
export async function POST(request: NextRequest) {
  try {
    // Verificar se já existe um superadmin
    const existingSuperAdmin = await db.user.findFirst({
      where: { role: 'superadmin' }
    });

    if (existingSuperAdmin) {
      return NextResponse.json({ 
        error: 'Sistema já inicializado',
        message: 'Já existe um superadmin configurado'
      }, { status: 400 });
    }

    const body = await request.json();
    const { email, password, name } = body;

    // Se não fornecer credenciais, usar padrão
    const superAdminEmail = email || 'admin@agendazap.com';
    const superAdminPassword = password || 'Admin@123456';
    const superAdminName = name || 'Administrador AgendaZap';

    // Criar superadmin com senha hasheada com bcrypt
    const hashedPassword = await hashPassword(superAdminPassword);
    
    const superAdmin = await db.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: superAdminName,
        role: 'superadmin',
        isActive: true,
      }
    });

    // Criar planos padrão
    const defaultPlans = [
      {
        name: 'free',
        displayName: 'Gratuito',
        description: 'Perfeito para experimentar',
        priceMonthly: 0,
        priceYearly: 0,
        maxProfessionals: 1,
        maxServices: 5,
        maxAppointmentsMonth: 50,
        maxClients: 100,
        maxAiTokensMonth: 500000,
        aiModelType: 'basic',
        includeWhatsApp: true,
        includeAiAssistant: false,
        includeMercadoPago: false,
        includeNfsE: false,
        includeReports: false,
        includeCustomDomain: false,
        includePrioritySupport: false,
        isActive: true,
        isPopular: false,
        sortOrder: 0,
      },
      {
        name: 'starter',
        displayName: 'Starter',
        description: 'Perfeito para profissionais autônomos',
        priceMonthly: 49.90,
        priceYearly: 478.80,
        maxProfessionals: 1,
        maxServices: 10,
        maxAppointmentsMonth: 100,
        maxClients: 500,
        maxAiTokensMonth: 1500000,
        aiModelType: 'basic',
        includeWhatsApp: true,
        includeAiAssistant: true,
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
        displayName: 'Pro',
        description: 'Ideal para pequenos negócios',
        priceMonthly: 99.90,
        priceYearly: 958.80,
        maxProfessionals: 3,
        maxServices: 30,
        maxAppointmentsMonth: 500,
        maxClients: 2000,
        maxAiTokensMonth: 3000000,
        aiModelType: 'basic',
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
        name: 'business',
        displayName: 'Business',
        description: 'Para salões e clínicas estéticas',
        priceMonthly: 199.90,
        priceYearly: 1918.80,
        maxProfessionals: 10,
        maxServices: 100,
        maxAppointmentsMonth: 2000,
        maxClients: 10000,
        maxAiTokensMonth: 5000000,
        aiModelType: 'premium',
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
        displayName: 'Enterprise',
        description: 'Para redes e grandes negócios',
        priceMonthly: 499.90,
        priceYearly: 4798.80,
        maxProfessionals: 50,
        maxServices: 500,
        maxAppointmentsMonth: 10000,
        maxClients: 50000,
        maxAiTokensMonth: 10000000,
        aiModelType: 'premium',
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

    const createdPlans: SubscriptionPlan[] = [];
    for (const plan of defaultPlans) {
      const created = await db.subscriptionPlan.create({ data: plan });
      createdPlans.push(created);
    }

    // Criar configuração do sistema
    const systemConfig = await db.systemConfiguration.create({
      data: {
        systemName: 'AgendaZap',
        platformFeePercent: 5,
        platformFeeFixed: 0.50,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sistema inicializado com sucesso!',
      superAdmin: {
        id: superAdmin.id,
        email: superAdminEmail,
        password: superAdminPassword, // Retornar para o usuário ver
        name: superAdminName,
      },
      plans: createdPlans.map(p => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        priceMonthly: p.priceMonthly,
      })),
      systemConfig: {
        id: systemConfig.id,
        systemName: systemConfig.systemName,
      }
    });
  } catch (error) {
    console.error('Erro ao inicializar sistema:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Verificar status da inicialização
export async function GET() {
  try {
    const superAdmin = await db.user.findFirst({
      where: { role: 'superadmin' }
    });

    const plansCount = await db.subscriptionPlan.count();
    const systemConfig = await db.systemConfiguration.findFirst();

    return NextResponse.json({
      initialized: !!superAdmin,
      hasSuperAdmin: !!superAdmin,
      hasPlans: plansCount > 0,
      plansCount,
      hasSystemConfig: !!systemConfig,
      superAdminEmail: superAdmin?.email || null,
    });
  } catch (error) {
    console.error('Erro ao verificar inicialização:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
