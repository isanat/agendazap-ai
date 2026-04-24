/**
 * AI Context Service - Serviço Completo de Contexto para IA
 * 
 * Busca todas as informações necessárias para a IA atender
 * como uma verdadeira recepcionista do salão.
 * 
 * Features:
 * - Auto-detect and store client name
 * - Track phone number automatically
 * - Store service history with details
 * - Track appointments and cancellations
 * - Suggest payment preference
 * - Proactive and intelligent AI
 * - Pattern detection for scheduling
 */

import { db } from '@/lib/db';
import { getSalonTimezone, getNowInSalonTz } from '@/lib/booking-validation';

// === TIPOS ===

export interface SalonContext {
  businessName: string;
  businessType: string;
  address: string | null;
  city: string | null;
  state: string | null;
  googleMapsUrl: string | null;
  openingTime: string;
  closingTime: string;
  workingDays: number[];
  whatsappNumber: string;
  services: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    durationMinutes: number;
    category: string | null;
  }[];
  professionals: {
    id: string;
    name: string;
    specialties: string[];
    workingDays: number[];
    openingTime: string | null;
    closingTime: string | null;
    isActive: boolean;
  }[];
  packages: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    originalPrice: number;
    services: string[];
  }[];
}

export interface ClientContext {
  id: string;
  name: string;
  phone: string;
  whatsappLid: string | null;
  email: string | null;
  cpf: string | null;
  birthDate: Date | null;
  totalAppointments: number;
  lastVisit: Date | null;
  loyaltyPoints: number;
  notes: string | null;
  paymentPreference: string | null;
  whatsappPushName: string | null;
  aiNotes: string | null;
  lastAiInteraction: Date | null;
  isNewClient: boolean;
  lastServices: {
    serviceName: string;
    professionalName: string | null;
    date: Date;
    status: string;
    cancellationReason: string | null;
  }[];
  upcomingAppointments: {
    id: string;
    serviceName: string;
    professionalName: string | null;
    date: Date;
    status: string;
  }[];
  cancelledAppointments: {
    serviceName: string;
    professionalName: string | null;
    date: Date;
    cancellationReason: string | null;
    cancelledAt: Date | null;
  }[];
  preferredServices: string[];
  preferredProfessional: string | null;
  serviceFrequency: {
    serviceName: string;
    avgDaysBetweenVisits: number;
    lastServiceDate: Date | null;
    suggestedReturnDate: string | null;
  }[];
  daysSinceLastVisit: number | null;
}

// === CLIENT MANAGEMENT ===

/**
 * Check if a phone value is a LID/JID identifier (not a real phone number)
 * LID identifiers start with "lid:" and JID identifiers start with "jid:"
 */
export function isLidPhone(phone: string): boolean {
  return phone.startsWith('lid:') || phone.startsWith('jid:');
}

/**
 * Extract the raw LID/JID value by stripping the prefix
 * e.g. "lid:249541928419454" -> "249541928419454"
 */
function extractRawLid(phone: string): string | null {
  if (phone.startsWith('lid:')) return phone.slice(4);
  if (phone.startsWith('jid:')) return phone.slice(4);
  return null;
}

/**
 * Find or create a client by phone number
 * Auto-creates client with WhatsApp push name if available
 * Handles LID/JID identifiers and stores them in whatsappLid field
 */
export async function findOrCreateClient(
  accountId: string,
  phone: string,
  pushName?: string
): Promise<string> {
  const normalizedPhone = phone.replace(/\D/g, '');
  
  // For LID/JID identifiers, search by exact match since there's no phone number to fuzzy match
  const isLid = phone.startsWith('lid:');
  const isJid = phone.startsWith('jid:');
  const isNonPhone = isLid || isJid;
  const searchContains = isNonPhone ? phone : normalizedPhone.slice(-9);
  const rawLid = extractRawLid(phone);
  
  // Try to find existing client first - search by phone OR by whatsappLid
  let existingClient = await db.client.findFirst({
    where: {
      accountId,
      phone: { contains: searchContains }
    }
  });

  // If not found by phone, try to find by whatsappLid (for when client was created with LID and later resolved)
  if (!existingClient && rawLid) {
    existingClient = await db.client.findFirst({
      where: {
        accountId,
        whatsappLid: rawLid
      }
    });
  }

  if (existingClient) {
    const updateData: Record<string, any> = {};
    
    // Update push name if provided and not already set
    if (pushName && !existingClient.whatsappPushName) {
      updateData.whatsappPushName = pushName;
    }
    
    // If existing client has a LID/JID phone and we now have a real phone number, update it
    if (isLidPhone(existingClient.phone) && !isNonPhone && normalizedPhone) {
      // Store the old LID value in whatsappLid before overwriting phone
      const oldRawLid = extractRawLid(existingClient.phone);
      if (oldRawLid && !existingClient.whatsappLid) {
        updateData.whatsappLid = oldRawLid;
      }
      updateData.phone = normalizedPhone;
      console.log(`[AI Context] Client phone updated from identifier to real number: ${normalizedPhone}, whatsappLid set to: ${oldRawLid}`);
    }
    
    // If existing client has a real phone and we receive a LID, store the LID in whatsappLid
    if (!isLidPhone(existingClient.phone) && isNonPhone && rawLid && !existingClient.whatsappLid) {
      updateData.whatsappLid = rawLid;
      console.log(`[AI Context] Client whatsappLid updated: ${rawLid}`);
    }
    
    // Apply updates if any
    if (Object.keys(updateData).length > 0) {
      await db.client.update({
        where: { id: existingClient.id },
        data: updateData
      });
    }
    
    return existingClient.id;
  }

  // Create new client - wrap in try/catch for race condition
  // For LID/JID identifiers, use the identifier as phone (will be updated when real phone is resolved)
  const phoneForDb = isNonPhone ? phone : normalizedPhone;
  const displayName = pushName || (isNonPhone ? `Cliente WhatsApp` : `Cliente ${normalizedPhone.slice(-4)}`);
  
  try {
    const newClient = await db.client.create({
      data: {
        accountId,
        name: displayName,
        phone: phoneForDb,
        whatsappLid: rawLid || null,
        whatsappPushName: pushName || null,
        notes: pushName 
          ? `Nome do perfil WhatsApp: ${pushName}${isNonPhone ? ' (telefone ainda não identificado)' : ''}` 
          : isNonPhone 
            ? 'Cliente com identificador - telefone será identificado automaticamente' 
            : 'Cliente novo - aguardando nome',
        lastAiInteraction: new Date(),
      }
    });
    console.log(`[AI Context] New client created: ${newClient.id} (${displayName}) for account ${accountId}${isNonPhone ? ' [non-phone session]' : ''}${rawLid ? ` whatsappLid=${rawLid}` : ''}`);
    return newClient.id;
  } catch (error: any) {
    // Handle race condition: unique constraint violation (P2002)
    if (error?.code === 'P2002') {
      // Another request created the client concurrently - find it
      // Try to find by phone first, then by whatsappLid
      let concurrentClient = await db.client.findFirst({
        where: {
          accountId,
          phone: { contains: searchContains }
        }
      });
      if (!concurrentClient && rawLid) {
        concurrentClient = await db.client.findFirst({
          where: {
            accountId,
            whatsappLid: rawLid
          }
        });
      }
      if (concurrentClient) {
        if (pushName && !concurrentClient.whatsappPushName) {
          await db.client.update({
            where: { id: concurrentClient.id },
            data: { whatsappPushName: pushName }
          });
        }
        return concurrentClient.id;
      }
    }
    throw error;
  }
}

/**
 * Update client name when they provide it
 */
export async function updateClientName(
  clientId: string,
  name: string
): Promise<void> {
  await db.client.update({
    where: { id: clientId },
    data: { name }
  });
  console.log(`[AI Context] Client name updated: ${clientId} -> ${name}`);
}

/**
 * Update client payment preference
 */
export async function updateClientPaymentPreference(
  clientId: string,
  preference: string
): Promise<void> {
  await db.client.update({
    where: { id: clientId },
    data: { paymentPreference: preference }
  });
  console.log(`[AI Context] Client payment preference updated: ${clientId} -> ${preference}`);
}

/**
 * Update client AI notes (observations from AI interactions)
 */
export async function updateClientAiNotes(
  clientId: string,
  notes: string
): Promise<void> {
  await db.client.update({
    where: { id: clientId },
    data: { aiNotes: notes }
  });
}

/**
 * Update service history when appointment is completed
 */
export async function updateServiceHistory(
  clientId: string,
  serviceName: string,
  professionalName: string | null,
  date: Date,
  status: string
): Promise<void> {
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { serviceHistory: true }
  });

  if (!client) return;

  const history = Array.isArray(client.serviceHistory) ? client.serviceHistory as any[] : [];
  
  history.push({
    serviceName,
    professionalName,
    date: date.toISOString(),
    status
  });

  // Keep only last 50 entries
  const trimmedHistory = history.slice(-50);

  await db.client.update({
    where: { id: clientId },
    data: { serviceHistory: trimmedHistory }
  });
}

/**
 * Detect if the user provided their name in a message
 * Returns the detected name or null
 */
export function detectNameInMessage(message: string): string | null {
  const lowerMessage = message.toLowerCase().trim();
  
  // Patterns like "Meu nome é João", "Eu sou a Maria", "Pode me chamar de Pedro"
  const namePatterns = [
    /(?:meu nome é|me chamo|me chame|pode me chamar de|eu sou [oa]|sou [oa])\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)\s*$/i,
    /(?:meu nome é|me chamo|me chame|pode me chamar de|eu sou [oa]|sou [oa])\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i,
    /^(?:eu sou|sou)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)\s*$/i,
  ];

  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Validate: must be at least 2 chars, mostly letters
      if (name.length >= 2 && /^[A-ZÀ-Úa-zà-ú\s]+$/.test(name)) {
        return name;
      }
    }
  }

  return null;
}

/**
 * Detect if the user provided their CPF in a message
 * Returns the cleaned CPF (digits only) or null
 * Accepts formats: XXX.XXX.XXX-XX, XXXXXXXXXXX, or just 11 digits
 */
export function detectCpfInMessage(message: string): string | null {
  // Remove common prefixes in Portuguese
  const cleaned = message.replace(/(?:meu cpf é|cpf:|cpf |meu cpf|o cpf é|cpf número|número do cpf:|cpf -|informo meu cpf:|informo o cpf:|meu cpf é o|o cpf é o)/i, '').trim();
  
  // Pattern 1: Formatted CPF with dots and dash (XXX.XXX.XXX-XX)
  const formattedMatch = cleaned.match(/\b(\d{3})[.](\d{3})[.](\d{3})-(\d{2})\b/);
  if (formattedMatch) {
    const cpf = formattedMatch[0].replace(/[^0-9]/g, '');
    if (isValidCpf(cpf)) return cpf;
  }
  
  // Pattern 2: 11 consecutive digits that could be a CPF
  const digitsOnly = cleaned.replace(/[^0-9]/g, '');
  if (digitsOnly.length === 11 && isValidCpf(digitsOnly)) {
    return digitsOnly;
  }
  
  // Pattern 3: CPF with spaces (XXX XXX XXX XX)
  const spacedMatch = cleaned.match(/\b(\d{3})\s+(\d{3})\s+(\d{3})\s+(\d{2})\b/);
  if (spacedMatch) {
    const cpf = spacedMatch[0].replace(/\s/g, '');
    if (isValidCpf(cpf)) return cpf;
  }
  
  return null;
}

/**
 * Basic CPF validation (check digit verification)
 */
function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  
  // Reject known invalid patterns (all same digits)
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

/**
 * Update client CPF
 */
export async function updateClientCpf(
  clientId: string,
  cpf: string
): Promise<void> {
  await db.client.update({
    where: { id: clientId },
    data: { cpf }
  });
  console.log(`[AI Context] Client CPF updated: ${clientId} -> ${cpf.substring(0, 3)}***`);
}

/**
 * Detect a birth date in a message (DD/MM or DD/MM/YYYY format)
 * Returns a Date object (with year 2000 if not provided) or null
 */
export function detectBirthDateInMessage(message: string): Date | null {
  const cleaned = message.replace(/(?:meu aniversário é|aniversário:|nasci em|data de nascimento:|nasci dia|aniversário dia|minha data|meu niver é|niver:|aniversario|aniversário é dia)\s*/i, '').trim();
  
  // Pattern 1: DD/MM/YYYY
  const fullDateMatch = cleaned.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1]);
    const month = parseInt(fullDateMatch[2]);
    const year = parseInt(fullDateMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2020) {
      return new Date(year, month - 1, day);
    }
  }
  
  // Pattern 2: DD/MM (day and month only)
  const dayMonthMatch = cleaned.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const month = parseInt(dayMonthMatch[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return new Date(2000, month - 1, day); // Use year 2000 as placeholder
    }
  }
  
  return null;
}

/**
 * Update client birth date
 */
export async function updateClientBirthDate(
  clientId: string,
  birthDate: Date
): Promise<void> {
  await db.client.update({
    where: { id: clientId },
    data: { birthDate }
  });
  console.log(`[AI Context] Client birth date updated: ${clientId} -> ${birthDate.toLocaleDateString('pt-BR')}`);
}

/**
 * Detect a phone number in a message (Brazilian format)
 * Returns the clean phone number digits if found, null otherwise.
 * 
 * Handles patterns like:
 * - "meu número é 554199991234"
 * - "telefone: 41 984195685"
 * - "11 999991234"
 * - "whatsapp 41984195685"
 * - "meu tel é (41) 98419-5685"
 */
export function detectPhoneNumberInMessage(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Check if the message contains phone-related keywords to avoid false positives
  const phoneKeywords = [
    'telefone', 'tel', 'número', 'numero', 'celular', 'whatsapp', 'zap',
    'fone', 'fone:', 'contato', 'contact', 'tel:', 'número:', 'numero:'
  ];
  const hasPhoneKeyword = phoneKeywords.some(kw => lowerMessage.includes(kw));
  
  // Also check for patterns that strongly indicate a phone number even without keywords
  // e.g., "554199991234" (12-13 digits starting with 55)
  
  // Pattern 1: With keyword prefix - extract number after keyword
  if (hasPhoneKeyword) {
    // Remove common prefixes to isolate the number part
    const cleaned = message.replace(
      /(?:meu telefone é|meu número é|meu numero é|meu tel é|meu whatsapp é|meu zap é|meu celular é|telefone:|tel:|número:|numero:|celular:|whatsapp:|zap:|fone:|contato:|meu telefone|meu número|meu numero|meu tel|meu whatsapp|meu zap|meu celular)\s*/i,
      ''
    ).trim();
    
    // Try to find a phone number pattern in the cleaned text
    // Pattern 1a: Full number with country code: 55XXXXXXXXXXX (12-13 digits)
    const fullMatch = cleaned.match(/\b(55\d{10,11})\b/);
    if (fullMatch && isValidPhoneNumberLocal(fullMatch[1])) {
      return fullMatch[1];
    }
    
    // Pattern 1b: Number with area code and possible separators: XX XXXXX-XXXX or XX 9XXXX-XXXX
    const areaCodeMatch = cleaned.match(/\b(\d{2})\s*(\d{4,5})[-\s]*(\d{4})\b/);
    if (areaCodeMatch) {
      const phone = areaCodeMatch[1] + areaCodeMatch[2] + areaCodeMatch[3];
      if (isValidPhoneNumberLocal(phone)) {
        return phone.startsWith('55') ? phone : '55' + phone;
      }
    }
    
    // Pattern 1c: Number with parentheses area code: (XX) XXXXX-XXXX
    const parenMatch = cleaned.match(/\((\d{2})\)\s*(\d{4,5})[-\s]*(\d{4})/);
    if (parenMatch) {
      const phone = parenMatch[1] + parenMatch[2] + parenMatch[3];
      if (isValidPhoneNumberLocal(phone)) {
        return phone.startsWith('55') ? phone : '55' + phone;
      }
    }
    
    // Pattern 1d: Just digits (10-11 digits for local BR number)
    const digitsOnly = cleaned.replace(/[^\d]/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 13 && isValidPhoneNumberLocal(digitsOnly)) {
      return digitsOnly.startsWith('55') ? digitsOnly : '55' + digitsOnly;
    }
  }
  
  // Pattern 2: Without keyword - look for strong phone number patterns
  // Full Brazilian number with country code: 55XXXXXXXXXXX (12-13 digits)
  const fullNumberMatch = message.match(/\b(55\d{10,11})\b/);
  if (fullNumberMatch && isValidPhoneNumberLocal(fullNumberMatch[1])) {
    return fullNumberMatch[1];
  }
  
  // Formatted number: (XX) XXXXX-XXXX or XX XXXXX-XXXX (strong visual pattern)
  const formattedMatch = message.match(/\(?\b(\d{2})\)?\s*(\d{4,5})[-\s](\d{4})\b/);
  if (formattedMatch) {
    const phone = formattedMatch[1] + formattedMatch[2] + formattedMatch[3];
    if (isValidPhoneNumberLocal(phone)) {
      return phone.startsWith('55') ? phone : '55' + phone;
    }
  }
  
  return null;
}

/**
 * Local phone number validation for detectPhoneNumberInMessage
 * Uses the shared isValidPhoneNumber from lid-resolution if available,
 * otherwise performs basic validation here.
 */
function isValidPhoneNumberLocal(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 10 || digits.length > 15) return false;
  
  // Brazilian number with country code
  if (digits.startsWith('55')) {
    const localPart = digits.slice(2);
    const areaCode = localPart.slice(0, 2);
    if (/^[1-9][0-9]$/.test(areaCode)) {
      const subscriberNumber = localPart.slice(2);
      if (subscriberNumber.length >= 8 && subscriberNumber.length <= 9) {
        return true;
      }
    }
    if (localPart.length >= 8 && localPart.length <= 11) return true;
  }
  
  // Local Brazilian format without country code
  if (digits.length >= 10 && digits.length <= 11) {
    const areaCode = digits.slice(0, 2);
    if (/^[1-9][0-9]$/.test(areaCode)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect payment preference in a message
 */
export function detectPaymentPreference(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('pix') || lowerMessage.includes('online') || lowerMessage.includes('cartão') || lowerMessage.includes('cartao') || lowerMessage.includes('débito') || lowerMessage.includes('debito') || lowerMessage.includes('crédito') || lowerMessage.includes('credito')) {
    if (lowerMessage.includes('pix')) return 'pix';
    if (lowerMessage.includes('cartão') || lowerMessage.includes('cartao')) return 'credit_card';
    if (lowerMessage.includes('crédito') || lowerMessage.includes('credito')) return 'credit_card';
    if (lowerMessage.includes('débito') || lowerMessage.includes('debito')) return 'debit_card';
    return 'online';
  }
  
  if (lowerMessage.includes('presencial') || lowerMessage.includes('dinheiro') || lowerMessage.includes('no dia') || lowerMessage.includes('na hora') || lowerMessage.includes('pessoalmente')) {
    if (lowerMessage.includes('dinheiro')) return 'cash';
    return 'in_person';
  }

  return null;
}

// === FUNÇÕES DE CONTEXTO ===

/**
 * Busca contexto completo do salão
 */
export async function getSalonContext(accountId: string): Promise<SalonContext> {
  const account = await db.account.findUnique({
    where: { id: accountId }
  });
  
  if (!account) {
    throw new Error('Account not found');
  }
  
  const services = await db.service.findMany({
    where: { accountId, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      durationMinutes: true,
      category: true
    }
  });
  
  const professionalsRaw = await db.professional.findMany({
    where: { accountId, isActive: true },
    include: {
      ServiceProfessional: {
        include: { Service: true }
      }
    }
  });
  
  const professionals = professionalsRaw.map((p: any) => ({
    id: p.id,
    name: p.name,
    specialties: p.ServiceProfessional?.map((sp: any) => sp.Service?.name).filter(Boolean) || [],
    workingDays: parseWorkingDays(p.workingDays),
    openingTime: p.openingTime,
    closingTime: p.closingTime,
    isActive: p.isActive
  }));
  
  const packagesRaw = await db.package.findMany({
    where: { accountId, isActive: true },
    include: {
      packageServices: {
        include: { Service: true }
      }
    }
  });
  
  const packages = packagesRaw.map((pkg: any) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    price: pkg.price,
    originalPrice: pkg.originalPrice || pkg.price,
    services: pkg.packageServices?.map((ps: any) => ps.Service?.name).filter(Boolean) || []
  }));
  
  return {
    businessName: account.businessName || 'Salão',
    businessType: account.businessType || 'salon',
    address: account.address,
    city: account.addressCity,
    state: account.addressState,
    googleMapsUrl: account.googleMapsUrl,
    openingTime: account.openingTime || '09:00',
    closingTime: account.closingTime || '18:00',
    workingDays: parseWorkingDays(account.workingDays),
    whatsappNumber: account.whatsappNumber || '',
    services: services as any[],
    professionals,
    packages
  };
}

/**
 * Busca contexto completo do cliente pelo telefone
 */
export async function getClientContext(
  clientPhone: string,
  accountId: string
): Promise<ClientContext | null> {
  const normalizedPhone = clientPhone.replace(/\D/g, '');
  const rawLid = extractRawLid(clientPhone);
  
  // Search by phone using multiple strategies to avoid format mismatch
  // The phone might be stored as "5541984195685" but searched as "41984195685"
  // or vice versa. We try multiple approaches.
  let client: any = null;
  
  if (isLidPhone(clientPhone)) {
    // For LID identifiers, search by exact match
    client = await db.client.findFirst({
      where: {
        accountId,
        phone: clientPhone
      }
    });
    // Also try by whatsappLid
    if (!client && rawLid) {
      client = await db.client.findFirst({
        where: {
          accountId,
          whatsappLid: rawLid
        }
      });
    }
  } else {
    // For real phone numbers, try multiple search strategies
    const searchStrategies = [
      // Strategy 1: Exact match
      { phone: normalizedPhone },
      // Strategy 2: Contains last 9 digits (most common)
      { phone: { contains: normalizedPhone.slice(-9) } },
      // Strategy 3: Without country code (if phone has 55 prefix)
      ...(normalizedPhone.startsWith('55') ? [{ phone: { contains: normalizedPhone.slice(2) } }] : []),
      // Strategy 4: With country code (if phone doesn't have 55)
      ...(normalizedPhone.length >= 10 && !normalizedPhone.startsWith('55') ? [{ phone: { contains: `55${normalizedPhone}` } }] : []),
      // Strategy 5: Last 8 digits (landline without 9th digit)
      { phone: { contains: normalizedPhone.slice(-8) } },
    ];
    
    for (const strategy of searchStrategies) {
      const found = await db.client.findFirst({
        where: {
          accountId,
          ...strategy
        }
      });
      if (found) {
        client = found;
        break;
      }
    }
    
    // If still not found, try by whatsappLid in case the client was created from a LID
    if (!client) {
      client = await db.client.findFirst({
        where: {
          accountId,
          whatsappLid: normalizedPhone
        }
      });
    }
  }
  
  if (!client) {
    return null;
  }
  
  // Last 10 completed/attended appointments
  const lastAppointments = await db.appointment.findMany({
    where: {
      clientId: client.id,
      datetime: { lte: new Date() }
    },
    orderBy: { datetime: 'desc' },
    take: 10,
    include: {
      Service: true,
      Professional: true
    }
  });
  
  const lastServices = lastAppointments.map((apt: any) => ({
    serviceName: apt.Service?.name || 'Serviço',
    professionalName: apt.Professional?.name || null,
    date: apt.datetime,
    status: apt.status,
    cancellationReason: apt.cancellationReason || null
  }));

  // Upcoming appointments
  const upcomingAppointments = await db.appointment.findMany({
    where: {
      clientId: client.id,
      datetime: { gte: new Date() },
      status: { in: ['scheduled', 'confirmed', 'pending'] }
    },
    orderBy: { datetime: 'asc' },
    take: 5,
    include: {
      Service: true,
      Professional: true
    }
  });
  
  const upcoming = upcomingAppointments.map((apt: any) => ({
    id: apt.id,
    serviceName: apt.Service?.name || 'Serviço',
    professionalName: apt.Professional?.name || null,
    date: apt.datetime,
    status: apt.status
  }));

  // Cancelled appointments (last 5)
  const cancelledAppointments = await db.appointment.findMany({
    where: {
      clientId: client.id,
      status: { in: ['cancelled', 'canceled'] }
    },
    orderBy: { cancelledAt: 'desc' },
    take: 5,
    include: {
      Service: true,
      Professional: true
    }
  });

  const cancelled = cancelledAppointments.map((apt: any) => ({
    serviceName: apt.Service?.name || 'Serviço',
    professionalName: apt.Professional?.name || null,
    date: apt.datetime,
    cancellationReason: apt.cancellationReason || null,
    cancelledAt: apt.cancelledAt || null
  }));
  
  // Detectar preferências e padrões
  const completedAppointments = lastAppointments.filter((apt: any) => 
    apt.status === 'completed' || apt.status === 'attended' || apt.status === 'confirmed'
  );

  const serviceCounts: Record<string, number> = {};
  const professionalCounts: Record<string, number> = {};
  
  completedAppointments.forEach((apt: any) => {
    if (apt.Service?.name) {
      serviceCounts[apt.Service.name] = (serviceCounts[apt.Service.name] || 0) + 1;
    }
    if (apt.Professional?.name) {
      professionalCounts[apt.Professional.name] = (professionalCounts[apt.Professional.name] || 0) + 1;
    }
  });
  
  const preferredServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
  
  const preferredProfessional = Object.entries(professionalCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Calculate service frequency patterns
  const serviceFrequency = calculateServiceFrequency(completedAppointments);

  // Calculate days since last visit
  const lastVisitDate = client.lastVisit || lastAppointments[0]?.datetime || null;
  const daysSinceLastVisit = lastVisitDate 
    ? Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  return {
    id: client.id,
    name: client.name || 'Cliente',
    phone: client.phone,
    whatsappLid: client.whatsappLid || null,
    email: client.email,
    cpf: client.cpf,
    birthDate: client.birthDate || null,
    totalAppointments: client.totalAppointments || completedAppointments.length,
    lastVisit: client.lastVisit || lastAppointments[0]?.datetime || null,
    loyaltyPoints: client.loyaltyPoints || 0,
    notes: client.notes,
    paymentPreference: client.paymentPreference || null,
    whatsappPushName: client.whatsappPushName || null,
    aiNotes: client.aiNotes || null,
    lastAiInteraction: client.lastAiInteraction || null,
    isNewClient: !client.lastVisit && completedAppointments.length === 0,
    lastServices,
    upcomingAppointments: upcoming,
    cancelledAppointments: cancelled,
    preferredServices,
    preferredProfessional,
    serviceFrequency,
    daysSinceLastVisit
  };
}

/**
 * Calculate service frequency patterns and suggest return dates
 */
function calculateServiceFrequency(appointments: any[]): ClientContext['serviceFrequency'] {
  const serviceDates: Record<string, Date[]> = {};
  
  appointments.forEach((apt: any) => {
    const name = apt.Service?.name;
    if (!name) return;
    if (!serviceDates[name]) serviceDates[name] = [];
    serviceDates[name].push(new Date(apt.datetime));
  });

  return Object.entries(serviceDates).map(([serviceName, dates]) => {
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
    const lastDate = sortedDates[sortedDates.length - 1] || null;
    
    let avgDaysBetweenVisits = 0;
    if (sortedDates.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = (sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24);
        intervals.push(diff);
      }
      avgDaysBetweenVisits = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    }

    // Suggest return date based on average interval
    let suggestedReturnDate: string | null = null;
    if (lastDate && avgDaysBetweenVisits > 0) {
      const suggested = new Date(lastDate.getTime() + avgDaysBetweenVisits * 24 * 60 * 60 * 1000);
      // Only suggest if it's in the future or within the past 3 days
      const daysSinceLast = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLast >= avgDaysBetweenVisits - 3) {
        suggestedReturnDate = formatDate(suggested > new Date() ? suggested : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
      }
    }

    return {
      serviceName,
      avgDaysBetweenVisits,
      lastServiceDate: lastDate,
      suggestedReturnDate
    };
  }).filter(sf => sf.avgDaysBetweenVisits > 0 || sf.suggestedReturnDate);
}

// === GERAÇÃO DE PROMPT (OTIMIZADO PARA ECONOMIA DE TOKENS) ===

/**
 * Gera o prompt do sistema com contexto — otimizado para ~800 tokens
 * (versão anterior consumia ~1800 tokens, redução de ~55%)
 */
export async function generateSystemPrompt(
  accountId: string,
  clientPhone: string
): Promise<string> {
  const salon = await getSalonContext(accountId);
  const client = await getClientContext(clientPhone, accountId);
  
  // Use salon's explicit timezone instead of server timezone (Fix #4)
  const salonTz = await getSalonTimezone(accountId);
  const salonNow = getNowInSalonTz(salonTz);
  const dayName = salonNow.dayName;
  const todayStr = salonNow.dateStr;
  
  const address = [salon.address, salon.city, salon.state].filter(Boolean).join(', ') || null;
  const open = salon.workingDays.includes(salonNow.dayOfWeek);
  
  // Compact service list: "Manicure R$50 (60min)" instead of bullet+description
  const svc = salon.services.map(s => `${s.name} R$${s.price.toFixed(0)} (${s.durationMinutes}min)`).join(' | ');
  
  // Compact professionals: "Ana: manicure, pedicure (9-18h)"
  const prof = salon.professionals.map(p => {
    const spec = p.specialties.length > 0 ? `: ${p.specialties.join(',')}` : '';
    const hr = p.openingTime && p.closingTime ? ` (${p.openingTime}-${p.closingTime})` : '';
    return `${p.name}${spec}${hr}`;
  }).join(' | ');
  
  // Compact packages: "Combo Beleza R$80 (manicure+pedicure) save R$20"
  const pkg = salon.packages.length > 0
    ? salon.packages.map(p => {
        const save = p.originalPrice > p.price ? ` save R$${(p.originalPrice - p.price).toFixed(0)}` : '';
        return `${p.name} R$${p.price.toFixed(0)} (${p.services.join('+')})${save}`;
      }).join(' | ')
    : '';
  
  // Build compact client context
  let ctx = '';
  if (client) {
    const phoneDisplay = isLidPhone(client.phone) ? '[pendente]' : '';
    const hasCpf = !!client.cpf;
    const hasBday = !!client.birthDate;
    const hasPayment = !!client.paymentPreference;
    const paymentLabel = hasPayment 
      ? ({ pix: 'PIX', credit_card: 'cartão', debit_card: 'débito', cash: 'dinheiro', in_person: 'presencial' }[client.paymentPreference!] || client.paymentPreference)
      : null;
    
    const parts: string[] = [
      `Cliente: ${client.name}${phoneDisplay ? ' tel:' + phoneDisplay : ''}`,
      `Visitas: ${client.totalAppointments}${client.daysSinceLastVisit !== null ? ` (última há ${client.daysSinceLastVisit}d)` : ''}`,
    ];
    
    if (hasPayment) parts.push(`Pagamento: ${paymentLabel}`);
    if (!hasCpf) parts.push('SEM CPF');
    if (!hasBday) parts.push('SEM niver');
    if (client.loyaltyPoints > 0) parts.push(`Fidelidade: ${client.loyaltyPoints}pts`);
    
    // Compact last services (max 3)
    const lastSvc = client.lastServices
      .filter(s => s.status !== 'cancelled' && s.status !== 'canceled')
      .slice(0, 3)
      .map(s => `${s.serviceName} ${formatDate(s.date)}`)
      .join(', ');
    if (lastSvc) parts.push(`Histórico: ${lastSvc}`);
    
    // Upcoming (max 2)
    const upc = client.upcomingAppointments.slice(0, 2)
      .map(a => `${a.serviceName} ${formatDate(a.date)} ${formatTime(a.date)}`)
      .join(', ');
    if (upc) parts.push(`Agendado: ${upc}`);
    
    if (client.preferredServices.length > 0) parts.push(`Prefere: ${client.preferredServices.join(',')}`);
    if (client.preferredProfessional) parts.push(`Profissional pref: ${client.preferredProfessional}`);
    if (client.isNewClient) parts.push('CLIENTE NOVO');
    if (client.aiNotes) parts.push(`Obs IA: ${client.aiNotes.substring(0, 80)}`);
    
    // Proactive hints (compact, max 2)
    const hints: string[] = [];
    if (client.daysSinceLastVisit !== null && client.daysSinceLastVisit > 14) {
      hints.push(`Sugira retorno (${client.daysSinceLastVisit}d ausente)`);
    }
    if (!hasPayment && client.totalAppointments >= 1) {
      hints.push('Pergunte forma pagamento');
    }
    if (hints.length > 0) parts.push(`💡 ${hints.join('; ')}`);
    
    if (isLidPhone(client.phone)) parts.push('Pergunte telefone');
    
    // LID-specific instruction: add a clear instruction for the AI to naturally ask for phone number
    if (client.phone.startsWith('lid:') || client.phone.startsWith('jid:')) {
      parts.push('IMPORTANTE: Telefone pendente (formato LID). Sempre pergunte o telefone de forma natural no início da conversa para enviar confirmações e lembretes');
    }
    
    ctx = parts.join('. ') + '.';
  } else {
    ctx = 'CLIENTE NOVO. Pergunte nome, apresente serviços, pergunte forma pagamento. Se PIX sem CPF, pergunte CPF.';
  }
  
  // Build the compact system prompt
  let prompt = `Você é Luna, recepcionista virtual do ${salon.businessName}. Simpática, profissional e OBJETIVA.

Salão: ${salon.businessName} | ${address || 'sem endereço'}${salon.whatsappNumber ? ' | WhatsApp: ' + salon.whatsappNumber : ''}
Horário: ${salon.openingTime}-${salon.closingTime} ${salon.workingDays.map(d => dayNames[d]).join(',')} | Hoje: ${dayName} ${todayStr} ${salonNow.timeStr} ${open ? 'ABERTO' : 'FECHADO'} (TZ: ${salonTz})
${salon.googleMapsUrl ? 'Maps: ' + salon.googleMapsUrl : ''}
Serviços: ${svc}
Profissionais: ${prof || 'não informado'}
${pkg ? 'Pacotes: ' + pkg : ''}
${ctx}

REGRAS IMPORTANTES:
1. Use o NOME do cliente sempre. Seja BREVE (máx 4 frases, 1-2 emojis).
2. NUNCA mude o horário que o cliente pediu sem avisar explicitamente e pedir confirmação.
3. Se o cliente tem agendamentos futuros, MENCIONE eles antes de criar novos.
4. Se o cliente quer agendar para outra pessoa, pergunte o NOME e TELEFONE dessa pessoa.
5. Cliente novo→pergunte nome. Sem CPF e quer PIX→pergunte CPF ANTES de agendar.

FLUXO DE AGENDAMENTO (siga esta ordem, NÃO pule etapas):
1. Confirme o SERVIÇO com o cliente (use nome exato da lista)
2. Confirme o PROFISSIONAL (ou pergunte preferência)
3. Confirme DATA e HORÁRIO (verifique disponibilidade, NUNCA altere sem avisar)
4. Confirme FORMA DE PAGAMENTO
5. Só depois de TUDO confirmado, inclua: [AGENDAR:serviço:profissional:YYYY-MM-DD:HH:mm:pagamento]

PIX: Sempre que o cliente quiser pagar via PIX, diga "Vou gerar o QR Code PIX!" e inclua [AGENDAR:...:pix]. O sistema gera o QR automaticamente. Se o cliente NÃO tem CPF, PERGUNTE antes de agendar com PIX.

Formato AGENDAR: [AGENDAR:serviço:profissional:YYYY-MM-DD:HH:mm:pagamento]
Ex: [AGENDAR:Manicure:Ana:2026-04-24:10:00:pix]
serviço=nome exato da lista ou "Svc1+Svc2" para combos. profissional=nome exato. pagamento=pix|credit_card|debit_card|cash|in_person.`;

  return prompt;
}

// === HELPERS ===

function parseWorkingDays(workingDays: string | null): number[] {
  if (!workingDays) return [1, 2, 3, 4, 5];
  return workingDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'pendente',
    scheduled: 'agendado',
    confirmed: 'confirmado',
    completed: 'concluído',
    attended: 'compareceu',
    cancelled: 'cancelado',
    canceled: 'cancelado',
    no_show: 'não compareceu',
  };
  return labels[status] || status;
}
