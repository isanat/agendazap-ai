/**
 * AI Provider Service - Multi-provider AI with fallback support
 * 
 * This service manages multiple AI providers with:
 * - Z.ai (via z-ai-web-dev-sdk) as primary provider for chat and audio transcription
 * - Direct Zhipu AI API as secondary
 * - Groq (fallback) for chat and Whisper audio transcription
 * - Automatic fallback, rate limiting, and token tracking
 * 
 * The Z.ai SDK connects to the Z.ai platform which provides access to
 * GLM-4 and other models with proper authentication and model routing.
 */

import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

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
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;

// Singleton ZAI SDK client
let zaiClient: InstanceType<typeof ZAI> | null = null;
let zaiClientInitPromise: Promise<InstanceType<typeof ZAI> | null> | null = null;

/**
 * Initialize ZAI SDK client
 * Creates a .z-ai-config file from environment variables if needed,
 * then initializes the ZAI SDK.
 */
async function getZaiClient(): Promise<InstanceType<typeof ZAI> | null> {
  // Return cached client if available
  if (zaiClient) return zaiClient;
  
  // If already initializing, wait for that
  if (zaiClientInitPromise) return zaiClientInitPromise;
  
  zaiClientInitPromise = (async () => {
    try {
      // Check if .z-ai-config already exists
      const configPath = path.join(process.cwd(), '.z-ai-config');
      let needsConfig = false;
      
      try {
        const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!existing.baseUrl || !existing.apiKey) {
          needsConfig = true;
        }
      } catch {
        needsConfig = true;
      }
      
      // Create config from environment variables if needed
      if (needsConfig) {
        const zaiBaseUrl = process.env.ZAI_BASE_URL;
        const zaiApiKey = process.env.ZAI_API_KEY;
        
        if (!zaiBaseUrl || !zaiApiKey) {
          console.log('[AI] ZAI SDK: Missing ZAI_BASE_URL or ZAI_API_KEY env vars, skipping SDK init');
          return null;
        }
        
        const config = {
          baseUrl: zaiBaseUrl,
          apiKey: zaiApiKey,
        };
        
        // Try to write config file (may fail on read-only filesystems like Vercel)
        try {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (writeErr) {
          // On Vercel, try /tmp instead
          try {
            const tmpConfigPath = '/tmp/.z-ai-config';
            fs.writeFileSync(tmpConfigPath, JSON.stringify(config, null, 2));
            // We can't use this path with ZAI.create() since it reads from specific locations
            // So we'll need to use direct API calls
            console.log('[AI] ZAI SDK: Config written to /tmp, but SDK needs cwd/home path. Using direct API mode.');
            return null;
          } catch {
            console.log('[AI] ZAI SDK: Cannot write config file. Using direct API mode.');
            return null;
          }
        }
      }
      
      // Initialize ZAI SDK
      const client = await ZAI.create();
      zaiClient = client;
      console.log('[AI] ZAI SDK initialized successfully');
      return client;
    } catch (error) {
      console.error('[AI] ZAI SDK initialization failed:', error);
      return null;
    }
  })();
  
  return zaiClientInitPromise;
}

/**
 * Make a chat completion call using the Z.ai platform API directly
 * (bypasses the file-based config requirement of the SDK)
 */
async function callZaiPlatform(
  messages: ChatMessage[],
  model?: string
): Promise<{ content: string; inputTokens: number; outputTokens: number } | null> {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  
  if (!baseUrl || !apiKey) {
    return null;
  }
  
  const modelToUse = model || 'glm-4-air';
  console.log(`[AI] Calling Z.ai platform API with model: ${modelToUse}`);
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Z-AI-From': 'Z',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        max_tokens: 1024,
        temperature: 0.7,
        thinking: { type: 'disabled' },
      }),
      signal: AbortSignal.timeout(15000) // 15s per model attempt (Vercel serverless friendly)
    });

    if (!response.ok) {
      const error = await response.text();
      const errorShort = error.substring(0, 200);
      console.error(`[AI] Z.ai platform error: ${response.status} - ${errorShort}`);
      // Return null to trigger model fallback (don't throw)
      return null;
    }

    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0
    };
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || String(error).includes('abort')) {
      console.log(`[AI] Z.ai platform timeout for model ${modelToUse} (15s limit)`);
    } else {
      console.error(`[AI] Z.ai platform call failed for model ${modelToUse}:`, error?.message || error);
    }
    return null;
  }
}

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
 * 
 * Model mapping:
 * - Z.ai/Zhipu: basic=glm-4-air, premium=glm-4-plus
 * - Groq: basic=llama-3.1-8b-instant, premium=llama-3.1-70b-versatile
 */
export function getModelForPlan(aiModelType: string, providerName: string, defaultModel: string): string {
  if (providerName.toLowerCase() === 'zai') {
    // glm-4-air is the affordable model, glm-4-plus is the premium model
    // Note: glm-4-flash was deprecated/removed from the API, use glm-4-air instead
    return aiModelType === 'premium' ? 'glm-4-plus' : 'glm-4-air';
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
 * Call Zhipu AI (GLM-4) with automatic model fallback
 * Optimized for Vercel serverless: limited fallback chain with fast timeouts
 * 
 * Strategy:
 * 1. Try Z.ai platform API with 2 model fallbacks (fastest, 15s timeout each)
 * 2. If platform fails, try direct Zhipu AI API with 2 model fallbacks (10s timeout each)
 * 3. Total worst case: ~4 attempts × ~15s = ~60s (but Vercel max is 30s so we need to be fast)
 * 
 * Skip ZAI SDK method entirely - it doesn't work on Vercel (read-only filesystem)
 */
async function callZhipuAI(
  messages: ChatMessage[],
  model: string = 'glm-4-air'
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  // Only try 2-3 models max to stay within Vercel's 30s function timeout
  // glm-4-air is the most reliable/available model on Zhipu AI
  const modelFallbacks = [model, 'glm-4-air', 'glm-4-flash'];
  
  console.log(`[AI] callZhipuAI: Starting with requested model: ${model}, fallbacks: ${modelFallbacks.join(', ')}`);
  const startTime = Date.now();
  
  // Method 1: Try Z.ai platform API (direct HTTP with X-Z-AI-From header)
  // This is the primary method and should work if env vars are set
  for (const tryModel of modelFallbacks) {
    const elapsed = Date.now() - startTime;
    if (elapsed > 20000) {
      // If we've already spent 20s, skip remaining model attempts to leave time for Groq fallback
      console.log(`[AI] Skipping remaining Z.ai platform attempts (elapsed: ${elapsed}ms > 20s budget)`);
      break;
    }
    
    const zaiResult = await callZaiPlatform(messages, tryModel);
    if (zaiResult) {
      console.log(`[AI] Z.ai platform call succeeded with model: ${tryModel} (${Date.now() - startTime}ms total)`);
      return zaiResult;
    }
    console.log(`[AI] Z.ai platform model ${tryModel} failed, trying next...`);
  }
  
  // Method 2: Direct Zhipu AI API call with model fallback
  // Skip ZAI SDK (doesn't work on Vercel due to read-only filesystem)
  const elapsedAfterPlatform = Date.now() - startTime;
  if (elapsedAfterPlatform > 20000) {
    console.log(`[AI] Skipping direct Zhipu API (elapsed: ${elapsedAfterPlatform}ms > 20s budget), will fall through to Groq`);
    throw new Error(`Z.ai platform failed after ${elapsedAfterPlatform}ms, no time for direct API fallback`);
  }
  
  console.log('[AI] Z.ai platform failed, trying direct Zhipu AI API');
  
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
    console.log('[AI] No Zhipu API key available, skipping direct API call');
    throw new Error('Zhipu AI API key not configured and Z.ai platform unavailable');
  }
  
  // Only try 2 models via direct API (to stay within time budget)
  const directApiModels = model === 'glm-4-air' ? ['glm-4-air'] : [model, 'glm-4-air'];
  
  for (const tryModel of directApiModels) {
    const elapsed = Date.now() - startTime;
    if (elapsed > 25000) {
      console.log(`[AI] Skipping direct API attempt for ${tryModel} (elapsed: ${elapsed}ms > 25s budget)`);
      break;
    }
    
    try {
      console.log(`[AI] Trying direct Zhipu AI model: ${tryModel}`);
      
      const response = await fetch(`${ZHIPU_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: tryModel,
          messages: messages.map(m => ({
            role: m.role === 'system' ? 'system' : m.role,
            content: m.content
          })),
          max_tokens: 1024,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(10000) // 10s timeout for direct API (faster fail)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorShort = errorText.substring(0, 200);
        // If model not found (error 1211), try next model
        if (errorText.includes('"1211"') || errorText.includes('模型不存在')) {
          console.log(`[AI] Direct Zhipu model ${tryModel} not found (1211), trying next...`);
          continue;
        }
        console.error(`[AI] Direct Zhipu API error: ${response.status} - ${errorShort}`);
        continue; // Don't throw, try next model or fall through to Groq
      }

      const data = await response.json();
      console.log(`[AI] Direct Zhipu AI succeeded with model: ${tryModel} (${Date.now() - startTime}ms total)`);
      
      return {
        content: data.choices[0]?.message?.content || '',
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      };
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || String(err).includes('abort')) {
        console.log(`[AI] Direct Zhipu API timeout for model ${tryModel}`);
        continue;
      }
      console.error(`[AI] Direct Zhipu API error for model ${tryModel}:`, err?.message || err);
      continue; // Don't throw, let it fall through to Groq
    }
  }
  
  throw new Error(`All Zhipu AI attempts failed after ${Date.now() - startTime}ms`);
}

/**
 * Transcribe audio using Z.ai platform ASR with Groq Whisper fallback
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
 * Transcribe audio from base64 with Z.ai ASR and Groq Whisper fallback
 */
export async function transcribeAudioBase64(
  base64Audio: string,
  mimeType: string = 'audio/ogg'
): Promise<{ success: boolean; text?: string; error?: string; provider?: string }> {
  
  // Method 1: Try Z.ai platform ASR
  const zaiBaseUrl = process.env.ZAI_BASE_URL;
  const zaiApiKey = process.env.ZAI_API_KEY;
  
  if (zaiBaseUrl && zaiApiKey) {
    try {
      console.log('[AI] Transcribing audio with Z.ai platform ASR...');
      
      const response = await fetch(`${zaiBaseUrl}/audio/asr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${zaiApiKey}`,
          'Content-Type': 'application/json',
          'X-Z-AI-From': 'Z',
        },
        body: JSON.stringify({
          file_base64: base64Audio,
          model: 'whisper-1',
        }),
        signal: AbortSignal.timeout(60000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          console.log('[AI] Audio transcribed successfully with Z.ai platform');
          return { success: true, text: data.text, provider: 'Z.ai' };
        }
      } else {
        console.log('[AI] Z.ai platform ASR failed, trying ZAI SDK...');
      }
    } catch (error: any) {
      console.log('[AI] Z.ai platform ASR error:', error.message);
    }
  }
  
  // Method 2: Try ZAI SDK
  try {
    const client = await getZaiClient();
    if (client) {
      console.log('[AI] Transcribing audio with ZAI SDK ASR...');
      const result = await client.audio.asr.create({
        file_base64: base64Audio,
        model: 'whisper-1'
      });
      
      if (result?.text) {
        console.log('[AI] Audio transcribed successfully with ZAI SDK');
        return { success: true, text: result.text, provider: 'Z.ai SDK' };
      }
    }
  } catch (error: any) {
    console.log('[AI] ZAI SDK ASR error:', error.message, '- trying Groq Whisper fallback');
  }
  
  // Method 3: Direct Zhipu AI ASR (if API key configured)
  if (ZHIPU_API_KEY) {
    try {
      console.log('[AI] Transcribing audio with direct Zhipu AI ASR...');
      
      const response = await fetch(`${ZHIPU_API_URL}/audio/asr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ZHIPU_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_base64: base64Audio,
          model: 'whisper-1'
        }),
        signal: AbortSignal.timeout(60000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          console.log('[AI] Audio transcribed successfully with Zhipu AI');
          return { success: true, text: data.text, provider: 'Zhipu AI' };
        }
      }
    } catch (error: any) {
      console.log('[AI] Zhipu AI ASR error:', error.message, '- trying Groq Whisper fallback');
    }
  }
  
  // Method 4: Fallback to Groq Whisper
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
  const modelToUse = modelOverride || config.model || 'llama-3.1-8b-instant';
  console.log(`[AI] Calling Groq with model: ${modelToUse}`);
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'system' : m.role,
        content: m.content
      })),
      max_tokens: config.maxTokensPerRequest || 1024,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(Math.min(config.timeoutMs || 15000, 15000)) // Max 15s for Vercel
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
  const modelToUse = modelOverride || config.model || 'gpt-4o-mini';
  console.log(`[AI] Calling OpenAI-compatible API with model: ${modelToUse}`);
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: config.maxTokensPerRequest || 1024,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(Math.min(config.timeoutMs || 15000, 15000)) // Max 15s for Vercel
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
 * Priority: Z.ai Platform -> ZAI SDK -> Direct Zhipu AI -> Groq -> OpenAI-compatible
 * Also enforces subscription plan AI token limits and model type
 */
export async function generateChatCompletion(
  accountId: string,
  messages: ChatMessage[],
  options?: { skipTracking?: boolean; requestType?: string; metadata?: Record<string, unknown> }
): Promise<ChatCompletionResult> {
  const startTime = Date.now();
  
  const canUse = await canAccountUseAI(accountId);
  if (!canUse.allowed) {
    console.log(`[AI] Account ${accountId} not allowed: ${canUse.reason}`);
    return { success: false, error: canUse.reason };
  }

  const providers = await getEnabledProviders();
  if (providers.length === 0) {
    console.error('[AI] No AI providers configured in database!');
    return { success: false, error: 'No AI providers configured' };
  }

  const aiModelType = canUse.aiModelType || 'basic';
  let lastError: Error | null = null;
  let fallbackUsed = false;

  console.log(`[AI] generateChatCompletion: ${providers.length} providers available, plan model type: ${aiModelType}`);

  for (const provider of providers) {
    const elapsed = Date.now() - startTime;
    if (elapsed > 25000) {
      // Don't start new provider attempts if we're close to Vercel's 30s limit
      console.log(`[AI] Skipping provider ${provider.displayName} (elapsed: ${elapsed}ms > 25s budget)`);
      break;
    }
    
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

      const totalTime = Date.now() - startTime;
      console.log(`[AI] ✅ Success with provider: ${provider.displayName}, model: ${planModel} (${totalTime}ms total, ${result.inputTokens + result.outputTokens} tokens)`);

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
      const elapsed = Date.now() - startTime;
      console.error(`[AI] ❌ Provider ${provider.displayName} failed after ${elapsed}ms:`, error instanceof Error ? error.message : error);
      lastError = error instanceof Error ? error : new Error(String(error));
      fallbackUsed = true;
      continue;
    }
  }

  const totalTime = Date.now() - startTime;
  console.error(`[AI] ❌ All providers failed after ${totalTime}ms. Last error: ${lastError?.message}`);
  
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
        await callZhipuAI(messages, (!provider.model || provider.model === 'default') ? 'glm-4-air' : provider.model);
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
