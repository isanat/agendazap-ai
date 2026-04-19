import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

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

    const createdPlans = [];
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
