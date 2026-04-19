import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  console.log('[test-evolution] Starting test...');

  try {
    const authUser = await getAuthUser(request);
    console.log('[test-evolution] Auth user:', authUser ? { id: authUser.id, email: authUser.email } : null);

    if (!authUser) {
      console.log('[test-evolution] Unauthorized - no auth user');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check database connection
    let user;
    try {
      user = await db.user.findUnique({
        where: { id: authUser.id }
      });
      console.log('[test-evolution] DB user found:', user ? { id: user.id, email: user.email, role: user.role } : null);
    } catch (dbError) {
      console.error('[test-evolution] Database error:', dbError);
      return NextResponse.json({
        error: 'Erro de conexão com o banco de dados',
        details: dbError instanceof Error ? dbError.message : 'Unknown DB error'
      }, { status: 500 });
    }

    // Allow superadmin or owner to test Evolution API
    if (!user) {
      console.log('[test-evolution] User not found in database:', authUser.id);
      return NextResponse.json({ error: 'Usuário não encontrado no banco de dados' }, { status: 404 });
    }

    if (user.role !== 'superadmin' && user.role !== 'owner') {
      console.log('[test-evolution] Access denied - user role:', user.role);
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      console.log('[test-evolution] Invalid JSON body');
      return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
    }

    const { evolutionApiUrl, evolutionApiKey } = body;

    // Get URL from request or from saved config
    const apiUrl = evolutionApiUrl || (await db.systemConfiguration.findFirst())?.evolutionApiUrl;
    const apiKey = evolutionApiKey || (await db.systemConfiguration.findFirst())?.evolutionApiKey;

    console.log('[test-evolution] Testing connection to:', apiUrl);

    if (!apiUrl) {
      return NextResponse.json({ error: 'URL da API não configurada' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(apiUrl);
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // Test connection to Evolution API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiKey || '',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('[test-evolution] Connection successful, instances:', Array.isArray(data) ? data.length : 0);
        return NextResponse.json({
          success: true,
          message: 'Conexão bem-sucedida',
          instances: Array.isArray(data) ? data.length : 0
        });
      } else {
        const errorText = await response.text();
        console.log('[test-evolution] Evolution API error:', response.status, errorText);
        return NextResponse.json({
          error: `Erro na conexão com Evolution API: ${response.status}`,
          details: errorText.substring(0, 200)
        }, { status: 400 });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({
          error: 'Timeout: O servidor Evolution não respondeu em 10 segundos'
        }, { status: 408 });
      }

      console.error('[test-evolution] Fetch error:', fetchError);
      return NextResponse.json({
        error: 'Não foi possível conectar ao servidor Evolution',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
      }, { status: 502 });
    }
  } catch (error) {
    console.error('[test-evolution] Unexpected error:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
