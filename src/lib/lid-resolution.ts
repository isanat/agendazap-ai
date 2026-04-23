/**
 * Shared LID (Linked ID) Resolution Utilities
 * 
 * These functions handle resolving WhatsApp LID identifiers to real phone numbers
 * using the Evolution API. They are shared between the webhook route and the
 * resolve-lid API endpoint.
 */

import { db } from '@/lib/db';

// ============================================================================
// Evolution API Configuration
// ============================================================================

/**
 * Get Evolution API configuration from environment variables or database
 */
export async function getEvolutionApiConfig(): Promise<{ apiUrl: string; apiKey: string } | null> {
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

// ============================================================================
// Phone Number Validation
// ============================================================================

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
export function isValidPhoneNumber(phone: string): boolean {
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
 * Check if a phone value is a LID identifier (not a real phone number)
 */
export function isLidIdentifier(phone: string): boolean {
  return phone.startsWith('lid:');
}

/**
 * Check if a phone value is a JID-based identifier (not a real phone number)
 */
export function isJidIdentifier(phone: string): boolean {
  return phone.startsWith('jid:');
}

/**
 * Check if a phone value is any kind of non-real-phone identifier (LID or JID)
 */
export function isNonPhoneIdentifier(phone: string): boolean {
  return isLidIdentifier(phone) || isJidIdentifier(phone);
}

// ============================================================================
// LID Phone Cache
// ============================================================================

/**
 * Cache for LID → phone number mappings (in-memory, persists across requests)
 * Prevents repeated API calls for the same LID
 */
const lidPhoneCache = new Map<string, { phone: string; timestamp: number }>();
const LID_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached phone number for a LID identifier
 */
export function getCachedLidPhone(lidIdentifier: string): string | null {
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
export function setCachedLidPhone(lidIdentifier: string, phone: string): void {
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

// ============================================================================
// LidMapping Database Operations
// ============================================================================

/**
 * Save or update a LidMapping record in the database (LidMapping table).
 * This provides persistent storage for LID→phone mappings, replacing the
 * in-memory-only cache with durable storage that survives restarts.
 * 
 * If resolvedPhone is provided: sets status="resolved", resolvedAt, resolutionMethod
 * If not resolved: sets status="pending", increments attemptCount, updates lastAttemptAt
 */
export async function saveLidMapping(
  lidValue: string,
  lidJid: string,
  instanceName: string,
  resolvedPhone?: string,
  method?: string
): Promise<void> {
  try {
    const now = new Date();
    
    if (resolvedPhone) {
      // LID was resolved to a real phone number
      await db.lidMapping.upsert({
        where: { lid: lidValue },
        create: {
          lid: lidValue,
          lidJid,
          instanceName,
          resolvedPhone,
          resolutionMethod: method || 'unknown',
          resolvedAt: now,
          lastAttemptAt: now,
          attemptCount: 1,
          status: 'resolved',
        },
        update: {
          lidJid,
          instanceName,
          resolvedPhone,
          resolutionMethod: method || 'unknown',
          resolvedAt: now,
          lastAttemptAt: now,
          status: 'resolved',
        },
      });
      console.log(`[LID-Resolution] LidMapping saved: ${lidValue} → ${resolvedPhone} (method: ${method || 'unknown'}, status: resolved)`);
    } else {
      // LID could not be resolved - create/update as pending
      await db.lidMapping.upsert({
        where: { lid: lidValue },
        create: {
          lid: lidValue,
          lidJid,
          instanceName,
          lastAttemptAt: now,
          attemptCount: 1,
          status: 'pending',
        },
        update: {
          lidJid,
          instanceName,
          lastAttemptAt: now,
          attemptCount: { increment: 1 },
          // Don't overwrite status if it was already resolved by another process
          ...(method ? { resolutionMethod: method } : {}),
        },
      });
      console.log(`[LID-Resolution] LidMapping saved: ${lidValue} (unresolved, status: pending, attemptCount incremented)`);
    }
  } catch (error) {
    console.error(`[LID-Resolution] Failed to save LidMapping for ${lidValue}:`, error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Update a LidMapping record after a resolution attempt
 * Sets the status, resolvedPhone, and increments attemptCount.
 * Returns the new status.
 */
export async function updateLidMappingAttempt(params: {
  lidValue: string;
  resolvedPhone?: string | null;
  resolutionMethod?: string | null;
  instanceName?: string;
  failed?: boolean;
  maxAttempts?: number;
}): Promise<'resolved' | 'failed' | 'pending'> {
  const { lidValue, resolvedPhone, resolutionMethod, instanceName, failed, maxAttempts = 5 } = params;
  
  const now = new Date();
  
  // Find existing mapping to check attempt count
  const existing = await db.lidMapping.findUnique({
    where: { lid: lidValue },
  });
  
  const currentAttempts = (existing?.attemptCount || 0) + 1;
  
  let newStatus: 'resolved' | 'failed' | 'pending';
  
  if (resolvedPhone && isValidPhoneNumber(resolvedPhone)) {
    newStatus = 'resolved';
  } else if (failed || currentAttempts >= maxAttempts) {
    newStatus = 'failed';
  } else {
    newStatus = 'pending';
  }
  
  const updateData: Record<string, unknown> = {
    lastAttemptAt: now,
    attemptCount: currentAttempts,
    status: newStatus,
  };
  
  if (instanceName) updateData.instanceName = instanceName;
  if (resolutionMethod) updateData.resolutionMethod = resolutionMethod;
  
  if (newStatus === 'resolved' && resolvedPhone) {
    updateData.resolvedPhone = resolvedPhone;
    updateData.resolvedAt = now;
  }
  
  try {
    await db.lidMapping.upsert({
      where: { lid: lidValue },
      update: updateData,
      create: {
        lid: lidValue,
        lidJid: `${lidValue}@lid`,
        instanceName: instanceName || null,
        resolvedPhone: newStatus === 'resolved' ? resolvedPhone : null,
        resolutionMethod: resolutionMethod || null,
        resolvedAt: newStatus === 'resolved' ? now : null,
        lastAttemptAt: now,
        attemptCount: currentAttempts,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error('[LID-Resolution] Error updating LidMapping attempt:', error);
  }
  
  return newStatus;
}

// ============================================================================
// LID Resolution via Evolution API
// ============================================================================

/**
 * Resolve a LID identifier to an actual phone number using Evolution API
 * Uses multiple methods to resolve the contact's real phone number.
 * 
 * IMPORTANT: Returns ONLY validated phone numbers that pass isValidPhoneNumber().
 * LID-derived digit strings (e.g., 147102780940432) are NOT returned.
 * 
 * Also saves LidMapping records to the database for persistence and future retries.
 */
export async function resolveLidToPhone(
  instanceName: string,
  lidIdentifier: string
): Promise<string | null> {
  try {
    // Check in-memory cache first
    const cached = getCachedLidPhone(lidIdentifier);
    if (cached) {
      console.log(`[LID-Resolution] LID resolved from cache: ${lidIdentifier} → ${cached}`);
      return cached;
    }

    const systemConfig = await getEvolutionApiConfig();
    if (!systemConfig) {
      console.log('[LID-Resolution] Cannot resolve LID: Evolution API not configured');
      return null;
    }

    const lidValue = lidIdentifier.replace('lid:', '');
    const lidJid = `${lidValue}@lid`;

    console.log(`[LID-Resolution] Attempting to resolve LID: ${lidJid}`);

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
            console.log(`[LID-Resolution] LID resolved via fetchPhoneNumber to: ${candidate}`);
            setCachedLidPhone(lidIdentifier, candidate);
            await saveLidMapping(lidValue, lidJid, instanceName, candidate, 'fetchPhoneNumber');
            return candidate;
          }
        }
        
        // Log what we got for debugging
        console.log(`[LID-Resolution] fetchPhoneNumber returned data but no valid phone: ${JSON.stringify(data).substring(0, 200)}`);
      }
    } catch (err) {
      console.log('[LID-Resolution] fetchPhoneNumber endpoint failed, trying alternative:', err);
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
            console.log(`[LID-Resolution] LID resolved via getBaseProfile to: ${candidate}`);
            setCachedLidPhone(lidIdentifier, candidate);
            await saveLidMapping(lidValue, lidJid, instanceName, candidate, 'getBaseProfile');
            return candidate;
          }
        }
        
        // If we got a @s.whatsapp.net JID, that's the real phone number
        const realJid = data?.id || data?.jid || '';
        if (realJid.includes('@s.whatsapp.net')) {
          const phoneFromJid = realJid.split('@')[0];
          if (isValidPhoneNumber(phoneFromJid)) {
            console.log(`[LID-Resolution] LID resolved via getBaseProfile JID to: ${phoneFromJid}`);
            setCachedLidPhone(lidIdentifier, phoneFromJid);
            await saveLidMapping(lidValue, lidJid, instanceName, phoneFromJid, 'getBaseProfile-jid');
            return phoneFromJid;
          }
        }
        
        console.log(`[LID-Resolution] getBaseProfile returned data but no valid phone: ${JSON.stringify(data).substring(0, 200)}`);
      }
    } catch (err) {
      console.log('[LID-Resolution] getBaseProfile endpoint failed:', err);
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
              console.log(`[LID-Resolution] LID resolved via findContacts (s.whatsapp.net) to: ${phoneFromJid}`);
              setCachedLidPhone(lidIdentifier, phoneFromJid);
              await saveLidMapping(lidValue, lidJid, instanceName, phoneFromJid, 'findContacts-s.whatsapp.net');
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
              console.log(`[LID-Resolution] LID resolved via findContacts (phone field) to: ${candidate}`);
              setCachedLidPhone(lidIdentifier, String(candidate));
              await saveLidMapping(lidValue, lidJid, instanceName, String(candidate), 'findContacts-phoneField');
              return String(candidate);
            }
          }
        }
      }
    } catch (err) {
      console.log('[LID-Resolution] findContacts endpoint failed:', err);
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
            console.log(`[LID-Resolution] LID resolved via getContactProfile to: ${candidate}`);
            setCachedLidPhone(lidIdentifier, candidate);
            await saveLidMapping(lidValue, lidJid, instanceName, candidate, 'getContactProfile');
            return candidate;
          }
        }
        
        // Check if response has a realJid or lidToJid field
        const realJid = data?.realJid || data?.lidToJid || '';
        if (realJid.includes('@s.whatsapp.net')) {
          const phoneFromJid = realJid.split('@')[0];
          if (isValidPhoneNumber(phoneFromJid)) {
            console.log(`[LID-Resolution] LID resolved via getContactProfile realJid to: ${phoneFromJid}`);
            setCachedLidPhone(lidIdentifier, phoneFromJid);
            await saveLidMapping(lidValue, lidJid, instanceName, phoneFromJid, 'getContactProfile-realJid');
            return phoneFromJid;
          }
        }
      }
    } catch (err) {
      console.log('[LID-Resolution] getContactProfile endpoint failed:', err);
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
              console.log(`[LID-Resolution] LID resolved via fetchContacts to: ${phoneFromJid}`);
              setCachedLidPhone(lidIdentifier, phoneFromJid);
              await saveLidMapping(lidValue, lidJid, instanceName, phoneFromJid, 'fetchContacts');
              return phoneFromJid;
            }
          }
        }
      }
    } catch (err) {
      console.log('[LID-Resolution] fetchContacts endpoint failed:', err);
    }

    console.log(`[LID-Resolution] Could not resolve LID ${lidJid} to a valid phone number`);
    // Save failed resolution attempt to LidMapping table for future retry
    await saveLidMapping(lidValue, lidJid, instanceName);
    return null;
  } catch (error) {
    console.error('[LID-Resolution] Error resolving LID:', error);
    return null;
  }
}

// ============================================================================
// Client Migration
// ============================================================================

/**
 * Migrate a Client record from LID-based phone to real phone number
 * Updates the client's phone field to the real phone number and sets whatsappLid.
 * 
 * If a client with the real phone number already exists in the same account,
 * merges by updating the LID client's records to point to the existing phone-based client.
 */
export async function migrateClientLidToPhone(
  clientId: string,
  lidValue: string,
  realPhone: string
): Promise<{ success: boolean; action: 'updated' | 'merged' | 'no_change'; message: string }> {
  try {
    const client = await db.client.findUnique({
      where: { id: clientId },
    });
    
    if (!client) {
      return { success: false, action: 'no_change', message: 'Client not found' };
    }
    
    // Format phone - ensure it has country code
    let formattedPhone = realPhone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10 && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }
    
    // Check if there's already a client with the real phone in the same account
    const existingClient = await db.client.findFirst({
      where: {
        accountId: client.accountId,
        phone: formattedPhone,
        id: { not: clientId },
      },
    });
    
    if (existingClient) {
      // Merge: Update the LID client's records to point to the existing phone-based client
      // Update appointments
      await db.appointment.updateMany({
        where: { clientId },
        data: { clientId: existingClient.id },
      });
      
      // Update client packages
      await db.clientPackage.updateMany({
        where: { clientId },
        data: { clientId: existingClient.id },
      });
      
      // Update loyalty transactions
      await db.loyaltyTransaction.updateMany({
        where: { clientId },
        data: { clientId: existingClient.id },
      });
      
      // Update WhatsApp messages (by clientPhone)
      await db.whatsappMessage.updateMany({
        where: {
          accountId: client.accountId,
          clientPhone: { in: [client.phone, `lid:${lidValue}`, `jid:${lidValue}`] },
        },
        data: { clientPhone: formattedPhone },
      });
      
      // Add points from LID client to existing client
      if (client.loyaltyPoints > 0) {
        await db.client.update({
          where: { id: existingClient.id },
          data: { loyaltyPoints: { increment: client.loyaltyPoints } },
        });
      }
      
      // Update the whatsappLid on the existing client
      await db.client.update({
        where: { id: existingClient.id },
        data: { whatsappLid: lidValue },
      });
      
      // Delete the LID client (records have been migrated)
      await db.client.delete({
        where: { id: clientId },
      });
      
      return {
        success: true,
        action: 'merged',
        message: `Merged LID client "${client.name}" into existing client "${existingClient.name}" (${formattedPhone})`,
      };
    }
    
    // Simple update: change the LID phone to the real phone
    // First check if the current phone is a LID-based identifier
    const isLidPhone = isLidIdentifier(client.phone) || isJidIdentifier(client.phone);
    
    if (!isLidPhone) {
      // Client already has a real phone - just set the whatsappLid
      await db.client.update({
        where: { id: clientId },
        data: { whatsappLid: lidValue },
      });
      
      return {
        success: true,
        action: 'no_change',
        message: `Client "${client.name}" already has a real phone (${client.phone}). Set whatsappLid only.`,
      };
    }
    
    // Update the client's phone from LID to real phone
    await db.client.update({
      where: { id: clientId },
      data: {
        phone: formattedPhone,
        whatsappLid: lidValue,
      },
    });
    
    // Also update WhatsApp messages that used the LID-based phone
    await db.whatsappMessage.updateMany({
      where: {
        accountId: client.accountId,
        clientPhone: { in: [client.phone, `lid:${lidValue}`, `jid:${lidValue}`] },
      },
      data: { clientPhone: formattedPhone },
    });
    
    return {
      success: true,
      action: 'updated',
      message: `Updated client "${client.name}" phone from ${client.phone} to ${formattedPhone}`,
    };
  } catch (error) {
    console.error('[LID-Resolution] Error migrating client LID to phone:', error);
    return {
      success: false,
      action: 'no_change',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================================
// Account/Instance Helpers
// ============================================================================

/**
 * Find account ID by Evolution API instance name
 */
export async function findAccountByInstance(instanceName: string): Promise<string | null> {
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

/**
 * Get the Evolution API instance name for a given account
 */
export async function getInstanceForAccount(accountId: string): Promise<string | null> {
  const integration = await db.integration.findUnique({
    where: { accountId_type: { accountId, type: 'whatsapp' } }
  });

  if (!integration) return null;

  const credentials = typeof integration.credentials === 'string'
    ? JSON.parse(integration.credentials)
    : integration.credentials;

  return credentials.instanceName || null;
}
