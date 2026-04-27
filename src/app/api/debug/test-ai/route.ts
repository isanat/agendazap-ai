import { NextRequest, NextResponse } from 'next/server';
import { generateChatCompletion, canAccountUseAI } from '@/lib/ai-provider-service';
import { db } from '@/lib/db';

/**
 * Debug endpoint to test AI provider functionality directly
 * This helps diagnose why AI responses might not be working
 * 
 * Query params:
 * - account_id: account ID to test with (required)
 * - message: test message to send (default: "Olá, quero agendar")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const testMessage = searchParams.get('message') || 'Olá, quero agendar um corte de cabelo';
    
    if (!accountId) {
      // Try to find the first account with an active WhatsApp integration
      const integration = await db.integration.findFirst({
        where: { type: 'whatsapp', status: 'connected' },
        select: { accountId: true }
      });
      
      if (integration) {
        return NextResponse.json({
          hint: 'account_id is required. Found a connected account:',
          account_id: integration.accountId,
          example: `/api/debug/test-ai?account_id=${integration.accountId}`,
        });
      }
      
      return NextResponse.json({ 
        error: 'account_id is required',
        hint: 'No connected WhatsApp accounts found either'
      }, { status: 400 });
    }
    
    const startTime = Date.now();
    
    // Step 1: Check if account can use AI
    const canUse = await canAccountUseAI(accountId);
    if (!canUse.allowed) {
      return NextResponse.json({
        step: 'account_check',
        success: false,
        error: canUse.reason,
        tokensUsed: canUse.tokensUsed,
        tokensLimit: canUse.tokensLimit,
        aiModelType: canUse.aiModelType,
      });
    }
    
    // Step 2: Generate a simple AI response
    const messages = [
      { role: 'system', content: 'Você é uma assistente virtual de um salão de beleza chamado Salão da Valéria. Responda de forma breve e simpática.' },
      { role: 'user', content: testMessage },
    ];
    
    const result = await generateChatCompletion(accountId, messages);
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: result.success,
      totalTimeMs: totalTime,
      account: {
        id: accountId,
        aiModelType: canUse.aiModelType,
        tokensUsed: canUse.tokensUsed,
        tokensLimit: canUse.tokensLimit,
      },
      aiResult: {
        provider: result.provider,
        tokens: result.totalTokens,
        fallbackUsed: result.fallbackUsed,
        error: result.error,
        responsePreview: result.content?.substring(0, 200),
      },
      environment: {
        ZAI_BASE_URL: !!process.env.ZAI_BASE_URL,
        ZAI_API_KEY: !!process.env.ZAI_API_KEY,
        ZHIPU_API_KEY: !!process.env.ZHIPU_API_KEY,
        ZHIPU_API_URL: process.env.ZHIPU_API_URL || 'default (https://open.bigmodel.cn/api/paas/v4)',
      },
    });
  } catch (error) {
    console.error('[Debug AI Test] Error:', error);
    return NextResponse.json({
      error: 'Failed to test AI',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
    }, { status: 500 });
  }
}
