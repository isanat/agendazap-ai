import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

// Helper to verify superadmin or owner access (cookie or header-based)
async function verifyAdminAccess(request: NextRequest) {
  console.log('[system-config] Checking admin access...');

  // Log all incoming headers for debugging
  const headers = Object.fromEntries(request.headers.entries());
  console.log('[system-config] Request headers:', {
    'x-user-id': headers['x-user-id'],
    'x-user-email': headers['x-user-email'],
    'x-user-role': headers['x-user-role'],
    'x-account-id': headers['x-account-id'],
    'cookie': headers['cookie'] ? 'present (length: ' + headers['cookie'].length + ')' : 'not present',
  });

  // First try the standard auth helper
  const authUser = await getAuthUser(request);

  console.log('[system-config] getAuthUser result:', authUser ? { id: authUser.id, email: authUser.email, role: authUser.role } : null);

  if (authUser) {
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: { Account: true }
    });

    console.log('[system-config] DB user found:', user ? { id: user.id, email: user.email, role: user.role } : null);

    if (user && (user.role === 'superadmin' || user.role === 'owner')) {
      console.log('[system-config] Access GRANTED for user:', user.email);
      return { authorized: true, user };
    } else {
      console.log('[system-config] Access DENIED - user role not authorized:', user?.role);
    }
  } else {
    console.log('[system-config] Access DENIED - no auth user found');
  }

  return { authorized: false, user: null };
}

// GET - Buscar configurações do sistema
export async function GET(request: NextRequest) {
  try {
    const { authorized, user } = await verifyAdminAccess(request);
    
    if (!authorized) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar ou criar configuração do sistema
    let config = await db.systemConfiguration.findFirst();
    
    if (!config) {
      config = await db.systemConfiguration.create({
        data: {
          systemName: 'AgendaZap',
        }
      });
    }

    // Merge with environment variables (env vars act as fallback/override)
    const mergedConfig = {
      ...config,
      // Use DB value first, then fallback to env vars
      evolutionApiUrl: config.evolutionApiUrl || process.env.EVOLUTION_API_URL || null,
      evolutionApiKey: config.evolutionApiKey || process.env.EVOLUTION_API_KEY || null,
      evolutionWebhookUrl: config.evolutionWebhookUrl || process.env.EVOLUTION_WEBHOOK_URL || null,
    };

    // Não retornar a API key completa por segurança
    const safeConfig = {
      ...mergedConfig,
      evolutionApiKey: mergedConfig.evolutionApiKey ? '••••••••••••' : null,
      smtpPassword: config.smtpPassword ? '••••••••••••' : null,
    };

    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar configurações do sistema
export async function PUT(request: NextRequest) {
  try {
    const { authorized, user } = await verifyAdminAccess(request);
    
    if (!authorized || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      evolutionApiUrl,
      evolutionApiKey,
      evolutionWebhookUrl,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      emailFrom,
      platformFeePercent,
      platformFeeFixed,
      systemName,
      systemLogo,
      supportEmail,
      supportPhone,
      enableAiAssistant,
      enableGoogleCalendar,
      enableMercadoPago,
      enableNfeGeneration,
    } = body;

    // Buscar configuração existente
    let config = await db.systemConfiguration.findFirst();
    
    if (!config) {
      config = await db.systemConfiguration.create({
        data: {
          systemName: systemName || 'AgendaZap',
        }
      });
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {};
    
    // Só atualizar API key se não for o placeholder
    if (evolutionApiKey && evolutionApiKey !== '••••••••••••') {
      updateData.evolutionApiKey = evolutionApiKey;
    }
    if (evolutionApiUrl !== undefined) updateData.evolutionApiUrl = evolutionApiUrl;
    if (evolutionWebhookUrl !== undefined) updateData.evolutionWebhookUrl = evolutionWebhookUrl;
    
    // SMTP
    if (smtpPassword && smtpPassword !== '••••••••••••') {
      updateData.smtpPassword = smtpPassword;
    }
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
    if (emailFrom !== undefined) updateData.emailFrom = emailFrom;
    
    // Taxas
    if (platformFeePercent !== undefined) updateData.platformFeePercent = platformFeePercent;
    if (platformFeeFixed !== undefined) updateData.platformFeeFixed = platformFeeFixed;
    
    // Configurações gerais
    if (systemName !== undefined) updateData.systemName = systemName;
    if (systemLogo !== undefined) updateData.systemLogo = systemLogo;
    if (supportEmail !== undefined) updateData.supportEmail = supportEmail;
    if (supportPhone !== undefined) updateData.supportPhone = supportPhone;
    
    // Feature flags
    if (enableAiAssistant !== undefined) updateData.enableAiAssistant = enableAiAssistant;
    if (enableGoogleCalendar !== undefined) updateData.enableGoogleCalendar = enableGoogleCalendar;
    if (enableMercadoPago !== undefined) updateData.enableMercadoPago = enableMercadoPago;
    if (enableNfeGeneration !== undefined) updateData.enableNfeGeneration = enableNfeGeneration;

    // Atualizar
    const updated = await db.systemConfiguration.update({
      where: { id: config.id },
      data: updateData
    });

    return NextResponse.json({ 
      config: {
        ...updated,
        evolutionApiKey: updated.evolutionApiKey ? '••••••••••••' : null,
        smtpPassword: updated.smtpPassword ? '••••••••••••' : null,
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
