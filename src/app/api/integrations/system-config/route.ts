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
    
    // Return appropriate config with defaults
    const responseConfig = {
      evolutionApiUrl: hasEnvEvolutionConfig ? envEvolutionApiUrl : config?.evolutionApiUrl || null,
      evolutionApiAvailable,
      enableAiAssistant: config?.enableAiAssistant ?? true,
      enableGoogleCalendar: config?.enableGoogleCalendar ?? true,
      enableMercadoPago: config?.enableMercadoPago ?? true,
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
        enableGoogleCalendar: true,
        enableMercadoPago: true,
      }
    });
  }
}
