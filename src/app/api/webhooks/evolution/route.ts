import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateChatCompletion, canAccountUseAI, transcribeAudioBase64, type ChatMessage } from '@/lib/ai-provider-service';
import { generateSystemPrompt, findOrCreateClient, detectNameInMessage, updateClientName, detectPaymentPreference, updateClientPaymentPreference } from '@/lib/ai-context-service';

/**
 * Verify webhook request authenticity
 * Checks multiple authentication methods:
 * 1. Custom webhook secret header (x-webhook-secret)
 * 2. Evolution API global key header (apikey)
 * 3. Instance-level API key from Integration records in DB
 * 4. If no EVOLUTION_WEBHOOK_SECRET is set, skip verification (backward compatible)
 */
async function verifyWebhookRequest(request: NextRequest): Promise<boolean> {
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
  
  // If no webhook secret is configured, skip verification (backward compatible)
  if (!webhookSecret) {
    return true;
  }
  
  // Method 1: Check custom webhook secret header (set when webhook is configured with headers)
  const providedSecret = request.headers.get('x-webhook-secret');
  if (providedSecret && providedSecret === webhookSecret) {
    console.log('[Webhook] Authenticated via x-webhook-secret header');
    return true;
  }
  
  // Method 2: Check Evolution API global key header
  const apikey = request.headers.get('apikey');
  const globalApiKey = process.env.EVOLUTION_API_KEY;
  if (apikey && globalApiKey && apikey === globalApiKey) {
    console.log('[Webhook] Authenticated via global apikey header');
    return true;
  }
  
  // Method 3: Check instance-level API key from Integration records
  // Evolution API sends per-instance API keys that may differ from the global key
  if (apikey) {
    try {
      const integrations = await db.integration.findMany({
        where: { type: 'whatsapp' },
        select: { credentials: true }
      });
      
      for (const integration of integrations) {
        try {
          const credentials = typeof integration.credentials === 'string'
            ? JSON.parse(integration.credentials)
            : integration.credentials;
          
          if (credentials.apiKey && credentials.apiKey === apikey) {
            console.log('[Webhook] Authenticated via instance-level apikey header');
            return true;
          }
        } catch {
          // Skip invalid credentials
        }
      }
    } catch (dbError) {
      console.error('[Webhook] Error checking instance API keys:', dbError);
    }
  }
  
  // Method 4: Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === webhookSecret || token === globalApiKey) {
      console.log('[Webhook] Authenticated via Authorization Bearer header');
      return true;
    }
  }
  
  // Log all received headers for debugging
  const headerKeys: string[] = [];
  request.headers.forEach((_value, key) => {
    headerKeys.push(key);
  });
  console.warn(`[Webhook] Authentication failed. Received headers: ${headerKeys.join(', ')}`);
  console.warn(`[Webhook] hasXWebhookSecret: ${!!providedSecret}, hasApikey: ${!!apikey}, hasAuthHeader: ${!!authHeader}`);
  
  return false;
}

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
 * Send a WhatsApp message directly to a JID (works with LID addresses)
 * This is used as a fallback when the phone number can't be resolved from a LID
 */
async function sendWhatsAppMessageToJid(
  instanceName: string,
  jid: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const systemConfig = await getEvolutionApiConfig();
    if (!systemConfig) {
      return { success: false, error: 'Evolution API not configured' };
    }

    console.log(`[Webhook] Sending message directly to JID: ${jid}`);

    const response = await fetch(`${systemConfig.apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': systemConfig.apiKey,
      },
      body: JSON.stringify({
        number: jid, // Send directly to JID format (e.g., "147102780940432@lid")
        options: { delay: 1500, presence: 'composing' },
        textMessage: { text: message },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText.substring(0, 200)}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
    
    // Validate phone number - must be a reasonable length for a phone number
    // Brazilian: 10-13 digits (with/without country code and 9th digit)
    // International: typically 8-15 digits
    if (formattedPhone.length < 8 || formattedPhone.length > 15) {
      return { success: false, error: `Invalid phone number format: ${formattedPhone} (${formattedPhone.length} digits)` };
    }

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
 * Extract phone number or session identifier from JID
 * 
 * Handles multiple JID formats:
 * - phonenumber@s.whatsapp.net → normal direct message
 * - identifier@lid → WhatsApp LID (Linked ID) privacy format
 * - something@g.us → group message (returns null)
 * - something@broadcast → broadcast (returns null)
 * 
 * For @lid JIDs, returns a lid: prefixed identifier that can be used
 * as a session key. The actual phone number must be resolved separately
 * via the Evolution API contact resolution.
 */
function extractPhoneFromJid(jid: string | undefined): string | null {
  if (!jid) return null;
  
  // Skip group and broadcast messages
  if (jid.includes('@g.us') || jid.includes('@broadcast')) {
    return null;
  }
  
  // Handle @lid JIDs - WhatsApp's privacy format
  // These contain an opaque identifier instead of a phone number
  if (jid.includes('@lid')) {
    const match = jid.match(/^([^@]+)@lid/);
    if (match && match[1]) {
      console.log(`[Webhook] LID format detected: ${jid} - will attempt phone resolution`);
      return `lid:${match[1]}`;
    }
    return null;
  }
  
  // Standard format: phonenumber@s.whatsapp.net
  const match = jid.match(/^(\d+)@/);
  const phone = match ? match[1] : null;
  
  if (phone) {
    // Brazilian numbers: 10-13 digits (with/without country code and 9th digit)
    // International: can vary, be more lenient
    if (phone.length < 8 || phone.length > 18) {
      console.log(`[Webhook] Phone number has unusual length (${phone.length}): ${phone}`);
      return null;
    }
    return phone;
  }
  
  return null;
}

/**
 * Check if a phone value is a LID identifier (not a real phone number)
 */
function isLidIdentifier(phone: string): boolean {
  return phone.startsWith('lid:');
}

/**
 * Resolve a LID identifier to an actual phone number using Evolution API
 * Uses the chat/find endpoint to look up contact info
 */
async function resolveLidToPhone(
  instanceName: string,
  lidIdentifier: string
): Promise<string | null> {
  try {
    const systemConfig = await getEvolutionApiConfig();
    if (!systemConfig) {
      console.log('[Webhook] Cannot resolve LID: Evolution API not configured');
      return null;
    }

    const lidValue = lidIdentifier.replace('lid:', '');
    const lidJid = `${lidValue}@lid`;

    console.log(`[Webhook] Attempting to resolve LID: ${lidJid}`);

    // Try to find contact info via Evolution API
    // Method 1: Use the chat/findContacts endpoint
    try {
      const response = await fetch(
        `${systemConfig.apiUrl}/chat/fetchPhoneNumber/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': systemConfig.apiKey,
          },
          body: JSON.stringify({
            where: {
              lidJid: lidJid
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const resolvedPhone = data?.phoneNumber || data?.phone || data?.jid?.split('@')[0];
        if (resolvedPhone && /^\d{8,18}$/.test(resolvedPhone)) {
          console.log(`[Webhook] LID resolved to phone: ${resolvedPhone}`);
          return resolvedPhone;
        }
      }
    } catch (err) {
      console.log('[Webhook] fetchPhoneNumber endpoint failed, trying alternative:', err);
    }

    // Method 2: Try getBaseProfile endpoint which might include phone number
    try {
      const response = await fetch(
        `${systemConfig.apiUrl}/chat/getBaseProfile/${instanceName}?jid=${encodeURIComponent(lidJid)}`,
        {
          method: 'GET',
          headers: {
            'apikey': systemConfig.apiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const resolvedPhone = data?.id?.split('@')[0] || data?.jid?.split('@')[0] || data?.phoneNumber;
        if (resolvedPhone && /^\d{8,18}$/.test(resolvedPhone)) {
          console.log(`[Webhook] LID resolved via profile to phone: ${resolvedPhone}`);
          return resolvedPhone;
        }
      }
    } catch (err) {
      console.log('[Webhook] getBaseProfile endpoint failed:', err);
    }

    // Method 3: Try findContacts endpoint
    try {
      const response = await fetch(
        `${systemConfig.apiUrl}/chat/findContacts/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': systemConfig.apiKey,
          },
          body: JSON.stringify({
            where: {
              id: lidJid
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        // The response might be an array of contacts
        const contacts = Array.isArray(data) ? data : [data];
        for (const contact of contacts) {
          const contactJid = contact?.id || contact?.jid || '';
          const phoneMatch = contactJid.match(/^(\d{8,18})@/);
          if (phoneMatch) {
            console.log(`[Webhook] LID resolved via contacts to phone: ${phoneMatch[1]}`);
            return phoneMatch[1];
          }
        }
      }
    } catch (err) {
      console.log('[Webhook] findContacts endpoint failed:', err);
    }

    console.log(`[Webhook] Could not resolve LID ${lidJid} to phone number`);
    return null;
  } catch (error) {
    console.error('[Webhook] Error resolving LID:', error);
    return null;
  }
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
    key?: { remoteJid?: string; fromMe?: boolean; id?: string; participant?: string };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string; url?: string; mediaKey?: string; mimetype?: string };
      audioMessage?: { url?: string; mediaKey?: string; mimetype?: string; ptt?: boolean };
      [key: string]: unknown;
    };
    messageTimestamp?: number;
    pushName?: string;
    notify?: string;
    [key: string]: unknown;
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

  // CHECK FOR DUPLICATES using ProcessedMessage table
  const messageId = data.key?.id;
  if (messageId) {
    const existingProcessed = await db.processedMessage.findUnique({
      where: { messageId }
    });
    
    if (existingProcessed) {
      console.log(`[Webhook] Skipping duplicate message: ${messageId}`);
      return;
    }
  }

  // Extract phone number or LID identifier from JID
  let phone = extractPhoneFromJid(data.key?.remoteJid);
  
  // If primary JID extraction failed, try alternative fields
  if (!phone) {
    // Try participant field (sometimes contains the real phone number for @lid messages)
    const participantPhone = extractPhoneFromJid(data.key?.participant);
    if (participantPhone && !isLidIdentifier(participantPhone)) {
      phone = participantPhone;
      console.log(`[Webhook] Phone extracted from participant field: ${phone}`);
    }
  }
  
  // If we got a LID identifier, try to resolve it to a real phone number
  if (phone && isLidIdentifier(phone)) {
    console.log(`[Webhook] LID detected, attempting phone resolution for: ${phone}`);
    const resolvedPhone = await resolveLidToPhone(instanceName, phone);
    if (resolvedPhone) {
      phone = resolvedPhone;
      console.log(`[Webhook] LID resolved successfully to: ${phone}`);
    } else {
      // Could not resolve LID - log the full JID for debugging
      console.warn(`[Webhook] ⚠️ Could not resolve LID to phone number. JID: ${data.key?.remoteJid}, pushName: ${data.pushName || 'N/A'}`);
      console.warn(`[Webhook] ⚠️ Message from this contact will be processed with LID session. Reply may fail.`);
      // Still process the message - store it with the LID as identifier
      // The AI response might fail when trying to send, but at least we record the incoming message
    }
  }
  
  if (!phone) {
    console.warn(`[Webhook] Could not extract phone from JID: ${data.key?.remoteJid || 'undefined'}. Full key: ${JSON.stringify(data.key)}`);
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
      const downloadResult = await downloadMedia(instanceName, mediaKey, mimeType);
      
      if (downloadResult.success && downloadResult.base64) {
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

  console.log(`[Webhook] Processing message from ${phone}${isLidIdentifier(phone) ? ' (LID session)' : ''}: ${messageText.substring(0, 50)}...`);

  // AUTO-CREATE CLIENT: Find or create client with phone number
  const pushName = data.pushName || undefined;
  const clientId = await findOrCreateClient(accountId, phone, pushName);

  // DETECT NAME: Check if user is providing their name
  const detectedName = detectNameInMessage(messageText);
  if (detectedName) {
    await updateClientName(clientId, detectedName);
    console.log(`[Webhook] Name detected and updated: ${detectedName}`);
  }

  // DETECT PAYMENT PREFERENCE: Check if user mentions payment method
  const detectedPayment = detectPaymentPreference(messageText);
  if (detectedPayment) {
    await updateClientPaymentPreference(clientId, detectedPayment);
    console.log(`[Webhook] Payment preference detected: ${detectedPayment}`);
  }

  // Save message to database
  await db.whatsappMessage.create({
    data: {
      accountId,
      clientPhone: phone,
      direction: 'incoming',
      message: messageText,
      messageType,
      status: 'received',
      metadata: JSON.parse(JSON.stringify({
        messageId: data.key?.id ?? undefined,
        pushName: data.pushName ?? undefined,
        timestamp: data.messageTimestamp ?? undefined,
        audioTranscribed,
        detectedName: detectedName || undefined,
        detectedPayment: detectedPayment || undefined,
        raw: data.message ?? undefined,
      })),
    }
  });

  // Update last AI interaction
  await db.client.update({
    where: { id: clientId },
    data: { lastAiInteraction: new Date() }
  });

  // Record processed message for deduplication (7-day TTL)
  if (messageId) {
    await db.processedMessage.create({
      data: {
        messageId,
        accountId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
      }
    }).catch(err => {
      // Ignore unique constraint violations (race condition)
      if (!String(err).includes('Unique')) {
        console.error('[Webhook] Error recording processed message:', err);
      }
    });
  }

  // Process message with AI
  // Pass the original JID so we can send directly to it if phone number resolution fails
  await processMessageWithAI(accountId, phone, messageText, clientId, instanceName, data.key?.remoteJid);
}

/**
 * Process message with AI assistant
 * Handles both normal phone numbers and LID identifiers
 */
async function processMessageWithAI(
  accountId: string,
  phone: string,
  message: string,
  clientId: string,
  instanceName?: string,
  originalJid?: string
): Promise<void> {
  const processStart = Date.now();
  try {
    const integration = await db.integration.findUnique({
      where: { accountId_type: { accountId, type: 'whatsapp' } }
    });

    if (!integration) {
      console.log(`[Webhook] No WhatsApp integration found for account ${accountId}`);
      return;
    }

    const config = typeof integration.config === 'string'
      ? JSON.parse(integration.config || '{}')
      : integration.config || {};

    if (config.autoReplyEnabled === false) {
      console.log('[Webhook] Auto-reply is disabled');
      return;
    }

    // Determine the phone to use for AI context (prefer real phone over LID)
    let phoneForContext = phone;
    let phoneForSending = phone;
    
    if (isLidIdentifier(phone) && instanceName) {
      // Try one more time to resolve the LID before sending
      const resolved = await resolveLidToPhone(instanceName, phone);
      if (resolved) {
        phoneForSending = resolved;
        phoneForContext = resolved;
        console.log(`[Webhook] LID resolved before sending: ${phone} → ${resolved}`);
      } else {
        console.warn(`[Webhook] ⚠️ Cannot send reply - LID ${phone} could not be resolved to phone number`);
        console.warn(`[Webhook] ⚠️ AI response will be generated but NOT delivered via WhatsApp`);
        // Still generate the AI response and save it, but sending will fail
      }
    }

    // Generate AI response with full context
    console.log(`[Webhook] 🤖 Generating AI response for phone: ${phoneForContext}...`);
    const response = await generateAIResponse(accountId, phoneForContext, message);

    if (response) {
      const aiTime = Date.now() - processStart;
      console.log(`[Webhook] 🤖 AI response generated in ${aiTime}ms: "${response.substring(0, 80)}..."`);
      
      const savedMessage = await db.whatsappMessage.create({
        data: {
          accountId,
          clientPhone: phoneForContext,
          direction: 'outgoing',
          message: response,
          messageType: 'text',
          status: 'pending',
          metadata: { 
            autoReply: true,
            originalIdentifier: isLidIdentifier(phone) ? phone : undefined,
            processingTimeMs: aiTime,
          }
        }
      });

      // Only try to send if we have a real phone number
      if (!isLidIdentifier(phoneForSending)) {
        console.log(`[Webhook] 📤 Sending WhatsApp message to ${phoneForSending}...`);
        const sendResult = await sendWhatsAppMessage(accountId, phoneForSending, response);

        if (sendResult.success) {
          console.log(`[Webhook] ✅ Message sent successfully to ${phoneForSending}`);
        } else {
          console.error(`[Webhook] ❌ Failed to send message to ${phoneForSending}: ${sendResult.error}`);
          // If sending to phone number failed and we have a JID, try sending directly to JID
          if (originalJid && instanceName) {
            console.log(`[Webhook] 📤 Retrying: Sending directly to JID ${originalJid}...`);
            const jidResult = await sendWhatsAppMessageToJid(instanceName, originalJid, response);
            if (jidResult.success) {
              console.log(`[Webhook] ✅ Message sent successfully to JID ${originalJid}`);
            } else {
              console.error(`[Webhook] ❌ Failed to send to JID ${originalJid}: ${jidResult.error}`);
            }
            await db.whatsappMessage.update({
              where: { id: savedMessage.id },
              data: { 
                status: jidResult.success ? 'sent' : 'failed',
                metadata: { autoReply: true, error: jidResult.success ? null : jidResult.error, sentViaJid: true, processingTimeMs: aiTime }
              }
            });
          } else {
            await db.whatsappMessage.update({
              where: { id: savedMessage.id },
              data: { 
                status: 'failed',
                metadata: { autoReply: true, error: sendResult.error, processingTimeMs: aiTime }
              }
            });
          }
        }
        
        // Update status if first send succeeded
        if (sendResult.success) {
          await db.whatsappMessage.update({
            where: { id: savedMessage.id },
            data: { 
              status: 'sent',
              metadata: { autoReply: true, processingTimeMs: aiTime }
            }
          });
        }
      } else {
        // Phone is a LID - try sending directly to the original JID as fallback
        if (originalJid && instanceName) {
          console.log(`[Webhook] 📤 LID detected, sending directly to JID ${originalJid}...`);
          const jidResult = await sendWhatsAppMessageToJid(instanceName, originalJid, response);
          
          if (jidResult.success) {
            console.log(`[Webhook] ✅ Message sent successfully to JID ${originalJid}`);
          } else {
            console.error(`[Webhook] ❌ Failed to send to JID ${originalJid}: ${jidResult.error}`);
          }
          
          await db.whatsappMessage.update({
            where: { id: savedMessage.id },
            data: { 
              status: jidResult.success ? 'sent' : 'failed',
              metadata: { 
                autoReply: true, 
                error: jidResult.success ? null : `JID send failed: ${jidResult.error}`,
                sentViaJid: true,
                originalIdentifier: phone,
                processingTimeMs: aiTime,
              }
            }
          });
        } else {
          // No JID available - mark as failed
          await db.whatsappMessage.update({
            where: { id: savedMessage.id },
            data: { 
              status: 'failed',
              metadata: { 
                autoReply: true, 
                error: 'Cannot send to LID identifier - no JID fallback available',
                originalIdentifier: phone,
                processingTimeMs: aiTime,
              }
            }
          });
          console.warn(`[Webhook] ⚠️ AI response saved but NOT sent - could not resolve LID and no JID available: ${phone}`);
        }
      }
    } else {
      console.error(`[Webhook] ❌ AI response was null for message from ${phoneForContext}`);
    }
  } catch (error) {
    const elapsed = Date.now() - processStart;
    console.error(`[Webhook] ❌ Error processing AI response after ${elapsed}ms:`, error);
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
      console.log(`[Webhook] AI not available for account ${accountId}: ${canUse.reason}`);
      return getFallbackResponse(accountId, message);
    }

    // Generate system prompt with full salon and client context
    console.log('[Webhook] Generating system prompt...');
    const systemPrompt = await generateSystemPrompt(accountId, phone);
    console.log(`[Webhook] System prompt generated (${systemPrompt.length} chars)`);
    
    // Get conversation history from database (more reliable than in-memory)
    const history = await getConversationHistory(accountId, phone, 10);
    console.log(`[Webhook] Conversation history: ${history.length} messages`);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(0, -1),
      { role: 'user', content: message }
    ];

    console.log(`[Webhook] Sending ${messages.length} messages to AI (system prompt + ${history.length - 1} history + 1 user message)`);
    const result = await generateChatCompletion(accountId, messages);

    if (!result.success) {
      console.error(`[Webhook] ❌ AI generation failed: ${result.error}`);
      return getFallbackResponse(accountId, message);
    }

    console.log(`[Webhook] ✅ AI response via ${result.provider} (${result.totalTokens} tokens, fallback: ${result.fallbackUsed})`);
    return result.content || getFallbackResponse(accountId, message);

  } catch (error) {
    console.error('[Webhook] ❌ Error generating AI response:', error);
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
  
  return `Olá! Sou a Luna, assistente virtual de ${businessName}. Como posso te ajudar hoje? 😊`;
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

/**
 * Check if a request body looks like a legitimate Evolution API webhook event.
 * This is used as a fallback authentication method when the webhook secret
 * header isn't configured on the Evolution API side yet.
 * 
 * A legitimate Evolution API event has:
 * - An "event" field with a known event type
 * - An "instance" field with a valid instance name
 * - Optional "data" field with event-specific data
 */
function isValidEvolutionApiEvent(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;
  
  // Must have an event field
  if (!obj.event || typeof obj.event !== 'string') return false;
  
  // Must have an instance field
  if (!obj.instance || typeof obj.instance !== 'string') return false;
  
  // Event must be a known Evolution API event type
  const knownEvents = [
    'APPLICATION_STARTUP',
    'QRCODE_UPDATED',
    'CONNECTION_UPDATE',
    'MESSAGES_UPSERT',
    'MESSAGES_UPDATE',
    'SEND_MESSAGE',
    'messages.upsert',
    'connection.update',
    'qrcode.updated',
    'application.startup',
  ];
  
  return knownEvents.includes(obj.event);
}

// POST - Handle webhook from Evolution API
export async function POST(request: NextRequest) {
  // Step 1: Try header-based authentication
  const isHeaderAuth = await verifyWebhookRequest(request);
  
  // Step 2: Parse the request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.warn('[Webhook] Failed to parse request body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  
  // Step 3: If header auth failed, check if the body looks like a legitimate Evolution API event
  // This is a fallback for when the webhook secret header hasn't been configured on Evolution API yet
  if (!isHeaderAuth) {
    if (isValidEvolutionApiEvent(body)) {
      console.warn('[Webhook] ⚠️ Header auth failed, but request body is a valid Evolution API event. Processing anyway - please configure webhook headers on Evolution API for proper security.');
      console.warn('[Webhook] ⚠️ Use the /api/integrations/whatsapp/reconfigure-webhook endpoint to add the x-webhook-secret header.');
    } else {
      // Not a valid Evolution API event and no auth header - reject
      console.warn('[Webhook] Unauthorized request - invalid webhook secret AND not a valid Evolution API event');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const webhookBody = body as { event?: string; instance?: string; data?: unknown };
    const event = webhookBody.event || '';

    // Enhanced logging for message events - helps debug LID and phone issues
    if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
      const webhookData = webhookBody as EvolutionWebhookData;
      const jid = webhookData.data?.key?.remoteJid || 'unknown';
      const fromMe = webhookData.data?.key?.fromMe || false;
      const pushName = webhookData.data?.pushName || 'unknown';
      const hasText = !!(webhookData.data?.message?.conversation || webhookData.data?.message?.extendedTextMessage?.text);
      const hasAudio = !!webhookData.data?.message?.audioMessage;
      const hasImage = !!webhookData.data?.message?.imageMessage;
      
      console.log(`[Webhook] 📨 Message event - JID: ${jid}, fromMe: ${fromMe}, pushName: ${pushName}, text: ${hasText}, audio: ${hasAudio}, image: ${hasImage}`);
      
      // Log JID format for debugging LID issues
      if (jid.includes('@lid')) {
        console.log(`[Webhook] 🔍 LID format detected in incoming message. Full data key: ${JSON.stringify(webhookData.data?.key)}`);
      }
      
      // Also log the participant field if present (may contain real phone for LID messages)
      if (webhookData.data?.key?.participant) {
        console.log(`[Webhook] 🔍 Participant field present: ${webhookData.data.key.participant}`);
      }
    }

    switch (event) {
      case 'MESSAGES_UPSERT':
      case 'messages.upsert':
        await processIncomingMessage(webhookBody.instance!, webhookBody as EvolutionWebhookData);
        break;

      case 'CONNECTION_UPDATE':
      case 'connection.update':
        await updateConnectionStatus(webhookBody.instance || '', (webhookBody as { data?: { state?: string } }).data?.state || '');
        break;

      case 'QRCODE_UPDATED':
      case 'qrcode.updated':
        console.log(`[Webhook] QR Code updated for: ${webhookBody.instance}`);
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

// GET - Health check + cleanup expired dedup records
export async function GET() {
  // Cleanup expired ProcessedMessage records (async, don't block response)
  db.processedMessage.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  }).then(result => {
    if (result.count > 0) {
      console.log(`[Webhook] Cleaned up ${result.count} expired dedup records`);
    }
  }).catch(err => {
    console.error('[Webhook] Error cleaning up dedup records:', err);
  });

  return NextResponse.json({
    status: 'ok',
    message: 'Evolution API Webhook endpoint is active',
    timestamp: new Date().toISOString(),
    features: ['text', 'image', 'audio_transcription', 'auto_client_creation', 'name_detection', 'payment_preference_detection', 'message_deduplication', 'lid_resolution', 'enhanced_jid_parsing']
  });
}
