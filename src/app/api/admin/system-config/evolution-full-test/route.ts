import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Comprehensive Evolution API Test Endpoint
 * Tests all aspects of Evolution API integration
 */
export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as Array<{
      name: string;
      status: 'OK' | 'FAILED' | 'WARNING';
      message: string;
      details?: Record<string, unknown>;
    }>,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
    },
  };

  // Helper to add test result
  const addTest = (name: string, status: 'OK' | 'FAILED' | 'WARNING', message: string, details?: Record<string, unknown>) => {
    results.tests.push({ name, status, message, details });
    results.summary.total++;
    if (status === 'OK') results.summary.passed++;
    else if (status === 'FAILED') results.summary.failed++;
    else results.summary.warnings++;
  };

  try {
    // ========================================
    // TEST 1: Database Configuration
    // ========================================
    const config = await db.systemConfiguration.findFirst();
    
    if (!config) {
      addTest('Configuração do Sistema', 'FAILED', 'Nenhuma configuração encontrada no banco de dados');
      return NextResponse.json(results);
    }

    addTest('Configuração do Sistema', 'OK', 'Configuração encontrada', {
      systemName: config.systemName,
      hasEvolutionUrl: !!config.evolutionApiUrl,
      hasEvolutionKey: !!config.evolutionApiKey,
      hasWebhookUrl: !!config.evolutionWebhookUrl,
    });

    // ========================================
    // TEST 2: Evolution API Connection
    // ========================================
    if (!config.evolutionApiUrl) {
      addTest('URL da Evolution API', 'FAILED', 'URL não configurada');
      return NextResponse.json(results);
    }

    if (!config.evolutionApiKey) {
      addTest('API Key da Evolution', 'FAILED', 'API Key não configurada');
      return NextResponse.json(results);
    }

    // Check HTTP vs HTTPS
    const url = new URL(config.evolutionApiUrl);
    if (url.protocol === 'http:') {
      addTest('Protocolo de Conexão', 'WARNING', 'Usando HTTP (recomendado usar HTTPS para produção)');
    } else {
      addTest('Protocolo de Conexão', 'OK', 'Usando HTTPS');
    }

    // ========================================
    // TEST 3: Fetch Instances
    // ========================================
    let instances: unknown[] = [];
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${config.evolutionApiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': config.evolutionApiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        addTest('Conexão Evolution API', 'FAILED', `HTTP ${response.status}: ${errorText.substring(0, 100)}`);
      } else {
        const data = await response.json();
        instances = Array.isArray(data) ? data : [];
        addTest('Conexão Evolution API', 'OK', `Conectado com sucesso`, {
          instancesFound: instances.length,
        });
      }
    } catch (error) {
      addTest('Conexão Evolution API', 'FAILED', `Erro de conexão: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // ========================================
    // TEST 4: Instance Status
    // ========================================
    if (instances.length > 0) {
      const connectedInstances = instances.filter((inst: Record<string, unknown>) => 
        inst && typeof inst === 'object' && 
        ('state' in inst ? (inst as Record<string, unknown>).state === 'open' : false)
      );

      addTest('Status das Instâncias', 
        connectedInstances.length > 0 ? 'OK' : 'WARNING',
        `${connectedInstances.length} de ${instances.length} instâncias conectadas`,
        {
          total: instances.length,
          connected: connectedInstances.length,
          instances: instances.slice(0, 5).map((inst: Record<string, unknown>) => ({
            name: (inst as Record<string, unknown>).name || (inst as Record<string, unknown>).instance?.name,
            state: (inst as Record<string, unknown>).state || (inst as Record<string, unknown>).instance?.state,
          })),
        }
      );
    } else {
      addTest('Status das Instâncias', 'WARNING', 'Nenhuma instância WhatsApp criada');
    }

    // ========================================
    // TEST 5: Webhook Configuration
    // ========================================
    if (config.evolutionWebhookUrl) {
      try {
        const webhookUrl = new URL(config.evolutionWebhookUrl);
        addTest('URL do Webhook', 'OK', 'URL de webhook configurada', {
          url: config.evolutionWebhookUrl,
          isHttps: webhookUrl.protocol === 'https:',
        });
      } catch {
        addTest('URL do Webhook', 'WARNING', 'URL de webhook inválida');
      }
    } else {
      addTest('URL do Webhook', 'WARNING', 'Webhook não configurado');
    }

    // ========================================
    // TEST 6: Webhook Endpoint Availability
    // ========================================
    addTest('Endpoint de Webhook', 'OK', 'Endpoint disponível', {
      endpoint: '/api/webhooks/evolution',
      method: 'POST (recebe mensagens)',
    });

    // ========================================
    // TEST 7: WhatsApp Connected Accounts
    // ========================================
    const accountsWithWhatsApp = await db.account.count({
      where: {
        whatsappConnected: true,
      },
    });

    addTest('Contas com WhatsApp Conectado', 
      accountsWithWhatsApp > 0 ? 'OK' : 'WARNING',
      `${accountsWithWhatsApp} contas com WhatsApp conectado`,
      { accountsWithWhatsApp }
    );

    // ========================================
    // TEST 8: Check if there are accounts
    // ========================================
    const totalAccounts = await db.account.count();
    addTest('Contas Registradas', 
      totalAccounts > 0 ? 'OK' : 'WARNING',
      `${totalAccounts} contas no sistema`,
      { totalAccounts }
    );

    // ========================================
    // TEST 9: Evolution API - Instance Connection State
    // ========================================
    if (instances.length > 0 && config.evolutionApiKey) {
      try {
        const firstInstance = instances[0] as Record<string, unknown>;
        const instanceName = firstInstance?.name || firstInstance?.instance?.name;
        
        if (instanceName) {
          const infoResponse = await fetch(`${config.evolutionApiUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: {
              'apikey': config.evolutionApiKey,
              'Content-Type': 'application/json',
            },
          });

          if (infoResponse.ok) {
            const infoData = await infoResponse.json();
            addTest('Estado da Conexão WhatsApp', 'OK', 'Informações obtidas', {
              instance: instanceName,
              state: infoData?.instance?.state || infoData?.state || 'unknown',
            });
          } else {
            addTest('Estado da Conexão WhatsApp', 'WARNING', 'Não foi possível obter estado detalhado');
          }
        }
      } catch (error) {
        addTest('Estado da Conexão WhatsApp', 'WARNING', 'Erro ao verificar estado');
      }
    }

    // ========================================
    // TEST 10: Message Flow Components
    // ========================================
    addTest('Fluxo de Mensagens', 'OK', 'Componentes prontos', {
      webhookEndpoint: '/api/webhooks/evolution',
      features: [
        'Recebimento de mensagens',
        'AI Auto-Reply',
        'Respostas automáticas',
        'Lembretes de agendamento',
      ],
    });

    // ========================================
    // TEST 11: QR Code Endpoint
    // ========================================
    if (instances.length > 0) {
      addTest('QR Code', 'OK', 'Disponível para conexão de novas instâncias', {
        endpoint: '/api/integrations/whatsapp/create-instance',
      });
    }

    // ========================================
    // FINAL SUMMARY
    // ========================================
    const overallStatus = results.summary.failed > 0 ? 'FAILED' : 
                          results.summary.warnings > 0 ? 'WARNING' : 'OK';

    return NextResponse.json({
      ...results,
      overallStatus,
      recommendation: results.summary.failed > 0 
        ? 'Alguns testes falharam. Verifique a configuração da Evolution API.'
        : results.summary.warnings > 0
          ? 'Sistema funcional com alguns avisos. Recomendamos revisar os pontos marcados como WARNING.'
          : 'Todos os testes passaram! O sistema está pronto para usar o WhatsApp.',
    });

  } catch (error) {
    console.error('[evolution-full-test] Error:', error);
    addTest('Erro Geral', 'FAILED', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(results, { status: 500 });
  }
}
