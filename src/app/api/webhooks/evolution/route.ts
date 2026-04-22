import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateChatCompletion, canAccountUseAI, transcribeAudioBase64, type ChatMessage } from '@/lib/ai-provider-service';
import { generateSystemPrompt, findOrCreateClient, detectNameInMessage, updateClientName, detectPaymentPreference, updateClientPaymentPreference, detectCpfInMessage, updateClientCpf } from '@/lib/ai-context-service';
import { decryptCredentials } from '@/app/api/integrations/route';

/**
 * In-memory processing lock to prevent duplicate AI responses.
 * Key: `${accountId}:${phone}`, Value: timestamp when processing started
 * This prevents race conditions where two concurrent webhook requests for the
 * same phone number both start AI generation before either completes.
 */
const processingLocks = new Map<string, number>();
const PROCESSING_LOCK_TTL = 30_000; // 30 seconds - max time for AI processing

function acquireProcessingLock(key: string): boolean {
  const now = Date.now();
  const existingLock = processingLocks.get(key);
  
  // If there's an existing lock that hasn't expired, deny
  if (existingLock && (now - existingLock) < PROCESSING_LOCK_TTL) {
    return false;
  }
  
  // Acquire the lock
  processingLocks.set(key, now);
  return true;
}

function releaseProcessingLock(key: string): void {
  processingLocks.delete(key);
}

// Cleanup expired locks every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processingLocks.entries()) {
    if (now - timestamp > PROCESSING_LOCK_TTL) {
      processingLocks.delete(key);
    }
  }
}, 60_000);

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
    
    // Validate phone number using strict validation
    if (!isValidPhoneNumber(formattedPhone)) {
      return { success: false, error: `Invalid phone number format: ${formattedPhone} - not a valid phone number` };
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
 * Send a WhatsApp interactive button message via Evolution API
 * Creates a message with clickable buttons
 */
async function sendWhatsAppButtons(
  instanceName: string,
  phone: string,
  title: string,
  description: string,
  buttons: { id: string; text: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const systemConfig = await getEvolutionApiConfig();
    if (!systemConfig) {
      return { success: false, error: 'Evolution API not configured' };
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.includes('@')) {
      if (!isValidPhoneNumber(formattedPhone)) {
        return { success: false, error: `Invalid phone number for buttons: ${formattedPhone}` };
      }
      if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10 && formattedPhone.length <= 11) {
        formattedPhone = '55' + formattedPhone;
      }
    }

    // Evolution API v2 sendButtons format
    const body = {
      number: formattedPhone,
      options: { delay: 1200, presence: 'composing' },
      titleMessage: { text: title },
      descriptionMessage: { text: description },
      buttons: buttons.map(b => ({
        buttonId: b.id,
        buttonText: { displayText: b.text },
      })),
    };

    console.log(`[Webhook] 🔘 Sending interactive buttons to ${formattedPhone}: ${buttons.map(b => b.text).join(', ')}`);

    const response = await fetch(`${systemConfig.apiUrl}/message/sendButtons/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': systemConfig.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Webhook] sendButtons API error: ${response.status} - ${errorText.substring(0, 200)}`);
      return { success: false, error: `sendButtons API error: ${response.status}` };
    }

    console.log(`[Webhook] ✅ Interactive buttons sent to ${formattedPhone}`);
    return { success: true };
  } catch (error) {
    console.error('[Webhook] sendButtons error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a WhatsApp link preview message via Evolution API
 * Creates a message with a clickable URL preview card
 */
async function sendWhatsAppLinkMessage(
  instanceName: string,
  phone: string,
  text: string,
  url: string,
  title: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const systemConfig = await getEvolutionApiConfig();
    if (!systemConfig) {
      return { success: false, error: 'Evolution API not configured' };
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.includes('@')) {
      if (!isValidPhoneNumber(formattedPhone)) {
        return { success: false, error: `Invalid phone number for link: ${formattedPhone}` };
      }
      if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10 && formattedPhone.length <= 11) {
        formattedPhone = '55' + formattedPhone;
      }
    }

    // Evolution API sendLink format
    const body = {
      number: formattedPhone,
      options: { delay: 1200, presence: 'composing' },
      linkPreview: {
        url,
        title,
        description,
      },
      textMessage: { text },
    };

    console.log(`[Webhook] 🔗 Sending link message to ${formattedPhone}: ${url}`);

    const response = await fetch(`${systemConfig.apiUrl}/message/sendLink/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': systemConfig.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Webhook] sendLink API error: ${response.status} - ${errorText.substring(0, 200)}`);
      return { success: false, error: `sendLink API error: ${response.status}` };
    }

    console.log(`[Webhook] ✅ Link message sent to ${formattedPhone}`);
    return { success: true };
  } catch (error) {
    console.error('[Webhook] sendLink error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send PIX payment information via WhatsApp with interactive features
 * Sends: 1) Text confirmation  2) PIX code (easy to copy)  3) Interactive button with payment link
 */
async function sendPixPaymentMessage(
  accountId: string,
  phone: string,
  confirmationText: string,
  pixData: { qrCode?: string; ticketUrl?: string; deepLink?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const systemConfig = await getEvolutionApiConfig();
    if (!systemConfig) {
      // Fallback: send as plain text
      return await sendWhatsAppMessage(accountId, phone, confirmationText);
    }

    const integration = await db.integration.findUnique({
      where: { accountId_type: { accountId, type: 'whatsapp' } }
    });
    if (!integration) {
      return await sendWhatsAppMessage(accountId, phone, confirmationText);
    }

    const credentials = typeof integration.credentials === 'string'
      ? JSON.parse(integration.credentials)
      : integration.credentials;
    const instanceName = credentials.instanceName;
    if (!instanceName) {
      return await sendWhatsAppMessage(accountId, phone, confirmationText);
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!isValidPhoneNumber(formattedPhone)) {
      // Can't send interactive messages to invalid numbers, fall back to text
      return await sendWhatsAppMessage(accountId, phone, confirmationText);
    }
    if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10 && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    // Step 1: Send the confirmation text (without PIX code)
    const textResult = await sendWhatsAppMessage(accountId, phone, confirmationText);
    if (!textResult.success) {
      console.error(`[Webhook] Failed to send confirmation text: ${textResult.error}`);
      // Still try to send PIX info
    }

    // Step 2: Send PIX code in a SEPARATE message for easy copying
    if (pixData.qrCode) {
      const pixCodeMessage = `📋 *PIX Copia e Cola:*\n\n${pixData.qrCode}\n\n⏰ Expira em 1 hora. Após pagar, seu agendamento será confirmado automaticamente!`;
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pixCodeResult = await sendWhatsAppMessage(accountId, phone, pixCodeMessage);
      if (!pixCodeResult.success) {
        console.error(`[Webhook] Failed to send PIX code: ${pixCodeResult.error}`);
      }
    }

    // Step 3: Send interactive button or link for payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (pixData.ticketUrl) {
      // Try interactive buttons first
      const buttonResult = await sendWhatsAppButtons(
        instanceName,
        formattedPhone,
        '💳 Pagamento PIX',
        'Clique no botão abaixo para pagar agora:',
        [{ id: 'pay_pix_now', text: '💳 Pagar Agora' }]
      );

      if (!buttonResult.success) {
        // Fallback: send as link message
        console.log(`[Webhook] Buttons failed, trying link message...`);
        const linkResult = await sendWhatsAppLinkMessage(
          instanceName,
          formattedPhone,
          `💳 Clique para pagar: ${pixData.ticketUrl}`,
          pixData.ticketUrl,
          'Pagar PIX - AgendZap',
          'Clique para abrir a página de pagamento'
        );

        if (!linkResult.success) {
          // Last fallback: just send the URL as text (WhatsApp auto-makes it clickable)
          console.log(`[Webhook] Link message failed, sending URL as text...`);
          await sendWhatsAppMessage(accountId, phone, `💳 Clique aqui para pagar: ${pixData.ticketUrl}`);
        }
      }
    } else if (pixData.deepLink) {
      // No ticket URL but have deep link - send as clickable text
      await sendWhatsAppMessage(accountId, phone, `📱 Pagar pelo app do banco: ${pixData.deepLink}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[Webhook] sendPixPaymentMessage error:', error);
    // Fallback to plain text
    return await sendWhatsAppMessage(accountId, phone, confirmationText);
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
 * Validate that a number looks like a real phone number (not a LID-derived number)
 * Brazilian numbers: 12-13 digits starting with 55 (country code)
 * Local Brazilian: 10-11 digits (area code + number)
 * International: 8-15 digits with valid country code prefix
 * 
 * LID-derived numbers are typically 15 digits and DON'T start with valid
 * country/area codes. For example, 147102780940432 (15 digits, starts with
 * 14 which is not a valid Brazilian area code pattern).
 */
function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  
  // Too short or too long for any phone number
  if (digits.length < 10 || digits.length > 15) return false;
  
  // Brazilian number with country code: 55XX9XXXXXXXX (12-13 digits)
  if (digits.startsWith('55')) {
    const localPart = digits.slice(2); // Remove 55 country code
    // Valid Brazilian area codes: 11-99 (two digits)
    const areaCode = localPart.slice(0, 2);
    if (/^[1-9][0-9]$/.test(areaCode)) {
      // After area code: 8-9 digits (mobile with 9th digit, or landline 8 digits)
      const subscriberNumber = localPart.slice(2);
      if (subscriberNumber.length >= 8 && subscriberNumber.length <= 9) {
        return true;
      }
    }
    // Some numbers might have fewer digits but still valid
    if (localPart.length >= 8 && localPart.length <= 11) return true;
  }
  
  // Local Brazilian format without country code: XX9XXXXXXXX (10-11 digits)
  if (digits.length >= 10 && digits.length <= 11) {
    const areaCode = digits.slice(0, 2);
    if (/^[1-9][0-9]$/.test(areaCode)) {
      return true;
    }
  }
  
  // Other international numbers (not Brazilian): more lenient check
  // But still reject numbers that look like LID-derived values
  // LID numbers are typically 15 digits with no valid country code pattern
  if (digits.length === 15 && !digits.startsWith('55')) {
    // Very likely a LID-derived number, not a real phone
    // Real 15-digit international numbers are rare
    return false;
  }
  
  // For other lengths, check if it has a reasonable structure
  // Must start with 1-9 (no leading zeros in phone numbers)
  if (/^[1-9]/.test(digits)) {
    return true;
  }
  
  return false;
}

/**
 * Cache for LID → phone number mappings (in-memory, persists across requests)
 * Prevents repeated API calls for the same LID
 */
const lidPhoneCache = new Map<string, { phone: string; timestamp: number }>();
const LID_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached phone number for a LID identifier
 */
function getCachedLidPhone(lidIdentifier: string): string | null {
  const cached = lidPhoneCache.get(lidIdentifier);
  if (cached && (Date.now() - cached.timestamp) < LID_CACHE_TTL) {
    return cached.phone;
  }
  if (cached) {
    lidPhoneCache.delete(lidIdentifier); // Expired
  }
  return null;
}

/**
 * Cache a LID → phone number mapping
 */
function setCachedLidPhone(lidIdentifier: string, phone: string): void {
  lidPhoneCache.set(lidIdentifier, { phone, timestamp: Date.now() });
  // Cleanup old entries if cache gets too large
  if (lidPhoneCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of lidPhoneCache.entries()) {
      if (now - value.timestamp > LID_CACHE_TTL) {
        lidPhoneCache.delete(key);
      }
    }
  }
}

/**
 * Resolve a LID identifier to an actual phone number using Evolution API
 * Uses multiple methods to resolve the contact's real phone number.
 * 
 * IMPORTANT: Returns ONLY validated phone numbers that pass isValidPhoneNumber().
 * LID-derived digit strings (e.g., 147102780940432) are NOT returned.
 */
async function resolveLidToPhone(
  instanceName: string,
  lidIdentifier: string
): Promise<string | null> {
  try {
    // Check in-memory cache first
    const cached = getCachedLidPhone(lidIdentifier);
    if (cached) {
      console.log(`[Webhook] LID resolved from cache: ${lidIdentifier} → ${cached}`);
      return cached;
    }

    const systemConfig = await getEvolutionApiConfig();
    if (!systemConfig) {
      console.log('[Webhook] Cannot resolve LID: Evolution API not configured');
      return null;
    }

    const lidValue = lidIdentifier.replace('lid:', '');
    const lidJid = `${lidValue}@lid`;

    console.log(`[Webhook] Attempting to resolve LID: ${lidJid}`);

    // Method 1: Use fetchPhoneNumber endpoint (specifically designed for LID resolution)
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
        // The response may have the phone in different fields depending on Evolution API version
        const candidates = [
          data?.phoneNumber,
          data?.phone,
          data?.number,
          data?.jid?.split('@')[0],
          data?.id?.split('@')[0],
        ].filter(Boolean);
        
        for (const candidate of candidates) {
          if (isValidPhoneNumber(candidate) && !candidate.includes(lidValue)) {
            console.log(`[Webhook] LID resolved via fetchPhoneNumber to: ${candidate}`);
            setCachedLidPhone(lidIdentifier, candidate);
            return candidate;
          }
        }
        
        // Log what we got for debugging
        console.log(`[Webhook] fetchPhoneNumber returned data but no valid phone: ${JSON.stringify(data).substring(0, 200)}`);
      }
    } catch (err) {
      console.log('[Webhook] fetchPhoneNumber endpoint failed, trying alternative:', err);
    }

    // Method 2: Try getBaseProfile endpoint
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
        const candidates = [
          data?.id?.split('@')[0],
          data?.jid?.split('@')[0],
          data?.phoneNumber,
          data?.number,
        ].filter(Boolean);
        
        for (const candidate of candidates) {
          if (isValidPhoneNumber(candidate) && !candidate.includes(lidValue)) {
            console.log(`[Webhook] LID resolved via getBaseProfile to: ${candidate}`);
            setCachedLidPhone(lidIdentifier, candidate);
            return candidate;
          }
        }
        
        // If we got a @s.whatsapp.net JID, that's the real phone number
        const realJid = data?.id || data?.jid || '';
        if (realJid.includes('@s.whatsapp.net')) {
          const phoneFromJid = realJid.split('@')[0];
          if (isValidPhoneNumber(phoneFromJid)) {
            console.log(`[Webhook] LID resolved via getBaseProfile JID to: ${phoneFromJid}`);
            setCachedLidPhone(lidIdentifier, phoneFromJid);
            return phoneFromJid;
          }
        }
        
        console.log(`[Webhook] getBaseProfile returned data but no valid phone: ${JSON.stringify(data).substring(0, 200)}`);
      }
    } catch (err) {
      console.log('[Webhook] getBaseProfile endpoint failed:', err);
    }

    // Method 3: Try findContacts endpoint - search for contacts with this LID
    // Also try to find contacts that have both a LID and a real phone number
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
        const contacts = Array.isArray(data) ? data : [data];
        for (const contact of contacts) {
          // Check if the contact has a real @s.whatsapp.net JID (not just @lid)
          const contactId = contact?.id || contact?.jid || '';
          
          // Skip if this is just the same LID JID
          if (contactId.includes('@lid')) continue;
          
          // If it's a real @s.whatsapp.net JID, extract the phone
          if (contactId.includes('@s.whatsapp.net')) {
            const phoneFromJid = contactId.split('@')[0];
            if (isValidPhoneNumber(phoneFromJid)) {
              console.log(`[Webhook] LID resolved via findContacts (s.whatsapp.net) to: ${phoneFromJid}`);
              setCachedLidPhone(lidIdentifier, phoneFromJid);
              return phoneFromJid;
            }
          }
          
          // Check other fields for phone numbers
          const phoneCandidates = [
            contact?.phoneNumber,
            contact?.number,
            contact?.phone,
          ].filter(Boolean);
          
          for (const candidate of phoneCandidates) {
            if (isValidPhoneNumber(String(candidate))) {
              console.log(`[Webhook] LID resolved via findContacts (phone field) to: ${candidate}`);
              setCachedLidPhone(lidIdentifier, String(candidate));
              return String(candidate);
            }
          }
        }
      }
    } catch (err) {
      console.log('[Webhook] findContacts endpoint failed:', err);
    }

    // Method 4: Try getContactProfile - some Evolution API versions support this
    try {
      const response = await fetch(
        `${systemConfig.apiUrl}/chat/getContactProfile/${instanceName}?jid=${encodeURIComponent(lidJid)}`,
        {
          method: 'GET',
          headers: {
            'apikey': systemConfig.apiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Check for real phone number in the response
        const candidates = [
          data?.id?.split('@')[0],
          data?.jid?.split('@')[0],
          data?.phoneNumber,
          data?.number,
        ].filter(Boolean);
        
        for (const candidate of candidates) {
          if (isValidPhoneNumber(candidate) && !candidate.includes(lidValue)) {
            console.log(`[Webhook] LID resolved via getContactProfile to: ${candidate}`);
            setCachedLidPhone(lidIdentifier, candidate);
            return candidate;
          }
        }
        
        // Check if response has a realJid or lidToJid field
        const realJid = data?.realJid || data?.lidToJid || '';
        if (realJid.includes('@s.whatsapp.net')) {
          const phoneFromJid = realJid.split('@')[0];
          if (isValidPhoneNumber(phoneFromJid)) {
            console.log(`[Webhook] LID resolved via getContactProfile realJid to: ${phoneFromJid}`);
            setCachedLidPhone(lidIdentifier, phoneFromJid);
            return phoneFromJid;
          }
        }
      }
    } catch (err) {
      console.log('[Webhook] getContactProfile endpoint failed:', err);
    }

    // Method 5: Try fetchContacts - get all contacts and search by matching LID
    // This is more expensive but may find contacts with both LID and phone number
    try {
      const response = await fetch(
        `${systemConfig.apiUrl}/chat/fetchContacts/${instanceName}`,
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
        const contacts = Array.isArray(data) ? data : [data];
        
        for (const contact of contacts) {
          const contactId = contact?.id || '';
          // Look for contacts that have a @s.whatsapp.net JID paired with this LID
          if (contactId.includes('@s.whatsapp.net')) {
            const phoneFromJid = contactId.split('@')[0];
            if (isValidPhoneNumber(phoneFromJid)) {
              console.log(`[Webhook] LID resolved via fetchContacts to: ${phoneFromJid}`);
              setCachedLidPhone(lidIdentifier, phoneFromJid);
              return phoneFromJid;
            }
          }
        }
      }
    } catch (err) {
      console.log('[Webhook] fetchContacts endpoint failed:', err);
    }

    console.log(`[Webhook] ❌ Could not resolve LID ${lidJid} to a valid phone number`);
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
  // Use optimistic locking: create the processed message record FIRST, then process
  // This prevents race conditions where two concurrent requests both pass the findUnique check
  const messageId = data.key?.id;
  if (messageId) {
    try {
      await db.processedMessage.create({
        data: {
          messageId,
          accountId: '', // Will be updated after we find the account
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      });
    } catch (err: any) {
      // Unique constraint violation = duplicate message
      if (err?.code === 'P2002' || String(err).includes('Unique')) {
        console.log(`[Webhook] Skipping duplicate message: ${messageId}`);
        return;
      }
      // Other errors: log but continue (don't block processing)
      console.warn(`[Webhook] Could not record processed message: ${err?.message || err}`);
    }
  }
  
  // ADDITIONAL INCOMING DEDUP: Check if we already processed a message with the same
  // content from the same JID in the last 30 seconds. This catches cases where Evolution API
  // sends the same message with a DIFFERENT messageId (e.g., MESSAGES_UPSERT + messages.upsert)
  const remoteJid = data.key?.remoteJid;
  const incomingText = data.message?.conversation || data.message?.extendedTextMessage?.text || '';
  if (remoteJid && incomingText) {
    try {
      const recentIncoming = await db.whatsappMessage.findFirst({
        where: {
          clientPhone: { contains: remoteJid.split('@')[0].slice(-9) },
          direction: 'incoming',
          message: incomingText,
          createdAt: { gt: new Date(Date.now() - 30_000) }, // Last 30 seconds
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recentIncoming) {
        console.log(`[Webhook] Skipping duplicate incoming message - same content from ${remoteJid} already processed at ${recentIncoming.createdAt.toISOString()}`);
        return;
      }
    } catch (err) {
      // Don't block processing if dedup check fails
      console.warn(`[Webhook] Content-based dedup check failed:`, err);
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
  
  // IMPORTANT: Try the 'notify' field which WhatsApp sometimes includes
  // The notify field contains the real phone number even when the JID is a LID
  // Example: notify: "5541984195685" when remoteJid is "147102780940432@lid"
  if (data.notify) {
    const notifyDigits = String(data.notify).replace(/\D/g, '');
    if (isValidPhoneNumber(notifyDigits)) {
      console.log(`[Webhook] Phone extracted from notify field: ${notifyDigits} (overriding ${phone || 'no phone'})`);
      phone = notifyDigits;
    }
  }
  
  // If we got a LID identifier, try to resolve it to a real phone number
  // NOTE: We need accountId for database lookups, so we find it first
  if (phone && isLidIdentifier(phone)) {
    console.log(`[Webhook] LID detected, attempting phone resolution for: ${phone}`);
    
    try {
      // Find the account ID first (needed for database lookups)
      const lidAccountId = await findAccountByInstance(instanceName);
      const lidValue = phone.replace('lid:', '');
      
      if (lidAccountId) {
        // Method 1: Try Evolution API resolution (most reliable)
        const resolvedPhone = await resolveLidToPhone(instanceName, phone);
        if (resolvedPhone && isValidPhoneNumber(resolvedPhone)) {
          phone = resolvedPhone;
          console.log(`[Webhook] LID resolved via Evolution API to: ${phone}`);
        } else {
          // Method 2: Look at ALL outgoing messages that were successfully sent
          // Find the phone number with the most successful deliveries
          const sentMessages = await db.whatsappMessage.findMany({
            where: {
              accountId: lidAccountId,
              direction: 'outgoing',
              status: 'sent',
            },
            select: { clientPhone: true }
          });
          
          // Count frequency and find the most common real phone number
          const phoneFreq: Record<string, number> = {};
          for (const msg of sentMessages) {
            const p = msg.clientPhone;
            if (p && !p.startsWith('lid:') && isValidPhoneNumber(p)) {
              phoneFreq[p] = (phoneFreq[p] || 0) + 1;
            }
          }
          
          const sorted = Object.entries(phoneFreq).sort((a, b) => b[1] - a[1]);
          console.log(`[Webhook] LID resolution candidates: ${JSON.stringify(sorted)}`);
          
          if (sorted.length > 0) {
            phone = sorted[0][0];
            console.log(`[Webhook] LID resolved via message frequency to: ${phone} (${sorted[0][1]} messages)`);
          } else {
            console.warn(`[Webhook] ⚠️ Could not resolve LID. No real phone found in sent messages.`);
          }
        }
      }
    } catch (lidError) {
      console.error(`[Webhook] Error during LID resolution: ${lidError instanceof Error ? lidError.message : lidError}`);
      // Continue with the LID as phone - the message sending will likely fail but at least we won't crash
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

  // DETECT CPF: Check if user is providing their CPF (needed for PIX payments)
  const detectedCpf = detectCpfInMessage(messageText);
  if (detectedCpf) {
    await updateClientCpf(clientId, detectedCpf);
    console.log(`[Webhook] CPF detected and updated: ${detectedCpf.substring(0, 3)}***`);
  }

  // Save message to database
  // Include LID identifier in metadata for future DB-based LID resolution
  const messageMetadata: Record<string, unknown> = {
    messageId: data.key?.id ?? undefined,
    pushName: data.pushName ?? undefined,
    timestamp: data.messageTimestamp ?? undefined,
    audioTranscribed,
    detectedName: detectedName || undefined,
    detectedPayment: detectedPayment || undefined,
    detectedCpf: detectedCpf || undefined,
    raw: data.message ?? undefined,
  };
  
  // If we have a LID identifier, store it in metadata for future lookups
  if (isLidIdentifier(phone)) {
    messageMetadata.originalLid = phone.replace('lid:', '');
    messageMetadata.lidIdentifier = phone;
    messageMetadata.originalJid = data.key?.remoteJid;
  }
  // If we resolved a LID to a real phone, store the mapping for future lookups
  if (data.key?.remoteJid?.includes('@lid') && !isLidIdentifier(phone)) {
    messageMetadata.resolvedFromLid = data.key?.remoteJid;
  }
  
  await db.whatsappMessage.create({
    data: {
      accountId,
      clientPhone: phone,
      direction: 'incoming',
      message: messageText,
      messageType,
      status: 'received',
      metadata: JSON.parse(JSON.stringify(messageMetadata)),
    }
  });

  // Update last AI interaction
  await db.client.update({
    where: { id: clientId },
    data: { lastAiInteraction: new Date() }
  });

  // Update the processed message record with the correct accountId
  if (messageId) {
    await db.processedMessage.updateMany({
      where: { messageId },
      data: { accountId }
    }).catch(() => {}); // Don't fail if update fails
  }

  // Process message with AI
  // Use an in-memory processing lock to prevent duplicate AI responses for the same phone
  const lockKey = `${accountId}:${phone}`;
  if (!acquireProcessingLock(lockKey)) {
    console.log(`[Webhook] Skipping - already processing message for ${phone}`);
    return;
  }
  
  try {
    await processMessageWithAI(accountId, phone, messageText, clientId, instanceName, data.key?.remoteJid);
  } finally {
    releaseProcessingLock(lockKey);
  }
}

/**
 * Parse [AGENDAR:serviceName:professionalName:YYYY-MM-DD:HH:mm:paymentMethod] from AI response
 * Returns the booking data and the cleaned response text (without the marker)
 */
function parseBookingCommand(aiResponse: string): {
  cleanedResponse: string;
  booking: {
    serviceName: string;
    professionalName: string;
    date: string;
    time: string;
    paymentMethod: string;
  } | null;
} {
  const bookingRegex = /\[AGENDAR:([^:]+):([^:]+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2}):([^\]]+)\]/;
  const match = aiResponse.match(bookingRegex);
  
  if (!match) {
    return { cleanedResponse: aiResponse, booking: null };
  }
  
  const booking = {
    serviceName: match[1].trim(),
    professionalName: match[2].trim(),
    date: match[3].trim(),
    time: match[4].trim(),
    paymentMethod: match[5].trim(),
  };
  
  // Remove the booking marker from the response text
  const cleanedResponse = aiResponse.replace(bookingRegex, '').trim();
  
  return { cleanedResponse, booking };
}

/**
 * Create an appointment from a parsed booking command
 * Also creates PIX payment if Mercado Pago is connected and payment method is pix
 */
async function createAppointmentFromBooking(
  accountId: string,
  clientId: string,
  booking: {
    serviceName: string;
    professionalName: string;
    date: string;
    time: string;
    paymentMethod: string;
  }
): Promise<{ success: boolean; appointmentId?: string; error?: string; pixData?: { qrCode?: string; qrCodeBase64?: string; ticketUrl?: string; deepLink?: string } }> {
  try {
    console.log(`[Webhook] Creating appointment: service="${booking.serviceName}", professional="${booking.professionalName}", date=${booking.date}, time=${booking.time}, payment=${booking.paymentMethod}`);
    
    // Find the service by name (exact match first, then partial)
    let foundService = await db.service.findFirst({
      where: { accountId, name: { equals: booking.serviceName, mode: 'insensitive' } }
    });
    
    if (!foundService) {
      foundService = await db.service.findFirst({
        where: { accountId, name: { contains: booking.serviceName, mode: 'insensitive' }, isActive: true }
      });
    }
    
    if (!foundService) {
      // Last resort: list all services for debugging
      const allServices = await db.service.findMany({ where: { accountId, isActive: true }, select: { name: true } });
      console.error(`[Webhook] Service not found: "${booking.serviceName}". Available services: ${allServices.map(s => s.name).join(', ')}`);
      return { success: false, error: `Service not found: ${booking.serviceName}` };
    }
    
    // Find the professional by name (exact match first, then partial)
    let foundProfessional = await db.professional.findFirst({
      where: { accountId, name: { equals: booking.professionalName, mode: 'insensitive' }, isActive: true }
    });
    
    if (!foundProfessional) {
      foundProfessional = await db.professional.findFirst({
        where: { accountId, name: { contains: booking.professionalName, mode: 'insensitive' }, isActive: true }
      });
    }
    
    if (!foundProfessional) {
      const allProfs = await db.professional.findMany({ where: { accountId, isActive: true }, select: { name: true } });
      console.error(`[Webhook] Professional not found: "${booking.professionalName}". Available professionals: ${allProfs.map(p => p.name).join(', ')}`);
      return { success: false, error: `Professional not found: ${booking.professionalName}` };
    }
    
    // Parse date and time (handle timezone - use America/Sao_Paulo)
    const datetime = new Date(`${booking.date}T${booking.time}:00-03:00`);
    if (isNaN(datetime.getTime())) {
      console.error(`[Webhook] Invalid datetime: ${booking.date}T${booking.time}`);
      return { success: false, error: `Invalid datetime: ${booking.date}T${booking.time}` };
    }
    
    // Calculate end time based on service duration
    const endTime = new Date(datetime.getTime() + foundService.durationMinutes * 60000);
    
    // Check for conflicting appointments - ALSO catches duplicates from the same client
    const conflicts = await db.appointment.findMany({
      where: {
        accountId,
        professionalId: foundProfessional.id,
        status: { in: ['pending', 'confirmed', 'scheduled'] },
        datetime: { lt: endTime },
        endTime: { gt: datetime },
      }
    });
    
    if (conflicts.length > 0) {
      // Check if this is a duplicate from the SAME client (they said "perfeito" after already booking)
      const duplicateFromSameClient = conflicts.find(c => c.clientId === clientId);
      if (duplicateFromSameClient) {
        console.log(`[Webhook] Duplicate booking from same client - appointment already exists: ${duplicateFromSameClient.id}`);
        // Return the existing appointment instead of creating a new one
        const existingPixData = duplicateFromSameClient.pixQrCode ? { qrCode: duplicateFromSameClient.pixQrCode || undefined } : undefined;
        return { success: true, appointmentId: duplicateFromSameClient.id, pixData: existingPixData };
      }
      console.log(`[Webhook] Time slot conflict for ${booking.date} at ${booking.time}`);
      return { success: false, error: 'Time slot already booked' };
    }
    
    // Create the appointment
    const appointment = await db.appointment.create({
      data: {
        accountId,
        clientId,
        serviceId: foundService.id,
        professionalId: foundProfessional.id,
        datetime,
        endTime,
        status: booking.paymentMethod === 'pix' ? 'pending' : 'confirmed',
        notes: `Agendado via WhatsApp IA. Pagamento: ${booking.paymentMethod}`,
        price: foundService.price,
      },
      include: { Service: true, Professional: true }
    });
    
    console.log(`[Webhook] ✅ Appointment created: ${appointment.id} - ${foundService.name} with ${foundProfessional.name} at ${datetime.toISOString()}`);
    
    // Update client payment preference if detected
    if (booking.paymentMethod) {
      await db.client.update({
        where: { id: clientId },
        data: { paymentPreference: booking.paymentMethod }
      }).catch(() => {}); // Don't fail if update fails
    }
    
    // Update client total appointments count
    await db.client.update({
      where: { id: clientId },
      data: { totalAppointments: { increment: 1 } }
    }).catch(() => {});

    // Generate PIX payment if Mercado Pago is connected and payment method is pix
    let pixData: { qrCode?: string; qrCodeBase64?: string; ticketUrl?: string; deepLink?: string } | undefined;
    
    if (booking.paymentMethod === 'pix' && foundService.price > 0) {
      try {
        // Fetch client CPF and name for Mercado Pago PIX payment
        const clientInfo = await db.client.findUnique({
          where: { id: clientId },
          select: { cpf: true, name: true, email: true }
        });
        pixData = await generatePixPayment(
          accountId,
          appointment.id,
          foundService.price,
          foundService.name,
          clientInfo?.cpf || null,
          clientInfo?.name || null,
          clientInfo?.email || null
        );
      } catch (pixError) {
        console.error(`[Webhook] Failed to generate PIX payment: ${pixError instanceof Error ? pixError.message : pixError}`);
        // Don't fail the appointment creation - just log the error
      }
    }
    
    return { success: true, appointmentId: appointment.id, pixData };
  } catch (error) {
    console.error('[Webhook] Error creating appointment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate PIX payment for an appointment using Mercado Pago
 */
async function generatePixPayment(
  accountId: string,
  appointmentId: string,
  amount: number,
  description: string,
  clientCpf?: string | null,
  clientName?: string | null,
  clientEmail?: string | null
): Promise<{ qrCode?: string; qrCodeBase64?: string; ticketUrl?: string; deepLink?: string } | undefined> {
  try {
    // Check if Mercado Pago is connected for this account
    const integration = await db.integration.findUnique({
      where: { accountId_type: { accountId, type: 'mercadopago' } }
    });

    if (!integration || integration.status !== 'connected') {
      console.log(`[Webhook] Mercado Pago not connected for account ${accountId}, skipping PIX generation`);
      return undefined;
    }

    let credentials = decryptCredentials(integration.credentials);
    let accessToken = credentials.accessToken as string;
    const expiresAt = credentials.expiresAt ? new Date(credentials.expiresAt as string) : null;
    
    // Check if token is expired or about to expire (5 min buffer)
    if (expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      console.log(`[Webhook] Mercado Pago token expired/expiring, attempting refresh...`);
      const refreshed = await refreshMercadoPagoToken(accountId, credentials.refreshToken as string);
      if (!refreshed) {
        console.log(`[Webhook] Token refresh failed, skipping PIX generation`);
        return undefined;
      }
      // Re-read the updated credentials after refresh
      const updatedIntegration = await db.integration.findUnique({
        where: { accountId_type: { accountId, type: 'mercadopago' } }
      });
      if (updatedIntegration) {
        credentials = decryptCredentials(updatedIntegration.credentials);
        accessToken = credentials.accessToken as string;
      }
    }

    const expirationDate = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour
    const idempotencyKey = `agendazap_${appointmentId}_${Date.now()}`;

    // Build payer object with CPF if available
    const payer: Record<string, unknown> = {
      email: clientEmail || 'cliente@agendazap.com',
    };

    if (clientName) {
      payer.first_name = clientName.split(' ')[0] || 'Cliente';
      payer.last_name = clientName.split(' ').slice(1).join(' ') || '';
    }

    // Add CPF to payer if available (important for PIX payment generation)
    if (clientCpf) {
      const cleanCpf = clientCpf.replace(/\D/g, '');
      if (cleanCpf.length === 11) {
        payer.identification = {
          type: 'CPF',
          number: cleanCpf
        };
        console.log(`[Webhook] Including CPF in PIX payment for ${clientName || 'client'}`);
      }
    }

    // Create PIX payment via Mercado Pago API
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `Agendamento: ${description}`,
        payment_method_id: 'pix',
        external_reference: `appointment_${appointmentId}`,
        date_of_expiration: expirationDate,
        payer,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Webhook] Mercado Pago API error: ${response.status} - ${error.substring(0, 300)}`);
      return undefined;
    }

    const data = await response.json();
    const pixQrCode = data.point_of_interaction?.transaction_data?.qr_code || null;
    const pixDeepLink = data.point_of_interaction?.transaction_data?.bank_info?.deep_link || null;
    const pixQrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64 || null;
    const pixTicketUrl = data.point_of_interaction?.transaction_data?.ticket_url || null;
    
    // Update appointment with all PIX data including payment ID
    await db.appointment.update({
      where: { id: appointmentId },
      data: {
        pixId: String(data.id),
        pixQrCode,
        pixDeepLink,
        pixExpiresAt: new Date(expirationDate),
        status: 'pending',
      }
    });

    console.log(`[Webhook] ✅ PIX payment created: MP ID ${data.id} for appointment ${appointmentId}`);
    
    return {
      qrCode: pixQrCode,
      qrCodeBase64: pixQrCodeBase64,
      ticketUrl: pixTicketUrl,
      deepLink: pixDeepLink,
    };
  } catch (error) {
    console.error('[Webhook] Error generating PIX payment:', error);
    return undefined;
  }
}

/**
 * Refresh Mercado Pago access token using refresh token
 */
async function refreshMercadoPagoToken(accountId: string, refreshToken: string): Promise<boolean> {
  try {
    let clientId = process.env.MP_CLIENT_ID || '';
    let clientSecret = process.env.MP_CLIENT_SECRET || '';
    
    // If not in env vars, try SystemConfiguration in database
    if (!clientId || !clientSecret) {
      try {
        const config = await db.systemConfiguration.findFirst();
        if (config) {
          clientId = clientId || config.mpClientId || '';
          clientSecret = clientSecret || config.mpClientSecret || '';
        }
      } catch (err) {
        console.error('[Webhook] Error reading MP config from DB:', err);
      }
    }
    
    if (!clientId || !clientSecret) {
      console.log('[Webhook] MP_CLIENT_ID or MP_CLIENT_SECRET not configured (env or DB), cannot refresh token');
      return false;
    }

    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Webhook] Token refresh failed: ${response.status} - ${error}`);
      return false;
    }

    const tokens = await response.json();
    const { access_token, refresh_token: newRefreshToken, expires_in } = tokens;
    const newExpiresAt = new Date(Date.now() + (expires_in || 21600) * 1000);

    // Update the integration with new tokens
    const { encryptCredentials } = await import('@/app/api/integrations/route');
    const encryptedCredentials = encryptCredentials({
      accessToken: access_token,
      refreshToken: newRefreshToken || refreshToken,
      expiresAt: newExpiresAt.toISOString(),
    });

    await db.integration.update({
      where: { accountId_type: { accountId, type: 'mercadopago' } },
      data: {
        credentials: encryptedCredentials,
        lastSync: new Date(),
      },
    });

    console.log(`[Webhook] ✅ Mercado Pago token refreshed for account ${accountId}`);
    return true;
  } catch (error) {
    console.error('[Webhook] Error refreshing Mercado Pago token:', error);
    return false;
  }
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
      if (resolved && isValidPhoneNumber(resolved)) {
        phoneForSending = resolved;
        phoneForContext = resolved;
        console.log(`[Webhook] LID resolved before sending: ${phone} → ${resolved}`);
      } else {
        // Also try DB-based lookup: search for recent incoming messages from this LID
        // that have been associated with a real phone number in previous conversations
        try {
          const lidValue = phone.replace('lid:', '');
          const recentMessages = await db.whatsappMessage.findMany({
            where: {
              accountId,
              direction: 'incoming',
              createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
            },
            select: { clientPhone: true, metadata: true },
            take: 50,
            orderBy: { createdAt: 'desc' },
          });
          
          // Look for messages where the metadata contains the original LID
          for (const msg of recentMessages) {
            const meta = msg.metadata as Record<string, unknown> | null;
            if (meta?.originalLid === lidValue || meta?.lidIdentifier === phone) {
              // Found a previous message from this LID that was stored with a real phone
              if (msg.clientPhone && !isLidIdentifier(msg.clientPhone) && isValidPhoneNumber(msg.clientPhone.replace(/\D/g, ''))) {
                phoneForSending = msg.clientPhone;
                phoneForContext = msg.clientPhone;
                setCachedLidPhone(phone, msg.clientPhone);
                console.log(`[Webhook] LID resolved via DB metadata lookup: ${phone} → ${msg.clientPhone}`);
                break;
              }
            }
          }
        } catch (dbErr) {
          console.log(`[Webhook] DB-based LID lookup failed:`, dbErr);
        }
        
        if (isLidIdentifier(phoneForSending)) {
          console.warn(`[Webhook] ⚠️ Cannot fully resolve LID ${phone} - will attempt JID-based sending`);
        }
      }
    }

    // Generate AI response with full context
    console.log(`[Webhook] 🤖 Generating AI response for phone: ${phoneForContext}...`);
    const rawResponse = await generateAIResponse(accountId, phoneForContext, message);

    if (rawResponse) {
      // Parse booking command from AI response
      const { cleanedResponse, booking } = parseBookingCommand(rawResponse);
      
      // Create appointment if booking command was found
      let appointmentId: string | undefined;
      let pixInfo: { qrCode?: string; ticketUrl?: string; deepLink?: string } | undefined;
      if (booking) {
        console.log(`[Webhook] 📅 Booking command detected: ${booking.serviceName} with ${booking.professionalName} on ${booking.date} at ${booking.time}`);
        const bookingResult = await createAppointmentFromBooking(accountId, clientId, booking);
        if (bookingResult.success) {
          appointmentId = bookingResult.appointmentId;
          pixInfo = bookingResult.pixData;
          console.log(`[Webhook] ✅ Appointment created successfully: ${appointmentId}${pixInfo ? ' with PIX payment' : ''}`);
        } else {
          console.error(`[Webhook] ❌ Failed to create appointment: ${bookingResult.error}`);
          // Append error info to the response so Luna can inform the client
          // Don't mention the [AGENDAR:] system, just the practical issue
        }
      }
      
      // Build the response - PIX info is now sent as separate messages via sendPixPaymentMessage
      // so we keep the AI response clean and focused on the appointment confirmation
      let response = cleanedResponse;
      const hasPixData = !!(pixInfo?.qrCode || pixInfo?.ticketUrl);
      const aiTime = Date.now() - processStart;
      console.log(`[Webhook] 🤖 AI response generated in ${aiTime}ms: "${response.substring(0, 80)}..."`);
      
      // RESPONSE-LEVEL DEDUP: Check if we already sent an IDENTICAL response to this phone recently.
      // This prevents duplicate messages when Evolution API retries the webhook or sends duplicate events.
      // We check for same message content within the last 60 seconds (not just any outgoing message,
      // which could block legitimate rapid responses to different messages).
      const recentDuplicate = await db.whatsappMessage.findFirst({
        where: {
          accountId,
          clientPhone: phoneForContext,
          direction: 'outgoing',
          message: response.substring(0, 500), // Check by content prefix (truncated for DB comparison)
          createdAt: { gt: new Date(Date.now() - 60_000) }, // Last 60 seconds
        },
        orderBy: { createdAt: 'desc' },
      });
      
      if (recentDuplicate) {
        console.log(`[Webhook] ⚠️ Skipping duplicate outgoing message - identical response already sent to ${phoneForContext} at ${recentDuplicate.createdAt.toISOString()}`);
        return;
      }
      
      // ADDITIONAL DEDUP: Also check for ANY outgoing message to this phone in the last 10 seconds
      // This catches cases where the content differs slightly (e.g., different timestamps) but
      // the message is essentially a duplicate from a race condition
      const recentAnyOutgoing = await db.whatsappMessage.findFirst({
        where: {
          accountId,
          clientPhone: phoneForContext,
          direction: 'outgoing',
          createdAt: { gt: new Date(Date.now() - 10_000) }, // Last 10 seconds
        },
        orderBy: { createdAt: 'desc' },
      });
      
      if (recentAnyOutgoing) {
        console.log(`[Webhook] ⚠️ Skipping outgoing message - another message was just sent to ${phoneForContext} at ${recentAnyOutgoing.createdAt.toISOString()}`);
        return;
      }
      
      const savedMessage = await db.whatsappMessage.create({
        data: {
          accountId,
          clientPhone: phoneForContext,
          direction: 'outgoing',
          message: response,
          messageType: 'text',
          status: 'pending',
          appointmentId: appointmentId || undefined,
          metadata: { 
            autoReply: true,
            originalIdentifier: isLidIdentifier(phone) ? phone : undefined,
            processingTimeMs: aiTime,
            bookingCreated: !!appointmentId,
            appointmentId: appointmentId || undefined,
          }
        }
      });

      // Send the message via the best available method
      let finalSendResult: { success: boolean; error?: string } = { success: false, error: 'No sending method available' };
      let sentViaMethod = 'none';
      
      if (!isLidIdentifier(phoneForSending) && isValidPhoneNumber(phoneForSending.replace(/\D/g, ''))) {
        // We have a valid real phone number
        if (hasPixData && pixInfo) {
          // PIX payment available - use the multi-step PIX message sender
          console.log(`[Webhook] 📤 Sending PIX payment messages to ${phoneForSending}...`);
          finalSendResult = await sendPixPaymentMessage(accountId, phoneForSending, response, pixInfo);
          sentViaMethod = finalSendResult.success ? 'pix-interactive' : 'pix-failed';
        } else {
          // Regular text message
          console.log(`[Webhook] 📤 Sending WhatsApp message to ${phoneForSending}...`);
          finalSendResult = await sendWhatsAppMessage(accountId, phoneForSending, response);
        }
        
        if (finalSendResult.success) {
          if (sentViaMethod === 'none') sentViaMethod = 'phone';
          console.log(`[Webhook] ✅ Message sent successfully to phone ${phoneForSending}`);
        } else {
          console.error(`[Webhook] ❌ Failed to send to phone ${phoneForSending}: ${finalSendResult.error}`);
          
          // Try sending to @s.whatsapp.net JID as second attempt
          if (instanceName) {
            const phoneDigits = phoneForSending.replace(/\D/g, '');
            const swhatsappJid = `${phoneDigits}@s.whatsapp.net`;
            console.log(`[Webhook] 📤 Retrying: Sending to ${swhatsappJid}...`);
            const jidResult = await sendWhatsAppMessageToJid(instanceName, swhatsappJid, response);
            if (jidResult.success) {
              finalSendResult = jidResult;
              sentViaMethod = 's.whatsapp.net';
              console.log(`[Webhook] ✅ Message sent successfully to ${swhatsappJid}`);
            } else {
              console.error(`[Webhook] ❌ Failed to send to ${swhatsappJid}: ${jidResult.error}`);
              
              // Try the original JID as last resort
              if (originalJid) {
                console.log(`[Webhook] 📤 Last resort: Sending to original JID ${originalJid}...`);
                const origJidResult = await sendWhatsAppMessageToJid(instanceName, originalJid, response);
                if (origJidResult.success) {
                  finalSendResult = origJidResult;
                  sentViaMethod = 'original-jid';
                  console.log(`[Webhook] ✅ Message sent successfully to original JID ${originalJid}`);
                } else {
                  console.error(`[Webhook] ❌ Failed to send to original JID ${originalJid}: ${origJidResult.error}`);
                }
              }
            }
          }
        }
      } else if (originalJid && instanceName) {
        // Phone is still a LID or invalid - try multiple JID formats
        console.log(`[Webhook] 📤 LID/unresolved phone, attempting JID-based sending for ${originalJid}...`);
        
        // Try 1: If originalJid is @lid, try constructing @s.whatsapp.net from LID digits
        // (This rarely works but worth trying)
        if (originalJid.includes('@lid')) {
          const lidDigits = originalJid.split('@')[0];
          // Only try if the digits look like they could be a phone number
          if (isValidPhoneNumber(lidDigits)) {
            const swhatsappJid = `${lidDigits}@s.whatsapp.net`;
            console.log(`[Webhook] 📤 Trying @s.whatsapp.net format: ${swhatsappJid}...`);
            const swhatsappResult = await sendWhatsAppMessageToJid(instanceName, swhatsappJid, response);
            if (swhatsappResult.success) {
              finalSendResult = swhatsappResult;
              sentViaMethod = 'lid-to-s.whatsapp.net';
              console.log(`[Webhook] ✅ Message sent successfully to ${swhatsappJid}`);
            }
          }
        }
        
        // Try 2: Send directly to the original JID
        if (!finalSendResult.success) {
          console.log(`[Webhook] 📤 Sending directly to original JID ${originalJid}...`);
          const jidResult = await sendWhatsAppMessageToJid(instanceName, originalJid, response);
          if (jidResult.success) {
            finalSendResult = jidResult;
            sentViaMethod = 'original-jid';
            console.log(`[Webhook] ✅ Message sent successfully to JID ${originalJid}`);
          } else {
            console.error(`[Webhook] ❌ Failed to send to JID ${originalJid}: ${jidResult.error}`);
            finalSendResult = jidResult;
          }
        }
      } else {
        // No JID available and no valid phone - mark as failed
        console.warn(`[Webhook] ⚠️ AI response saved but NOT sent - could not resolve LID and no JID available: ${phone}`);
      }
      
      // Update message status in database
      await db.whatsappMessage.update({
        where: { id: savedMessage.id },
        data: { 
          status: finalSendResult.success ? 'sent' : 'failed',
          metadata: { 
            autoReply: true, 
            error: finalSendResult.success ? null : finalSendResult.error,
            sentViaMethod,
            originalIdentifier: isLidIdentifier(phone) ? phone : undefined,
            processingTimeMs: aiTime,
            bookingCreated: !!appointmentId,
            appointmentId: appointmentId || undefined,
          }
        }
      });
      
      // If sending was successful and we resolved the LID to a phone, cache this mapping
      if (finalSendResult.success && isLidIdentifier(phone) && !isLidIdentifier(phoneForSending)) {
        setCachedLidPhone(phone, phoneForSending);
        console.log(`[Webhook] 📝 Cached LID mapping: ${phone} → ${phoneForSending}`);
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
    // Reduced from 10 to 5 messages to avoid Groq rate limit (TPM exceeded with 10 messages)
    // We fetch 6 and use only the first 5 (excluding the current message which was just saved)
    const history = await getConversationHistory(accountId, phone, 6);
    console.log(`[Webhook] Conversation history: ${history.length} messages`);
    
    // The history includes the current incoming message (just saved to DB).
    // We exclude it from the context since we add it explicitly as the last user message.
    // Also filter out any messages with [AGENDAR:...] markers from previous AI responses
    // since those are internal commands, not user-visible text.
    const previousHistory = history
      .slice(0, -1) // Remove the current message (last in history)
      .filter(m => !m.content.includes('[AGENDAR:')) // Remove booking markers from context
      .slice(-4); // Keep only last 4 messages to stay within token limits

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...previousHistory,
      { role: 'user', content: message }
    ];

    console.log(`[Webhook] Sending ${messages.length} messages to AI (system prompt + ${previousHistory.length} history + 1 user message)`);
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
 * A legitimate Evolution API event has at least ONE of:
 * - An "event" field (any string - Evolution API has many event types)
 * - An "instance" field with a valid instance name
 * - A "data" field with message data (key, message, etc.)
 * 
 * We use a permissive check because:
 * 1. Evolution API may send events not in our known list
 * 2. Different Evolution API versions may use different event names
 * 3. The body structure is the strongest signal this is from Evolution API
 */
function isValidEvolutionApiEvent(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;
  
  // Method 1: Has event field (any string value)
  if (obj.event && typeof obj.event === 'string') {
    return true;
  }
  
  // Method 2: Has instance field + data field (Evolution API structure)
  if (obj.instance && typeof obj.instance === 'string' && obj.data && typeof obj.data === 'object') {
    return true;
  }
  
  // Method 3: Has data with key.remoteJid (WhatsApp message structure)
  const data = obj.data as Record<string, unknown> | undefined;
  if (data && typeof data === 'object') {
    const key = data.key as Record<string, unknown> | undefined;
    if (key && typeof key === 'object' && key.remoteJid && typeof key.remoteJid === 'string') {
      return true;
    }
    // Has message field (WhatsApp message content)
    if (data.message && typeof data.message === 'object') {
      return true;
    }
  }
  
  // Method 4: Has instance field alone (connection events, startup events, etc.)
  if (obj.instance && typeof obj.instance === 'string') {
    return true;
  }
  
  return false;
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
      // Not a valid Evolution API event and no auth header - but still process if it has ANY recognizable structure
      // This is important because Evolution API sometimes sends events with unexpected formats
      const bodyObj = body as Record<string, unknown>;
      const hasAnyStructure = (bodyObj.event) || (bodyObj.instance) || (bodyObj.data) || (bodyObj.status);
      
      if (hasAnyStructure) {
        console.warn('[Webhook] ⚠️ Header auth failed and body not recognized as standard Evolution API event, but has recognizable structure. Processing with caution.');
        console.warn('[Webhook] ⚠️ Body keys:', Object.keys(bodyObj).join(', '));
      } else {
        // Completely unrecognizable - reject
        console.warn('[Webhook] Unauthorized request - invalid webhook secret AND not a valid Evolution API event');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack?.substring(0, 500) : undefined;
    console.error('[Webhook] Error:', errorMessage);
    if (errorStack) console.error('[Webhook] Stack:', errorStack);
    // Include more details for debugging LID issues
    const errorDetails = {
      message: errorMessage,
      stack: errorStack,
      phone: (body as any)?.data?.key?.remoteJid || 'unknown',
    };
    return NextResponse.json({ error: 'Internal server error', details: errorDetails }, { status: 500 });
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
