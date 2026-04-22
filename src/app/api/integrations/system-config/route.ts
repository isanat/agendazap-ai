import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

// GET - Buscar configurações do sistema (para tenants)
export async function GET(request: NextRequest) {
  try {
    // Check environment variables first (for Vercel deployment)
    const envEvolutionApiUrl = process.env.EVOLUTION_API_URL;
    const envEvolutionApiKey = process.env.EVOLUTION_API_KEY;
    const hasEnvEvolutionConfig = !!(envEvolutionApiUrl && envEvolutionApiKey);

    // Buscar configuração do sistema
    const config = await db.systemConfiguration.findFirst();
    
    // Determine Evolution API availability
    const evolutionApiAvailable = hasEnvEvolutionConfig || !!(config?.evolutionApiUrl && config?.evolutionApiKey);
    
    // Determine Mercado Pago availability - needs env vars OR DB config
    const hasMercadoPagoEnv = !!(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET && process.env.MP_REDIRECT_URI);
    const hasMercadoPagoDb = !!(config?.mpClientId && config?.mpClientSecret && config?.mpRedirectUri);
    const hasMercadoPago = hasMercadoPagoEnv || hasMercadoPagoDb;
    
    // Return appropriate config with defaults
    const responseConfig = {
      evolutionApiUrl: hasEnvEvolutionConfig ? envEvolutionApiUrl : config?.evolutionApiUrl || null,
      evolutionApiAvailable,
      enableAiAssistant: config?.enableAiAssistant ?? true,
      enableMercadoPago: (config?.enableMercadoPago ?? true) && hasMercadoPago,
      // Expose MP config status for setup flow
      mpConfigured: hasMercadoPago,
      mpConfigSource: hasMercadoPagoEnv ? 'env' : (hasMercadoPagoDb ? 'db' : null),
    };

    return NextResponse.json({ config: responseConfig });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    // Return defaults on error
    return NextResponse.json({ 
      config: {
        evolutionApiUrl: null,
        evolutionApiAvailable: false,
        enableAiAssistant: true,
        enableMercadoPago: true,
        mpConfigured: false,
        mpConfigSource: null,
      }
    });
  }
}

// PUT - Update system configuration (superadmin or owner)
export async function PUT(request: NextRequest) {
  try {
    // Use the proper auth helper that supports both JWT cookie and header-based auth
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verify user exists in DB and has proper role
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: { Account: true }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Usuário não encontrado ou inativo' }, { status: 401 });
    }

    // Allow both superadmin and owner roles
    if (user.role !== 'superadmin' && user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Apenas administradores podem alterar configurações do sistema' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { mpClientId, mpClientSecret, mpRedirectUri, enableMercadoPago } = body;
    
    // Update or create system configuration
    const existing = await db.systemConfiguration.findFirst();
    
    if (existing) {
      await db.systemConfiguration.update({
        where: { id: existing.id },
        data: {
          ...(mpClientId !== undefined ? { mpClientId } : {}),
          ...(mpClientSecret !== undefined ? { mpClientSecret } : {}),
          ...(mpRedirectUri !== undefined ? { mpRedirectUri } : {}),
          ...(enableMercadoPago !== undefined ? { enableMercadoPago } : {}),
        },
      });
    } else {
      await db.systemConfiguration.create({
        data: {
          mpClientId: mpClientId || null,
          mpClientSecret: mpClientSecret || null,
          mpRedirectUri: mpRedirectUri || null,
          enableMercadoPago: enableMercadoPago ?? true,
        },
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return NextResponse.json(
      { error: 'Falha ao salvar configurações' },
      { status: 500 }
    );
  }
}
