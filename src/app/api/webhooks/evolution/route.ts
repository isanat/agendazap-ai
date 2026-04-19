import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateChatCompletion, canAccountUseAI, transcribeAudioBase64, type ChatMessage } from '@/lib/ai-provider-service';
import { generateSystemPrompt } from '@/lib/ai-context-service';

/**
 * Get Evolution API configuration from environment variables or database
 */
async function getEvolutionApiConfig(): Promise<{ apiUrl: string; apiKey: string } | null> {
  const envApiUrl = process.env.EVOLUTION_API_URL;
  const envApiKey = process.env.EVOLUTION_API_KEY;

  if (envApiUrl && envApiKey) {
    return { apiUrl: envApiUrl, apiKey: envApiKey };
  }

  const systemConfig = await db.systemConfiguration.findFirst();
  
  if (systemConfig?.evolutionApiUrl && systemConfig?.evolutionApiKey) {
    return { apiUrl: systemConfig.evolutionApiUrl, apiKey: systemConfig.evolutionApiKey };
  }

  return null;
}

/**
 * Send a WhatsApp message via Evolution API
 */
async function sendWhatsAppMessage(
  accountId: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const systemConfig = await getEvolutionApiConfig();
    
    if (!systemConfig) {
      return { success: false, error: 'Evolution API not configured' };
    }

    const integration = await db.integration.findUnique({
      where: { accountId_type: { accountId, type: 'whatsapp' } }
    });

    if (!integration) {
      return { success: false, error: 'WhatsApp integration not found' };
    }

    const credentials = typeof integration.credentials === 'string'
      ? JSON.parse(integration.credentials)
      : integration.credentials;

    const instanceName = credentials.instanceName;
    
    if (!instanceName) {
      return { success: false, error: 'Instance name not found' };
    }

    let formattedPhone = phone.replace(/\D/g, '');

    if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10 && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    const response = await fetch(`${systemConfig.apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': systemConfig.apiKey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        options: { delay: 1500, presence: 'composing' },
        textMessage: { text: message },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Download media from Evolution API
 */
async function downloadMedia(
  instanceName: string,
  mediaKey: string,
  mimeType: string
): Promise<{ success: boolean; base64?: string; error?: string }> {
  try {
    const systemConfig = await getEvolutionApiConfig();
    if (!systemConfig) {
      return { success: false, error: 'Evolution API not configured' };
    }

    console.log(`[Webhook] Downloading media via Evolution API for instance: ${instanceName}`);
    
    const response = await fetch(
      `${systemConfig.apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': systemConfig.apiKey,
        },
        body: JSON.stringify({
          message: { key: mediaKey },
          type: mimeType.includes('audio') ? 'audio' : 'document'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Webhook] Failed to download media: ${response.status} - ${errorText}`);
      return { success: false, error: `Failed to download media: ${response.status}` };
    }

    const data = await response.json();
    console.log(`[Webhook] Media downloaded successfully, base64 length: ${data.base64?.length || 0}`);
    return { success: true, base64: data.base64 };
  } catch (error) {
    console.error('[Webhook] Error downloading media:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Extract phone number from JID
 */
function extractPhoneFromJid(jid: string | undefined): string | null {
  if (!jid) return null;
  if (jid.includes('@g.us') || jid.includes('@broadcast') || jid.includes('@lid')) {
    return null;
  }
  const match = jid.match(/^(\d+)@/);
  const phone = match ? match[1] : null;
  if (phone && (phone.length < 10 || phone.length > 15)) {
    return null;
  }
  return phone;
}

/**
 * Find account by instance name
 */
async function findAccountByInstance(instanceName: string): Promise<string | null> {
  const integrations = await db.integration.findMany({
    where: { type: 'whatsapp', credentials: { contains: instanceName } }
  });

  for (const integration of integrations) {
    const credentials = typeof integration.credentials === 'string'
      ? JSON.parse(integration.credentials)
      : integration.credentials;

    if (credentials.instanceName === instanceName) {
      return integration.accountId;
    }
  }

  return null;
}

interface EvolutionWebhookData {
  event: string;
  instance: string;
  data: {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string; url?: string; mediaKey?: string; mimetype?: string };
      audioMessage?: { url?: string; mediaKey?: string; mimetype?: string; ptt?: boolean };
      [key: string]: unknown;
    };
    messageTimestamp?: number;
    pushName?: string;
  };
}

/**
 * Get conversation history for context
 */
async function getConversationHistory(
  accountId: string,
  phone: string,
  limit: number = 8
): Promise<ChatMessage[]> {
  const messages = await db.whatsappMessage.findMany({
    where: { accountId, clientPhone: phone },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { direction: true, message: true }
  });

  return messages.reverse().map(m => ({
    role: m.direction === 'incoming' ? 'user' : 'assistant',
    content: m.message || ''
  }));
}

/**
 * Process incoming WhatsApp message
 */
async function processIncomingMessage(
  instanceName: string,
  webhookData: EvolutionWebhookData
): Promise<void> {
  const { data } = webhookData;

  // Skip messages sent by us
  if (data.key?.fromMe) {
    return;
  }

  // CHECK FOR DUPLICATES
  const messageId = data.key?.id;
  if (messageId) {
    const existingMessage = await db.whatsappMessage.findFirst({
      where: { metadata: { path: ['messageId'], equals: messageId } }
    });
    
    if (existingMessage) {
      console.log(`[Webhook] Skipping duplicate message: ${messageId}`);
      return;
    }
  }

  const phone = extractPhoneFromJid(data.key?.remoteJid);
  if (!phone) {
    console.log('[Webhook] Could not extract phone from JID');
    return;
  }

  const accountId = await findAccountByInstance(instanceName);
  if (!accountId) {
    console.log('[Webhook] No account found for instance:', instanceName);
    return;
  }

  let messageText = '';
  let messageType = 'text';
  let audioTranscribed = false;

  // Handle text messages
  if (data.message?.conversation) {
    messageText = data.message.conversation;
  } else if (data.message?.extendedTextMessage?.text) {
    messageText = data.message.extendedTextMessage.text;
  }
  // Handle image messages
  else if (data.message?.imageMessage) {
    messageText = data.message.imageMessage.caption || '[Imagem]';
    messageType = 'image';
  }
  // Handle audio messages - TRANSCRIBE!
  else if (data.message?.audioMessage) {
    messageType = 'audio';
    console.log('[Webhook] Audio message received - attempting transcription...');
    
    const mediaKey = data.key?.id;
    const mimeType = data.message.audioMessage.mimetype || 'audio/ogg';
    
    if (mediaKey) {
      // Download audio via Evolution API first
      const downloadResult = await downloadMedia(instanceName, mediaKey, mimeType);
      
      if (downloadResult.success && downloadResult.base64) {
        // Transcribe the base64 audio
        const transcribeResult = await transcribeAudioBase64(downloadResult.base64, mimeType);
        
        if (transcribeResult.success && transcribeResult.text) {
          messageText = transcribeResult.text;
          audioTranscribed = true;
          console.log(`[Webhook] Audio transcribed via ${transcribeResult.provider}: "${messageText.substring(0, 50)}..."`);
        } else {
          console.log('[Webhook] Audio transcription failed:', transcribeResult.error);
          messageText = '[Mensagem de áudio - não foi possível transcrever]';
        }
      } else {
        console.log('[Webhook] Failed to download audio:', downloadResult.error);
        messageText = '[Mensagem de áudio - erro no download]';
      }
    } else {
      messageText = '[Mensagem de áudio]';
    }
  }

  if (!messageText) {
    console.log('[Webhook] No message content found');
    return;
  }

  console.log(`[Webhook] Processing message from ${phone}: ${messageText.substring(0, 50)}...`);

  // Save message to database
  await db.whatsappMessage.create({
    data: {
      accountId,
      clientPhone: phone,
      direction: 'incoming',
      message: messageText,
      messageType,
      status: 'received',
      metadata: {
        messageId: data.key?.id,
        pushName: data.pushName,
        timestamp: data.messageTimestamp,
        audioTranscribed,
        raw: data.message
      }
    }
  });

  // Process message with AI
  await processMessageWithAI(accountId, phone, messageText);
}

/**
 * Process message with AI assistant
 */
async function processMessageWithAI(
  accountId: string,
  phone: string,
  message: string
): Promise<void> {
  try {
    const integration = await db.integration.findUnique({
      where: { accountId_type: { accountId, type: 'whatsapp' } }
    });

    if (!integration) return;

    const config = typeof integration.config === 'string'
      ? JSON.parse(integration.config || '{}')
      : integration.config || {};

    if (config.autoReplyEnabled === false) {
      console.log('[Webhook] Auto-reply is disabled');
      return;
    }

    // Generate AI response with full context
    const response = await generateAIResponse(accountId, phone, message);

    if (response) {
      const savedMessage = await db.whatsappMessage.create({
        data: {
          accountId,
          clientPhone: phone,
          direction: 'outgoing',
          message: response,
          messageType: 'text',
          status: 'pending',
          metadata: { autoReply: true }
        }
      });

      const sendResult = await sendWhatsAppMessage(accountId, phone, response);

      await db.whatsappMessage.update({
        where: { id: savedMessage.id },
        data: { 
          status: sendResult.success ? 'sent' : 'failed',
          metadata: { autoReply: true, error: sendResult.error }
        }
      });
    }
  } catch (error) {
    console.error('[Webhook] Error processing AI response:', error);
  }
}

/**
 * Generate AI response with full context
 */
async function generateAIResponse(
  accountId: string,
  phone: string,
  message: string
): Promise<string | null> {
  try {
    const canUse = await canAccountUseAI(accountId);
    if (!canUse.allowed) {
      console.log(`[Webhook] AI not available: ${canUse.reason}`);
      return null;
    }

    // Generate system prompt with full salon and client context
    const systemPrompt = await generateSystemPrompt(accountId, phone);
    
    // Get conversation history
    const history = await getConversationHistory(accountId, phone, 6);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(0, -1),
      { role: 'user', content: message }
    ];

    const result = await generateChatCompletion(accountId, messages);

    if (!result.success) {
      console.error(`[Webhook] AI generation failed: ${result.error}`);
      return getFallbackResponse(accountId, message);
    }

    console.log(`[Webhook] AI response via ${result.provider} (${result.totalTokens} tokens)`);
    return result.content || null;

  } catch (error) {
    console.error('[Webhook] Error generating AI response:', error);
    return getFallbackResponse(accountId, message);
  }
}

/**
 * Get fallback response when AI fails
 */
async function getFallbackResponse(accountId: string, message: string): Promise<string> {
  const account = await db.account.findUnique({ where: { id: accountId } });
  const businessName = account?.businessName || 'nosso estabelecimento';
  
  const lowerMessage = message.toLowerCase();
  
  if (/agend|marcar|horário|reservar/.test(lowerMessage)) {
    return `Olá! 👋 Para agendar em ${businessName}, me diga qual serviço você gostaria e qual horário prefere!`;
  }
  if (/preço|valor|quanto/.test(lowerMessage)) {
    return `Olá! Posso te informar sobre nossos serviços e valores. Qual serviço você gostaria de saber?`;
  }
  if (/endereço|onde|localização/.test(lowerMessage)) {
    return `Estamos em ${account?.address || 'nossa localização'}. Funcionamos de ${account?.openingTime || '9h'} às ${account?.closingTime || '18h'}. Posso te ajudar com mais alguma coisa?`;
  }
  
  return `Olá! Sou a assistente virtual de ${businessName}. Como posso te ajudar hoje? 😊`;
}

/**
 * Update connection status
 */
async function updateConnectionStatus(instanceName: string, state: string): Promise<void> {
  const accountId = await findAccountByInstance(instanceName);
  if (!accountId) return;

  await db.integration.updateMany({
    where: { accountId, type: 'whatsapp' },
    data: {
      status: state === 'open' || state === 'connected' ? 'connected' : 'disconnected',
      lastSync: new Date()
    }
  });
}

// POST - Handle webhook from Evolution API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event || '';

    switch (event) {
      case 'MESSAGES_UPSERT':
      case 'messages.upsert':
        await processIncomingMessage(body.instance, body);
        break;

      case 'CONNECTION_UPDATE':
      case 'connection.update':
        await updateConnectionStatus(body.instance, body.data?.state);
        break;

      case 'QRCODE_UPDATED':
      case 'qrcode.updated':
        console.log(`[Webhook] QR Code updated for: ${body.instance}`);
        break;

      default:
        console.log(`[Webhook] Event: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Evolution API Webhook endpoint is active',
    timestamp: new Date().toISOString(),
    features: ['text', 'image', 'audio_transcription']
  });
}
