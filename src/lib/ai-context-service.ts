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
  email: string | null;
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
 * Find or create a client by phone number
 * Auto-creates client with WhatsApp push name if available
 */
export async function findOrCreateClient(
  accountId: string,
  phone: string,
  pushName?: string
): Promise<string> {
  const normalizedPhone = phone.replace(/\D/g, '');
  
  const existingClient = await db.client.findFirst({
    where: {
      accountId,
      phone: { contains: normalizedPhone.slice(-9) }
    }
  });

  if (existingClient) {
    // Update push name if provided and not already set
    if (pushName && !existingClient.whatsappPushName) {
      await db.client.update({
        where: { id: existingClient.id },
        data: { whatsappPushName: pushName }
      });
    }
    return existingClient.id;
  }

  // Create new client with phone number and push name
  const displayName = pushName || `Cliente ${normalizedPhone.slice(-4)}`;
  
  const newClient = await db.client.create({
    data: {
      accountId,
      name: displayName,
      phone: normalizedPhone,
      whatsappPushName: pushName || null,
      notes: pushName ? `Nome do perfil WhatsApp: ${pushName}` : 'Cliente novo - aguardando nome',
      lastAiInteraction: new Date(),
    }
  });

  console.log(`[AI Context] New client created: ${newClient.id} (${displayName}) for account ${accountId}`);
  return newClient.id;
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
      PackageService: {
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
    services: pkg.PackageService?.map((ps: any) => ps.Service?.name).filter(Boolean) || []
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
  
  const client = await db.client.findFirst({
    where: {
      accountId,
      phone: { contains: normalizedPhone.slice(-9) }
    }
  });
  
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
      service: true,
      professional: true
    }
  });
  
  const lastServices = lastAppointments.map((apt: any) => ({
    serviceName: apt.service?.name || 'Serviço',
    professionalName: apt.professional?.name || null,
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
      service: true,
      professional: true
    }
  });
  
  const upcoming = upcomingAppointments.map((apt: any) => ({
    id: apt.id,
    serviceName: apt.service?.name || 'Serviço',
    professionalName: apt.professional?.name || null,
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
      service: true,
      professional: true
    }
  });

  const cancelled = cancelledAppointments.map((apt: any) => ({
    serviceName: apt.service?.name || 'Serviço',
    professionalName: apt.professional?.name || null,
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
    if (apt.service?.name) {
      serviceCounts[apt.service.name] = (serviceCounts[apt.service.name] || 0) + 1;
    }
    if (apt.professional?.name) {
      professionalCounts[apt.professional.name] = (professionalCounts[apt.professional.name] || 0) + 1;
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
    email: client.email,
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
    const name = apt.service?.name;
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

// === GERAÇÃO DE PROMPT ===

/**
 * Gera o prompt do sistema com TODO o contexto
 */
export async function generateSystemPrompt(
  accountId: string,
  clientPhone: string
): Promise<string> {
  const salon = await getSalonContext(accountId);
  const client = await getClientContext(clientPhone, accountId);
  
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const today = new Date();
  const dayName = dayNames[today.getDay()];
  
  const addressParts = [salon.address, salon.city, salon.state].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ') : 'Não informado';
  
  const servicesList = salon.services.map(s => {
    const desc = s.description ? ` - ${s.description}` : '';
    return `• ${s.name}: R$ ${s.price.toFixed(2)} (${s.durationMinutes} min)${desc}`;
  }).join('\n');
  
  const professionalsList = salon.professionals.map(p => {
    const specs = p.specialties.length > 0 ? ` (especialista em: ${p.specialties.join(', ')})` : '';
    const hours = p.openingTime && p.closingTime ? ` - trabalha ${p.openingTime} às ${p.closingTime}` : '';
    return `• ${p.name}${specs}${hours}`;
  }).join('\n');
  
  const packagesList = salon.packages.length > 0
    ? salon.packages.map(p => {
        const svcList = p.services.join(', ');
        const discount = p.originalPrice > p.price ? ` (ECONOMIZE R$ ${(p.originalPrice - p.price).toFixed(2)}!)` : '';
        return `• ${p.name}: R$ ${p.price.toFixed(2)} (inclui: ${svcList})${discount}`;
      }).join('\n')
    : 'Nenhum pacote disponível';
  
  let clientContext = '';
  if (client) {
    const lastServices = client.lastServices
      .filter(s => s.status !== 'cancelled' && s.status !== 'canceled')
      .slice(0, 5)
      .map(s => 
        `${s.serviceName} com ${s.professionalName || 'profissional'} em ${formatDate(s.date)} (${statusLabel(s.status)})`
      ).join('; ');
    
    const upcoming = client.upcomingAppointments.map(a =>
      `${a.serviceName} em ${formatDate(a.date)} às ${formatTime(a.date)} (status: ${statusLabel(a.status)})`
    ).join('; ');

    const cancelled = client.cancelledAppointments.length > 0
      ? client.cancelledAppointments.slice(0, 3).map(a =>
          `${a.serviceName} em ${formatDate(a.date)}${a.cancellationReason ? ` (motivo: ${a.cancellationReason})` : ''}`
        ).join('; ')
      : null;

    // Build proactive suggestions
    const proactiveSuggestions: string[] = [];
    
    // Suggest return based on time since last visit
    if (client.daysSinceLastVisit !== null && client.daysSinceLastVisit > 14) {
      proactiveSuggestions.push(`⏰ Faz ${client.daysSinceLastVisit} dias que ${client.name} não aparece. Sugira agendar um retorno!`);
    }

    // Suggest based on service frequency
    client.serviceFrequency.forEach(sf => {
      if (sf.suggestedReturnDate) {
        proactiveSuggestions.push(`🔄 ${sf.serviceName}: cliente faz em média a cada ${sf.avgDaysBetweenVisits} dias. Sugira retorno para ${sf.suggestedReturnDate}!`);
      }
    });

    // Suggest preferred payment method
    if (!client.paymentPreference && client.totalAppointments >= 1) {
      proactiveSuggestions.push(`💳 Pergunte a preferência de pagamento (PIX, cartão ou presencial) para personalizar futuros atendimentos.`);
    }

    const paymentLabel = client.paymentPreference 
      ? { pix: 'PIX', credit_card: 'Cartão de Crédito/Débito', debit_card: 'Cartão de Débito', cash: 'Dinheiro', in_person: 'Presencialmente' }[client.paymentPreference] || client.paymentPreference
      : null;
    
    clientContext = `
CONTEXTO DO CLIENTE (USE ISSO!):
- Nome: ${client.name}
- Telefone: ${client.phone}
${client.whatsappPushName && client.whatsappPushName !== client.name ? `- Nome no WhatsApp: ${client.whatsappPushName}` : ''}
- Total de visitas: ${client.totalAppointments}
- Última visita: ${client.lastVisit ? formatDate(client.lastVisit) : 'Primeira vez'}
${client.daysSinceLastVisit !== null ? `- Dias desde a última visita: ${client.daysSinceLastVisit}` : ''}
- Pontos de fidelidade: ${client.loyaltyPoints} pontos
${paymentLabel ? `- Preferência de pagamento: ${paymentLabel}` : ''}
${client.notes ? `- Observações: ${client.notes}` : ''}
${client.aiNotes ? `- Notas da IA: ${client.aiNotes}` : ''}
${client.isNewClient ? '⚠️ CLIENTE NOVO - Primeiro contato! Pergunte o nome dele para personalizar o atendimento.' : ''}
${lastServices ? `- Últimos serviços realizados: ${lastServices}` : ''}
${upcoming ? `- ⚠️ AGENDAMENTOS FUTUROS: ${upcoming}` : ''}
${cancelled ? `- ❌ CANCELAMENTOS RECENTES: ${cancelled}` : ''}
${client.preferredServices.length > 0 ? `- Serviços preferidos: ${client.preferredServices.join(', ')}` : ''}
${client.preferredProfessional ? `- Profissional preferido: ${client.preferredProfessional}` : ''}

${proactiveSuggestions.length > 0 ? `=== SUGESTÕES PROATIVAS (USE DURANTE A CONVERSA!) ===\n${proactiveSuggestions.join('\n')}` : ''}

IMPORTANTE: 
- Use o nome do cliente (${client.name}) na conversa para personalizar o atendimento!
- Se o cliente for NOVO (nome genérico como "Cliente XXXX"), PERGUNTE o nome dele!
- Se o cliente fornecer o nome, diga "Vou anotar seu nome!" e informe que o nome foi registrado.
- Se a preferência de pagamento não foi informada e o cliente vai agendar, PERGUNTE como prefere pagar (PIX/cartão online ou presencialmente no dia).
${client.daysSinceLastVisit && client.daysSinceLastVisit > 21 ? `- Faz mais de 3 semanas que ${client.name} não vem! Sugira agendar um retorno de forma carinhosa.` : ''}
`;
  } else {
    clientContext = `
CONTEXTO DO CLIENTE:
Este é um NOVO cliente (primeiro contato). Seja acolhedor e apresente o salão brevemente.

⚠️ AÇÕES OBRIGATÓRIAS PARA CLIENTE NOVO:
1. PERGUNTE o nome dele para personalizar o atendimento
2. Quando ele disser o nome, responda "Obrigada, {nome}! Vou registrar aqui para lembrar na próxima vez 😊"
3. Apresente os serviços mais populares brevemente
4. Pergunte se já conhece o salão ou se foi indicado por alguém
5. Pergunte como prefere realizar o pagamento (PIX, cartão ou presencialmente)
`;
  }
  
  const availableToday = salon.workingDays.includes(today.getDay());
  
  return `Você é a RECEPCIONISTA VIRTUAL do ${salon.businessName}. Você é simpática, profissional e MUITO ATENCIOSA. Seu nome é Luna.

=== INFORMAÇÕES DO ESTABELECIMENTO ===
Nome: ${salon.businessName}
Tipo: ${salon.businessType === 'salon' ? 'Salão de Beleza' : salon.businessType}
Endereço: ${address}
${salon.googleMapsUrl ? `Google Maps: ${salon.googleMapsUrl}` : ''}
WhatsApp: ${salon.whatsappNumber}
Horário de funcionamento: ${salon.openingTime} às ${salon.closingTime}
Dias de funcionamento: ${salon.workingDays.map(d => dayNames[d]).join(', ')}
Hoje é: ${dayName}, ${formatDate(today)}
${availableToday ? '✅ Estamos ABERTOS hoje!' : '❌ Estamos FECHADOS hoje'}

=== SERVIÇOS OFERECIDOS ===
${servicesList}

=== PROFISSIONAIS ===
${professionalsList || 'Informações de profissionais não disponíveis'}

=== PACOTES E PROMOÇÕES ===
${packagesList}

${clientContext}

=== SUAS CAPACIDADES ===
Você PODE:
✅ Agendar horários (pergunte data e hora preferidos)
✅ Informar valores, duração e descrição de serviços
✅ Indicar qual profissional atende cada serviço
✅ Verificar disponibilidade de horários
✅ Oferecer pacotes e promoções
✅ Reagendar ou cancelar agendamentos
✅ Responder sobre endereço, horário de funcionamento
✅ Usar o histórico do cliente para recomendar serviços
✅ Ser proativa: sugerir horários, perguntar sobre última visita, oferecer novidades
✅ Perguntar e registrar o nome do cliente se for novo
✅ Perguntar e lembrar da preferência de pagamento
✅ Lembrar dos últimos serviços e sugerir retorno quando apropriado
✅ Identificar padrões de agendamento e sugerir horários
✅ Oferecer forma de pagamento preferida do cliente

=== REGRAS DE ATENDIMENTO ===
1. SEMPRE use o nome do cliente se souber (${client?.name || 'novo cliente'})
2. Seja BREVE mas completa - não escreva textos longos
3. Use emojis com moderação (1-2 por mensagem)
4. NUNCA repita saudações se já conversou antes
5. MANTENHA o contexto da conversa - lembre o que foi dito
6. Se o cliente já tem agendamento, INFORME antes de agendar outro
7. Se o cliente é recorrente, PERGUNTE sobre a última experiência
8. Se o cliente tem pontos de fidelidade, MENCIONE como benefício
9. Se o cliente tem profissional preferido, OFEREÇA esse profissional
10. Seja PROATIVA: sugira horários, promova pacotes, pergunte sobre serviços adicionais
11. Se o cliente for NOVO e não deu o nome, PERGUNTE de forma natural
12. Se o cliente disser o nome, CONFIRME que registrou ("Anotado, {nome}!")
13. Se o cliente vai agendar e não tem preferência de pagamento, PERGUNTE
14. Se faz mais de 2 semanas que o cliente não vem, SUGIRA retorno
15. Se o cliente cancelou recentemente, pergunte se quer remarcar

=== FLUXO DE AGENDAMENTO ===
1. Pergunte qual serviço deseja
2. Pergunte se tem preferência de profissional
3. Pergunte data e horário preferidos
4. Informe a forma de pagamento preferida do cliente (se conhecida) ou pergunte
5. Confirme todos os dados antes de finalizar
6. Informe o valor total

=== FORMAS DE PAGAMENTO ===
Quando perguntar sobre pagamento, ofereça as opções:
- PIX (pode ser pago online antecipado)
- Cartão de crédito/débito (online ou presencial)
- Dinheiro (presencialmente no dia)
- Conferir no dia (presencialmente)

Lembre-se: você é a primeira impressão do salão. Seja acolhedora, prestativa e INTELIGENTE!`;
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
