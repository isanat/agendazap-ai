/**
 * FAQ Service - Deterministic template responses for common questions
 * Resolves FAQ queries WITHOUT calling the LLM (zero token cost)
 * 
 * Part of the 3-layer architecture:
 *   Pre-Router (deterministic) → LLM + Tool Calling → Services
 * 
 * IMPORTANT: The FAQ must NOT intercept messages that are part of an active
 * conversation about appointments. Follow-up questions like "qual horário?"
 * or "quanto devo pagar?" in the context of an ongoing booking conversation
 * must go to the LLM for contextual answers.
 * 
 * CRITICAL: If the client has upcoming appointments, questions about "horário"
 * or "valor" are almost certainly about THEIR appointment, not about general
 * business info. In this case, ALWAYS let the LLM handle these questions.
 * 
 * Handles:
 * - Pricing questions ("quanto custa?", "preço?") — ONLY general, not about my appointments
 * - Hours questions ("que horas abre?", "horário de funcionamento?") — ONLY business hours
 * - Address questions ("onde fica?", "endereço?")
 * - Services list ("quais serviços vocês têm?")
 * - Thanks/goodbye ("obrigado", "valeu")
 */

import { db } from '@/lib/db';

export interface FaqResponse {
  answered: boolean;
  response: string | null;
  category: string;
}

/**
 * Try to answer the message with a deterministic FAQ template.
 * Returns { answered: true, response } if matched, { answered: false } otherwise.
 * 
 * Now accepts optional phone parameter for conversation context checking.
 */
export async function tryFaqResponse(
  message: string,
  accountId: string,
  phone?: string
): Promise<FaqResponse> {
  const lower = message.trim().toLowerCase();
  
  // ===== APPOINTMENT CHANGE/RESCHEDULE DETECTION =====
  // If the client is asking to change, reschedule, or modify their appointment,
  // ALWAYS let the LLM handle it. These require context and the [REAGENDAR] command.
  if (isAppointmentChangeRequest(lower)) {
    console.log(`[FAQ] Appointment change request detected, skipping FAQ`);
    return { answered: false, response: null, category: 'none' };
  }
  
  // ===== CONVERSATION CONTEXT CHECK =====
  // Two-level check:
  // 1. If client has upcoming appointments, don't intercept hours/pricing questions
  // 2. If there's an active conversation about appointments, skip FAQ entirely
  if (phone) {
    // Level 1: Check for upcoming appointments (fast, efficient query)
    const hasAppointments = await clientHasUpcomingAppointments(accountId, phone);
    if (hasAppointments) {
      // If client has upcoming appointments, hours/pricing questions are about THEIR
      // appointment, not about general business info. Let the LLM handle with context.
      if (isHoursQuestion(lower) || isPricingQuestion(lower)) {
        console.log(`[FAQ] Client has upcoming appointments, skipping hours/pricing FAQ for: ${lower}`);
        return { answered: false, response: null, category: 'none' };
      }
    }
    
    // Level 2: Check for active conversation about appointments
    const hasActiveConversation = await checkActiveConversation(accountId, phone);
    if (hasActiveConversation) {
      console.log(`[FAQ] Active conversation detected for ${phone}, skipping FAQ`);
      return { answered: false, response: null, category: 'none' };
    }
  }
  
  // 1. Pricing questions
  if (isPricingQuestion(lower)) {
    const response = await buildPricingResponse(accountId);
    if (response) {
      return { answered: true, response, category: 'pricing' };
    }
  }
  
  // 2. Hours questions
  if (isHoursQuestion(lower)) {
    const response = await buildHoursResponse(accountId);
    if (response) {
      return { answered: true, response, category: 'hours' };
    }
  }
  
  // 3. Address questions
  if (isAddressQuestion(lower)) {
    const response = await buildAddressResponse(accountId);
    if (response) {
      return { answered: true, response, category: 'address' };
    }
  }
  
  // 4. Services list questions
  if (isServicesQuestion(lower)) {
    const response = await buildServicesResponse(accountId);
    if (response) {
      return { answered: true, response, category: 'services' };
    }
  }
  
  // 5. Social media questions
  if (isSocialMediaQuestion(lower)) {
    const response = await buildSocialMediaResponse(accountId);
    if (response) {
      return { answered: true, response, category: 'social_media' };
    }
  }
  
  // 6. Thanks/goodbye
  if (isThanksQuestion(lower)) {
    return {
      answered: true,
      response: 'Por nada! Estou aqui pra ajudar. Qualquer coisa é só chamar! 😊',
      category: 'thanks',
    };
  }
  
  return { answered: false, response: null, category: 'none' };
}

// ===== APPOINTMENT CHANGE DETECTION =====

/**
 * Check if the message is a request to change/reschedule/cancel an appointment.
 * These ALWAYS need the LLM because they require:
 * - Looking up the specific appointment ID
 * - Using the [REAGENDAR:id:...] or [CANCELAR:id] command
 * - Conversation context about which appointment
 */
function isAppointmentChangeRequest(lower: string): boolean {
  const patterns = [
    /alterar.*hor[áa]rio|hor[áa]rio.*alterar/,
    /mudar.*hor[áa]rio|hor[áa]rio.*mudar/,
    /trocar.*hor[áa]rio|hor[áa]rio.*trocar/,
    /reagendar|remarcar/,
    /cancelar.*agendamento|agendamento.*cancelar/,
    /quero (cancelar|mudar|alterar|trocar)/,
    /posso (cancelar|mudar|alterar|trocar)/,
    /é poss[ií]vel.*alterar|é poss[ií]vel.*mudar|é poss[ií]vel.*cancelar/,
    /é poss[ií]vel.*reagendar/,
    /não vou conseguir|nao vou conseguir/,
    /não pode mais|nao pode mais/,
    /preciso (cancelar|mudar|alterar|trocar)/,
    /queria (cancelar|mudar|alterar|trocar)/,
    /gostaria de (cancelar|mudar|alterar|trocar)/,
    /posso (mudar|alterar|trocar) (o |a )?(hor[áa]rio|data|dia)/,
    /quero (mudar|alterar|trocar) (o |a )?(hor[áa]rio|data|dia)/,
    /desmarcar/,
  ];
  return patterns.some(p => p.test(lower));
}

// ===== CLIENT APPOINTMENT CHECK =====

/**
 * Check if a client has upcoming appointments.
 * If they do, questions about "horário" or "valor" are almost certainly
 * about THEIR appointment, not about general business info.
 * This is a fast, targeted query that only checks the appointment count.
 */
async function clientHasUpcomingAppointments(accountId: string, phone: string): Promise<boolean> {
  try {
    // Normalize phone for search - try multiple formats
    const normalizedPhone = phone.replace(/\D/g, '');
    const searchTerms = [
      normalizedPhone,
      normalizedPhone.slice(-9), // Last 9 digits (most common)
      normalizedPhone.slice(-8), // Last 8 digits
    ].filter(t => t.length >= 8);
    
    // Also handle LID format
    if (phone.startsWith('lid:')) {
      searchTerms.push(phone);
    }
    
    // Find client by phone
    const client = await db.client.findFirst({
      where: {
        accountId,
        OR: searchTerms.map(term => ({
          phone: { contains: term }
        })),
      },
      select: { id: true },
    });
    
    if (!client) return false;
    
    // Check for upcoming appointments
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const upcomingCount = await db.appointment.count({
      where: {
        clientId: client.id,
        datetime: { gte: todayStart },
        status: { in: ['scheduled', 'confirmed', 'pending'] },
      },
    });
    
    return upcomingCount > 0;
  } catch (error) {
    // If we can't check, be conservative and don't block FAQ
    console.warn('[FAQ] Error checking upcoming appointments:', error);
    return false;
  }
}

// ===== CONVERSATION CONTEXT =====

/**
 * Check if there's an active conversation about appointments/scheduling.
 * If the client has sent/received messages in the last 15 minutes that are
 * about scheduling, appointments, or booking, we should NOT intercept with FAQ.
 * 
 * This prevents the FAQ from answering "qual horário?" with business hours
 * when the client is actually asking about their appointment time.
 */
async function checkActiveConversation(accountId: string, phone: string): Promise<boolean> {
  try {
    // Check for recent messages (last 15 minutes) in this conversation
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Use multiple search formats to handle phone number format mismatches
    const normalizedPhone = phone.replace(/\D/g, '');
    const searchTerms = [
      normalizedPhone,
      normalizedPhone.slice(-9), // Last 9 digits (most common)
      normalizedPhone.slice(-8), // Last 8 digits
    ].filter(t => t.length >= 8);
    
    // Also handle LID format
    if (phone.startsWith('lid:')) {
      searchTerms.push(phone);
    }
    
    const recentMessages = await db.whatsappMessage.findMany({
      where: {
        accountId,
        OR: searchTerms.map(t => ({ clientPhone: { contains: t } })),
        createdAt: { gte: fifteenMinutesAgo },
      },
      select: {
        direction: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8, // Check last 8 messages
    });
    
    if (recentMessages.length < 2) {
      return false; // Not enough messages for a conversation
    }
    
    // Check if recent messages contain appointment/scheduling keywords
    const appointmentKeywords = [
      'agendamento', 'agendar', 'agendado', 'marcar', 'horário', 'horario',
      'corte', 'barba', 'manicure', 'pedicure', 'sobrancelha',
      'profissional', 'confirmado', 'confirmar',
      'cancelar', 'reagendar', 'atendimento', 'atendido', 'atender',
      'alterar', 'mudar', 'trocar', 'desmarcar',
      'total', 'r$',
      // Common professional names that indicate appointment context
    ];
    
    const hasAppointmentContext = recentMessages.some(msg => {
      const msgLower = (msg.message || '').toLowerCase();
      return appointmentKeywords.some(kw => msgLower.includes(kw));
    });
    
    return hasAppointmentContext;
  } catch (error) {
    // If we can't check conversation context, be conservative and don't block FAQ
    console.warn('[FAQ] Error checking conversation context:', error);
    return false;
  }
}

// ===== PATTERN MATCHING =====

/**
 * Check if the message is a question about MY appointment value/total.
 * These should NOT be handled by FAQ — they need the LLM to calculate the sum
 * of the client's specific appointments.
 */
function isMyAppointmentValueQuestion(lower: string): boolean {
  const patterns = [
    /quanto (devo|vou) pagar/,
    /quanto (eu |)(devo|vou)/,
    /valor (do |da )?meu (agendamento|atendimento|serviço|horário)/,
    /valor que (eu |)devo/,
    /valor que devo pagar/,
    /quanto (fica |é )(o |a )?meu (agendamento|atendimento|serviço|horário)/,
    /preço (do |de )?meu (agendamento|atendimento|serviço|horário)/,
    /sabe quanto (devo|vou pagar)/,
    /quanto (custa|fica|é) (o |a )?meu/,
    /total (do |de )?meu (agendamento|atendimento)/,
    /quanto (é |fica )?pra (eu |)pagar/,
    /já (estou |to )agendado.*valor|valor.*já (estou |to )agendado/,
    /quero saber (o |o )?valor (que |)devo/,
    /meu (agendamento|atendimento|serviço).*quanto|quanto.*meu (agendamento|atendimento|serviço)/,
    /(estou|to) agendado.*quanto|quanto.*(estou|to) agendado/,
    /quero saber (o |o )?valor/,
    /quanto (é |fica |custa )?o (meu |)(agendamento|atendimento)/,
    /valor (do |da )?(meu |)(agendamento|atendimento|horário)/,
    /(devo|vou) pagar quanto/,
    /quanto (vou |devo )pagar/,
  ];
  return patterns.some(p => p.test(lower));
}

function isPricingQuestion(lower: string): boolean {
  // IMPORTANT: If the client is asking about THEIR appointment value,
  // do NOT handle via FAQ. Let the LLM calculate the sum of their specific appointments.
  if (isMyAppointmentValueQuestion(lower)) {
    return false;
  }
  
  // Also skip if message contains appointment context keywords
  if (/\bagendad[oa]\b|\bagendamento\b|\bmeu\b.*\bservi[çc]o\b/.test(lower)) {
    return false;
  }
  
  const patterns = [
    /preço|precos|preç(o|os)|valor|valores|custo|custa|tarifa|tabela/,
    /quanto (custa|fica|é|ta|tá)|quanto (é|custa|fica) (o|a|um|uma)/,
    /qual (o|a) (preço|valor|custo)|lista de (preço|valor)/,
    /tabela de (preço|preço)|preço(.*)serviço|serviço(.*)preço/,
    /quanto (voce|você)s? cobr/,
  ];
  return patterns.some(p => p.test(lower));
}

/**
 * Check if the message is asking about THEIR appointment time.
 * These should NOT be handled by FAQ — they need the LLM to look up the client's specific appointments.
 */
function isMyAppointmentTimeQuestion(lower: string): boolean {
  const patterns = [
    /meu (agendamento|atendimento|horário|hora)/,
    /horário (do |da )?meu (agendamento|atendimento)/,
    /que (horário|hora) (é |e |está )?meu/,
    /(agendamento|atendimento) .*horário|horário.*(agendamento|atendimento)/,
    /tenho agendamento.*horário|horário.*tenho agendamento/,
    /verificar.*agendamento|verifique.*agendamento/,
    /ver se.*agendado|verificar.*agendado/,
    /qual (horário|hora) (meu|estou)/,
    /(estou|to) agendado.*(horário|hora)|(horário|hora).*(estou|to) agendado/,
  ];
  return patterns.some(p => p.test(lower));
}

function isHoursQuestion(lower: string): boolean {
  // IMPORTANT: If the client is asking about THEIR appointment time,
  // do NOT handle via FAQ. Let the LLM look up their specific appointment.
  if (isMyAppointmentTimeQuestion(lower)) {
    return false;
  }
  
  // Short "qual horário?" or "que horas?" are too ambiguous without context.
  // Only match if there's clear business hours context.
  // "qual horário" alone is likely about their appointment, not business hours.
  if (/^qual hor[áa]rio[\s!?]*$/.test(lower)) {
    return false;
  }
  if (/^que horas[\s!?]*$/.test(lower)) {
    return false;
  }
  if (/^qual hora[\s!?]*$/.test(lower)) {
    return false;
  }
  
  // Also skip "qual horário?" when it's clearly a follow-up (short message with question mark)
  const words = lower.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= 3 && /hor[áa]rio|hora/.test(lower) && /\?/.test(lower)) {
    return false; // Too short and ambiguous - let LLM handle with context
  }
  
  const patterns = [
    /horário de funcionamento|horário de atendimento/,
    /que horas (vocês|vcs|a loja|o salão|a barbearia|a clínica) (abrem|fecham|funciona)/,
    /estão? abert|estão? fechad|abre (hoje|amanhã|amanha)|fecha (hoje|amanhã|amanha)/,
    /quando abrem|quando fecham|até que hora|a partir de que hora/,
    /funciona (hoje|amanhã|amanha|sábado|sabado|domingo)/,
    /horário (do|da) (salão|barbearia|clínica|loja|estabelecimento)/,
  ];
  return patterns.some(p => p.test(lower));
}

function isAddressQuestion(lower: string): boolean {
  const patterns = [
    /endereço|endereco|localização|localizacao|onde (fica|é|está|esta)|como chegar/,
    /rua|avenida|av\.|bairro|cep|ponto de referência|referência/,
    /fica (onde|aonde|em que)|que (rua|avenida|bairro)/,
    /mapa|google maps|waze|gps/,
  ];
  return patterns.some(p => p.test(lower));
}

/**
 * Check if the message is asking about available services.
 * IMPORTANT: This must NOT match:
 * - "fazer a barba" (booking a service, not asking about services)
 * - "quero marcar um corte" (booking intent)
 * - "é possivel?" (availability question, not service list)
 */
function isServicesQuestion(lower: string): boolean {
  // Exclude messages that are clearly about BOOKING a service, not asking about services
  // "fazer a barba", "fazer o corte", "marcar corte" are booking intents
  const bookingIntents = [
    /quero (marcar|agendar|fazer)/,
    /gostaria de (marcar|agendar|fazer)/,
    /pode (marcar|agendar)/,
    /vim (fazer|cortar)/,
    /vou (fazer|cortar)/,
    /é poss[ií]vel/,
    /tem (como|disponibilidade)/,
    /dá pra (marcar|agendar|fazer)/,
    /fazer (a |o )?(barba|corte|manicure|pedicure|sobrancelha|hidrata|color|mecha)/,
    /cortar (o |a )?(cabelo|barba)/,
  ];
  if (bookingIntents.some(p => p.test(lower))) {
    return false;
  }
  
  const patterns = [
    /quais (serviço|serviços|servico|servicos)/,
    /que (serviço|serviços|servico|servicos)/,
    /lista de (serviço|serviços|servico|servicos)|catálogo|catalogo/,
    /o que (vocês|voce|vcs) (fazem|oferecem|têm|tem)/,
    /serviços dispon[ií]vel/,
    /tabela de servi[çc]o/,
    /(vocês|vcs) (fazem|oferecem|trabalham com) (quais|que)/,
  ];
  return patterns.some(p => p.test(lower));
}

function isSocialMediaQuestion(lower: string): boolean {
  // IMPORTANT: Only match when the client is CLEARLY asking about social media.
  // Do NOT match when the message is about appointments, scheduling, or other topics
  // that just happen to contain similar words.
  
  // First, exclude messages that are clearly about appointments/changes
  if (/alterar|mudar|trocar|reagendar|cancelar|desmarcar|agendado|agendamento|hor[áa]rio/.test(lower)) {
    return false;
  }
  
  const patterns = [
    /instagram|insta\s|ig\s/,
    /facebook|fb\s/,
    /rede?s?social|redes sociais/,
    /tem (instagram|face|ig|facebook)/,
    /qual (o|a) (instagram|face|facebook|site)/,
    /qual (o|a) (seu|sua|seus|suas)? ?(instagram|face|facebook|site)/,
    /segue|seguir|perfil.*instagram|perfil.*facebook/,
    /@\w+/, // @username patterns
  ];
  return patterns.some(p => p.test(lower));
}

function isThanksQuestion(lower: string): boolean {
  const patterns = [
    /^(obrigad[oa]?s?|valeu|thanks|agradeço|agradecido|agradecida|grato|grata|muito obrigado|muito obrigada)[\s!.?]*$/i,
    /^(vlw|tmj|abraço|abraços|tchau|bye|até mais|ate mais|até logo|ate logo)[\s!.?]*$/i,
  ];
  return patterns.some(p => p.test(lower));
}

// ===== RESPONSE BUILDERS =====

async function buildPricingResponse(accountId: string): Promise<string | null> {
  try {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: { businessName: true, businessCategory: true },
    });
    
    const services = await db.service.findMany({
      where: { accountId, isActive: true },
      select: { name: true, price: true, durationMinutes: true },
      orderBy: { price: 'asc' },
    });
    
    if (services.length === 0) return null;
    
    const nicheLabel = getNicheServiceLabel(account?.businessCategory || 'beauty');
    
    const serviceList = services
      .map(s => `• ${s.name}: R$${s.price.toFixed(2)} (${s.durationMinutes}min)`)
      .join('\n');
    
    return `💰 ${nicheLabel} da ${account?.businessName || 'nossa empresa'}:\n\n${serviceList}\n\nQuer agendar algum deles? 😊`;
  } catch {
    return null;
  }
}

async function buildHoursResponse(accountId: string): Promise<string | null> {
  try {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: {
        businessName: true,
        businessCategory: true,
        openingTime: true,
        closingTime: true,
        workingDays: true,
      },
    });
    
    if (!account) return null;
    
    const workingDays = account.workingDays
      ? account.workingDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
      : [1, 2, 3, 4, 5];
    
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const workingDayNames = workingDays.map(d => dayNames[d] || d).join(', ');
    
    const establishmentLabel = getNicheEstablishmentLabel(account.businessCategory || 'beauty');
    
    return `🕐 Horário da ${establishmentLabel} ${account.businessName}:\n\n⏰ ${account.openingTime} às ${account.closingTime}\n📅 ${workingDayNames}\n\nQuer agendar um horário? 😊`;
  } catch {
    return null;
  }
}

async function buildAddressResponse(accountId: string): Promise<string | null> {
  try {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: {
        businessName: true,
        businessCategory: true,
        address: true,
        addressCity: true,
        addressState: true,
        googleMapsUrl: true,
        instagram: true,
        facebook: true,
        website: true,
      },
    });
    
    if (!account) return null;
    
    const addressParts = [account.address, account.addressCity, account.addressState].filter(Boolean);
    if (addressParts.length === 0) return null;
    
    const address = addressParts.join(', ');
    const mapsLink = account.googleMapsUrl ? `\n🗺️ Maps: ${account.googleMapsUrl}` : '';
    
    // Include social media links if available
    const socialLinks: string[] = [];
    if (account.instagram) socialLinks.push(`📸 @${account.instagram}`);
    if (account.facebook) socialLinks.push(`📘 ${account.facebook}`);
    if (account.website) socialLinks.push(`🌐 ${account.website}`);
    const socialText = socialLinks.length > 0 ? `\n${socialLinks.join(' | ')}` : '';
    
    return `📍 Endereço: ${address}${mapsLink}${socialText}\n\nQuer agendar uma visita? 😊`;
  } catch {
    return null;
  }
}

async function buildServicesResponse(accountId: string): Promise<string | null> {
  try {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: { businessName: true, businessCategory: true },
    });
    
    const services = await db.service.findMany({
      where: { accountId, isActive: true },
      select: { name: true, price: true, durationMinutes: true },
      orderBy: { name: 'asc' },
    });
    
    if (services.length === 0) return null;
    
    const nicheLabel = getNicheServiceLabel(account?.businessCategory || 'beauty');
    
    const serviceList = services
      .map(s => `• ${s.name} (${s.durationMinutes}min) - R$${s.price.toFixed(2)}`)
      .join('\n');
    
    return `✨ ${nicheLabel} disponíveis na ${account?.businessName || 'nossa empresa'}:\n\n${serviceList}\n\nPosso te ajudar a agendar? 😊`;
  } catch {
    return null;
  }
}

async function buildSocialMediaResponse(accountId: string): Promise<string | null> {
  try {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: {
        businessName: true,
        instagram: true,
        facebook: true,
        website: true,
      },
    });
    
    if (!account) return null;
    
    const links: string[] = [];
    if (account.instagram) links.push(`📸 Instagram: @${account.instagram} (https://instagram.com/${account.instagram})`);
    if (account.facebook) links.push(`📘 Facebook: ${account.facebook}`);
    if (account.website) links.push(`🌐 Site: ${account.website}`);
    
    if (links.length === 0) {
      // Don't use FAQ for this - let LLM handle the 'no social media' response
      // so it can be more contextual
      return null;
    }
    
    return `Siga a ${account.businessName} nas redes sociais! 😊\n\n${links.join('\n')}`;
  } catch {
    return null;
  }
}

// ===== NICHE HELPERS =====

function getNicheServiceLabel(category: string): string {
  switch (category) {
    case 'barber': return 'Serviços';
    case 'dental': return 'Procedimentos';
    case 'aesthetics': return 'Tratamentos';
    case 'beauty':
    default: return 'Serviços';
  }
}

function getNicheEstablishmentLabel(category: string): string {
  switch (category) {
    case 'barber': return 'Barbearia';
    case 'dental': return 'Clínica Odontológica';
    case 'aesthetics': return 'Clínica de Estética';
    case 'beauty':
    default: return 'Salão';
  }
}
