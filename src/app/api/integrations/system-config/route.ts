import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    // Check for authorization - superadmin OR owner of an account
    const cookieHeader = request.headers.get('cookie');
    
    let isAuthorized = false;
    
    if (cookieHeader) {
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach(cookie => {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          cookies[trimmed.substring(0, equalIndex)] = trimmed.substring(equalIndex + 1);
        }
      });
      
      if (cookies['agendazap_session']) {
        try {
          const { verifyAccessToken } = await import('@/lib/jwt');
          const payload = await verifyAccessToken(cookies['agendazap_session']);
          if (payload && (payload.role === 'superadmin' || payload.role === 'owner')) {
            isAuthorized = true;
          }
        } catch {
          // Token invalid
        }
      }
    }
    
    // Also check header-based auth
    if (!isAuthorized) {
      const userId = request.headers.get('x-user-id');
      if (userId) {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (user && (user.role === 'superadmin' || user.role === 'owner')) {
          isAuthorized = true;
        }
      }
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Apenas administradores podem alterar configurações do sistema' }, { status: 403 });
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
