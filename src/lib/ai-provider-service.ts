/**
 * AI Provider Service - Multi-provider AI with fallback support
 * 
 * This service manages multiple AI providers with:
 * - Zhipu AI (GLM-4) via public API for chat and audio transcription
 * - Groq (fallback) for chat and Whisper audio transcription
 * - Automatic fallback, rate limiting, and token tracking
 * 
 * Zhipu AI Public API: https://open.bigmodel.cn/api/paas/v4/
 * Models: glm-4-plus (faster for voice)
 */

import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// Types
export interface AIProviderConfig {
  id: string;
  name: string;
  displayName: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  priority: number;
  isEnabled: boolean;
  costPerInputToken: number;
  costPerOutputToken: number;
  rateLimitPerMinute: number;
  maxTokensPerRequest: number;
  timeoutMs: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionResult {
  success: boolean;
  content?: string;
  error?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  fallbackUsed?: boolean;
}

// Zhipu AI Configuration - uses environment variable or database
const ZHIPU_API_URL = process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4';
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY; // Set this in Vercel environment variables

/**
 * Get all enabled AI providers ordered by priority
 */
export async function getEnabledProviders(): Promise<AIProviderConfig[]> {
  const providers = await db.aIProvider.findMany({
    where: { isEnabled: true },
    orderBy: { priority: 'asc' }
  });

  return providers.map(p => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    apiKey: p.apiKey,
    baseUrl: p.baseUrl || undefined,
    model: p.model,
    priority: p.priority,
    isEnabled: p.isEnabled,
    costPerInputToken: p.costPerInputToken,
    costPerOutputToken: p.costPerOutputToken,
    rateLimitPerMinute: p.rateLimitPerMinute,
    maxTokensPerRequest: p.maxTokensPerRequest,
    timeoutMs: p.timeoutMs
  }));
}

/**
 * Get Groq provider for fallback
 */
async function getGroqProvider(): Promise<AIProviderConfig | null> {
  const providers = await getEnabledProviders();
  return providers.find(p => p.name.toLowerCase() === 'groq') || null;
}

/**
 * Check if account can use AI, including monthly token limit enforcement
 */
export async function canAccountUseAI(accountId: string): Promise<{ 
  allowed: boolean; 
  reason?: string;
  tokensUsed?: number;
  tokensLimit?: number;
  aiModelType?: string;
}> {
  const account = await db.account.findUnique({
    where: { id: accountId },
    include: {
      AccountSubscription: {
        include: { SubscriptionPlan: true }
      }
    }
  });

  if (!account?.AccountSubscription?.SubscriptionPlan?.includeAiAssistant) {
    return { allowed: false, reason: 'AI assistant not included in your plan' };
  }

  const plan = account.AccountSubscription.SubscriptionPlan;

  // Check monthly token limit
  if (plan.maxAiTokensMonth > 0) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const usage = await db.aITokenUsage.aggregate({
      where: {
        accountId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        }
      },
      _sum: {
        totalTokens: true,
      }
    });

    const tokensUsed = usage._sum.totalTokens || 0;
    const tokensLimit = plan.maxAiTokensMonth;

    if (tokensUsed >= tokensLimit) {
      return { 
        allowed: false, 
        reason: `Limite mensal de tokens AI atingido (${tokensUsed.toLocaleString()}/${tokensLimit.toLocaleString()}). Considere fazer upgrade do seu plano.`,
        tokensUsed,
        tokensLimit,
        aiModelType: plan.aiModelType || 'basic'
      };
    }

    return { 
      allowed: true, 
      tokensUsed, 
      tokensLimit,
      aiModelType: plan.aiModelType || 'basic'
    };
  }

  // Unlimited tokens (maxAiTokensMonth = 0 means unlimited)
  return { 
    allowed: true, 
    tokensUsed: 0, 
    tokensLimit: 0,
    aiModelType: plan.aiModelType || 'basic'
  };
}

/**
 * Get the AI model to use based on the account's subscription plan
 * "basic" = cheaper/faster model, "premium" = better quality model
 */
export function getModelForPlan(aiModelType: string, providerName: string, defaultModel: string): string {
  if (providerName.toLowerCase() === 'zai') {
    return aiModelType === 'premium' ? 'glm-4-plus' : 'glm-4-flash';
  }
  if (providerName.toLowerCase() === 'groq') {
    return aiModelType === 'premium' ? 'llama-3.1-70b-versatile' : 'llama-3.1-8b-instant';
  }
  // For other providers, use their default model
  return defaultModel;
}

/**
 * Track token usage
 */
export async function trackTokenUsage(
  accountId: string,
  providerId: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
  requestType?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  await db.aITokenUsage.create({
    data: {
      id: nanoid(),
      accountId,
      providerId,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUsd,
      requestType: requestType || 'chat',
      metadata: metadata || undefined,
      periodStart,
      periodEnd
    }
  });
}

/**
 * Call Zhipu AI (GLM-4) via public API
 * Endpoint: https://open.bigmodel.cn/api/paas/v4/chat/completions
 */
async function callZhipuAI(
  messages: ChatMessage[],
  model: string = 'glm-4-plus'
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  console.log('[AI] Calling Zhipu AI (GLM-4) via public API');
  
  // Get API key from environment or database
  let apiKey = ZHIPU_API_KEY;
  
  if (!apiKey) {
    // Try to get from database (ZAI provider)
    const providers = await getEnabledProviders();
    const zaiProvider = providers.find(p => p.name.toLowerCase() === 'zai');
    if (zaiProvider?.apiKey) {
      apiKey = zaiProvider.apiKey;
    }
  }
  
  if (!apiKey) {
    throw new Error('Zhipu AI API key not configured. Set ZHIPU_API_KEY environment variable.');
  }
  
  const response = await fetch(`${ZHIPU_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'system' : m.role,
        content: m.content
      })),
      max_tokens: 1024,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zhipu AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0
  };
}

/**
 * Transcribe audio using Zhipu AI GLM-ASR with Groq Whisper fallback
 * 
 * For Zhipu AI ASR, we need to use the correct endpoint.
 * Documentation: https://docs.z.ai/guides/audio/glm-asr-2512
 */
export async function transcribeAudio(
  audioUrl: string
): Promise<{ success: boolean; text?: string; error?: string; provider?: string }> {
  try {
    console.log('[AI] Transcribing audio from URL...');
    
    // Download audio from URL
    const response = await fetch(audioUrl);
    if (!response.ok) {
      return { success: false, error: `Failed to fetch audio: ${response.status}` };
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    
    return transcribeAudioBase64(base64Audio, 'audio/ogg');
    
  } catch (error: any) {
    console.error('[AI] Audio transcription error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Transcribe audio from base64 with Zhipu AI ASR and Groq Whisper fallback
 */
export async function transcribeAudioBase64(
  base64Audio: string,
  mimeType: string = 'audio/ogg'
): Promise<{ success: boolean; text?: string; error?: string; provider?: string }> {
  
  // Try Zhipu AI ASR first (if API key is configured)
  try {
    console.log('[AI] Transcribing audio with Zhipu AI GLM-ASR...');
    
    let apiKey = ZHIPU_API_KEY;
    if (!apiKey) {
      const providers = await getEnabledProviders();
      const zaiProvider = providers.find(p => p.name.toLowerCase() === 'zai');
      if (zaiProvider?.apiKey) {
        apiKey = zaiProvider.apiKey;
      }
    }
    
    if (apiKey) {
      // Zhipu AI ASR endpoint
      const response = await fetch(`${ZHIPU_API_URL}/audio/asr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_base64: base64Audio,
          model: 'whisper-1' // or glm-asr if available
        }),
        signal: AbortSignal.timeout(60000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          console.log('[AI] Audio transcribed successfully with Zhipu AI');
          return { success: true, text: data.text, provider: 'Zhipu AI' };
        }
      } else {
        console.log('[AI] Zhipu AI ASR failed, trying fallback...');
      }
    }
  } catch (error: any) {
    console.log('[AI] Zhipu AI ASR error:', error.message, '- trying Groq Whisper fallback');
  }
  
  // Fallback to Groq Whisper
  try {
    console.log('[AI] Transcribing audio with Groq Whisper...');
    
    const groqProvider = await getGroqProvider();
    if (!groqProvider) {
      return { success: false, error: 'No audio transcription provider available' };
    }
    
    // Convert base64 to buffer for form data
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    
    // Determine file extension from mime type
    const extension = mimeType.includes('ogg') ? 'ogg' : 
                      mimeType.includes('mp3') ? 'mp3' : 
                      mimeType.includes('wav') ? 'wav' : 'ogg';
    
    // Create form data
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, `audio.${extension}`);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'pt');
    
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqProvider.apiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(60000)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq Whisper error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.text) {
      console.log('[AI] Audio transcribed successfully with Groq Whisper');
      return { success: true, text: data.text, provider: 'Groq Whisper' };
    }
    
    return { success: false, error: 'Failed to transcribe audio' };
    
  } catch (error: any) {
    console.error('[AI] Groq Whisper transcription error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Call Groq API
 */
async function callGroq(
  config: AIProviderConfig,
  messages: ChatMessage[],
  modelOverride?: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelOverride || config.model || 'llama-3.1-8b-instant',
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'system' : m.role,
        content: m.content
      })),
      max_tokens: config.maxTokensPerRequest || 1024,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(config.timeoutMs || 30000)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0
  };
}

/**
 * Call OpenAI-compatible API
 */
async function callOpenAICompatible(
  config: AIProviderConfig,
  messages: ChatMessage[],
  modelOverride?: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelOverride || config.model || 'gpt-4o-mini',
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: config.maxTokensPerRequest || 1024,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(config.timeoutMs || 30000)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0
  };
}

/**
 * Main function: Generate chat completion with fallback
 * Priority: Zhipu AI (ZAI) -> Groq -> OpenAI-compatible
 * Also enforces subscription plan AI token limits and model type
 */
export async function generateChatCompletion(
  accountId: string,
  messages: ChatMessage[],
  options?: { skipTracking?: boolean; requestType?: string; metadata?: Record<string, unknown> }
): Promise<ChatCompletionResult> {
  const canUse = await canAccountUseAI(accountId);
  if (!canUse.allowed) {
    return { success: false, error: canUse.reason };
  }

  const providers = await getEnabledProviders();
  if (providers.length === 0) {
    return { success: false, error: 'No AI providers configured' };
  }

  const aiModelType = canUse.aiModelType || 'basic';
  let lastError: Error | null = null;
  let fallbackUsed = false;

  for (const provider of providers) {
    try {
      console.log(`[AI] Trying provider: ${provider.displayName} (priority: ${provider.priority}, plan model: ${aiModelType})`);

      let result: { content: string; inputTokens: number; outputTokens: number };

      // Select model based on subscription plan
      const planModel = getModelForPlan(aiModelType, provider.name, provider.model);

      // Use Zhipu AI public API for ZAI provider
      if (provider.name.toLowerCase() === 'zai') {
        result = await callZhipuAI(messages, planModel);
      } else if (provider.name.toLowerCase() === 'groq') {
        result = await callGroq(provider, messages, planModel);
      } else {
        result = await callOpenAICompatible(provider, messages, planModel);
      }

      const costUsd = (result.inputTokens * provider.costPerInputToken / 1000) +
        (result.outputTokens * provider.costPerOutputToken / 1000);

      if (!options?.skipTracking) {
        await trackTokenUsage(
          accountId, 
          provider.id, 
          result.inputTokens, 
          result.outputTokens, 
          costUsd,
          options?.requestType || 'chat',
          options?.metadata
        );
      }

      console.log(`[AI] Success with provider: ${provider.displayName}, model: ${planModel}`);

      return {
        success: true,
        content: result.content,
        provider: provider.name,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        costUsd,
        fallbackUsed
      };

    } catch (error) {
      console.error(`[AI] Provider ${provider.displayName} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      fallbackUsed = true;
      continue;
    }
  }

  return {
    success: false,
    error: lastError?.message || 'All AI providers failed',
    fallbackUsed: true
  };
}

/**
 * Health check for all providers
 */
export async function checkProvidersHealth(): Promise<Record<string, { status: string; latencyMs: number }>> {
  const providers = await getEnabledProviders();
  const results: Record<string, { status: string; latencyMs: number }> = {};

  for (const provider of providers) {
    const start = Date.now();
    try {
      // Simple test message
      const messages: ChatMessage[] = [{ role: 'user', content: 'ping' }];
      
      if (provider.name.toLowerCase() === 'zai') {
        await callZhipuAI(messages, (!provider.model || provider.model === 'default') ? 'glm-4-plus' : provider.model);
      } else if (provider.name.toLowerCase() === 'groq') {
        await callGroq(provider, messages);
      } else {
        await callOpenAICompatible(provider, messages);
      }
      
      const latency = Date.now() - start;
      results[provider.name] = { status: 'healthy', latencyMs: latency };
      
      await db.aIProvider.update({
        where: { id: provider.id },
        data: {
          healthStatus: 'healthy',
          lastHealthCheck: new Date()
        }
      });
    } catch (error) {
      const latency = Date.now() - start;
      results[provider.name] = { status: 'down', latencyMs: latency };
      
      await db.aIProvider.update({
        where: { id: provider.id },
        data: {
          healthStatus: 'down',
          lastHealthCheck: new Date()
        }
      });
    }
  }

  return results;
}

// Deploy triggered: 2026-04-19T01:34:18+00:00
