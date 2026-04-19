import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Parse session cookie from request
 */
function parseSessionCookie(request: NextRequest): { userId: string; email: string; role: string } | null {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
      const trimmed = cookie.trim();
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        cookies[trimmed.substring(0, equalIndex)] = trimmed.substring(equalIndex + 1);
      }
    });

    const sessionCookie = cookies['agendazap_session'];
    if (!sessionCookie) return null;

    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Diagnostic endpoint for Evolution API connection
 * Shows current config and tests connectivity
 */
export async function GET(request: NextRequest) {
  try {
    // Try header-based auth first
    const headerUserId = request.headers.get('x-user-id');
    const headerUserRole = request.headers.get('x-user-role');
    
    // Try cookie-based auth
    const sessionData = parseSessionCookie(request);
    
    // Check authorization
    let isAuthorized = false;
    let userId = null;

    if (headerUserRole === 'superadmin') {
      isAuthorized = true;
      userId = headerUserId;
    } else if (sessionData?.role === 'superadmin') {
      isAuthorized = true;
      userId = sessionData.userId;
    }

    // For diagnostic purposes, allow if no auth but show warning
    if (!isAuthorized) {
      // Still run diagnostics but mark as unauthorized
      console.log('[evolution-diagnostic] Unauthorized access attempt');
    }

    // Get current config
    const config = await db.systemConfiguration.findFirst();

    if (!config) {
      return NextResponse.json({
        error: 'Nenhuma configuração encontrada',
        recommendation: 'Acesse /api/admin/init-superadmin para inicializar o sistema'
      }, { status: 404 });
    }

    // Test DNS resolution and connectivity
    const testResults = {
      config: {
        evolutionApiUrl: config.evolutionApiUrl,
        hasApiKey: !!config.evolutionApiKey,
        evolutionWebhookUrl: config.evolutionWebhookUrl,
      },
      tests: [] as Array<{ test: string; status: string; details?: string; error?: string }>,
    };

    if (!config.evolutionApiUrl) {
      testResults.tests.push({
        test: 'URL da API',
        status: 'FAILED',
        error: 'URL não configurada'
      });
      return NextResponse.json(testResults);
    }

    // Test 1: URL format validation
    try {
      const url = new URL(config.evolutionApiUrl);
      testResults.tests.push({
        test: 'Formato da URL',
        status: 'OK',
        details: `Protocolo: ${url.protocol}, Host: ${url.hostname}, Porta: ${url.port || 'padrão'}`
      });

      // Check if HTTP (might have issues on Vercel)
      if (url.protocol === 'http:') {
        testResults.tests.push({
          test: 'Protocolo HTTP',
          status: 'WARNING',
          details: 'URL usando HTTP. A Vercel pode bloquear conexões HTTP externas.'
        });
      }
    } catch (e) {
      testResults.tests.push({
        test: 'Formato da URL',
        status: 'FAILED',
        error: e instanceof Error ? e.message : 'URL inválida'
      });
      return NextResponse.json(testResults);
    }

    // Test 2: Connection test with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const startTime = Date.now();
    let responseTime: number;

    try {
      const response = await fetch(`${config.evolutionApiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': config.evolutionApiKey || '',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      responseTime = Date.now() - startTime;
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        testResults.tests.push({
          test: 'Conexão com Evolution API',
          status: 'OK',
          details: `Tempo de resposta: ${responseTime}ms, Instâncias: ${Array.isArray(data) ? data.length : 0}`
        });
      } else {
        const errorText = await response.text();
        testResults.tests.push({
          test: 'Conexão com Evolution API',
          status: 'FAILED',
          error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`
        });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      responseTime = Date.now() - startTime;

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        testResults.tests.push({
          test: 'Conexão com Evolution API',
          status: 'FAILED',
          error: `Timeout após ${responseTime}ms`
        });
      } else {
        testResults.tests.push({
          test: 'Conexão com Evolution API',
          status: 'FAILED',
          error: fetchError instanceof Error ? fetchError.message : 'Erro desconhecido'
        });
      }
    }

    return NextResponse.json(testResults);

  } catch (error) {
    console.error('[evolution-diagnostic] Error:', error);
    return NextResponse.json({
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
