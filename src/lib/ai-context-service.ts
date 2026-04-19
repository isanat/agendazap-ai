/**
 * AI Context Service - Serviço Completo de Contexto para IA
 * 
 * Busca todas as informações necessárias para a IA atender
 * como uma verdadeira recepcionista do salão.
 */

import { db } from '@/lib/db';

// === TIPOS ===

export interface SalonContext {
  businessName: string;
  businessType: string;
  address: string | null;
  city: string | null;
  state: string | null;
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
  lastServices: {
    serviceName: string;
    professionalName: string | null;
    date: Date;
    status: string;
  }[];
  upcomingAppointments: {
    id: string;
    serviceName: string;
    professionalName: string | null;
    date: Date;
    status: string;
  }[];
  preferredServices: string[];
  preferredProfessional: string | null;
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
    where: { accountId },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      durationMinutes: true,
      category: true
    }
  });
  
  // Fixed: Use ServiceProfessional instead of services
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
  
  // Fixed: Use PackageService instead of services
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
  
  const lastAppointments = await db.appointment.findMany({
    where: {
      clientId: client.id,
      datetime: { lte: new Date() }
    },
    orderBy: { datetime: 'desc' },
    take: 5,
    include: {
      service: true,
      professional: true
    }
  });
  
  const lastServices = lastAppointments.map((apt: any) => ({
    serviceName: apt.service?.name || 'Serviço',
    professionalName: apt.professional?.name || null,
    date: apt.datetime,
    status: apt.status
  }));
  
  const upcomingAppointments = await db.appointment.findMany({
    where: {
      clientId: client.id,
      datetime: { gte: new Date() },
      status: { in: ['scheduled', 'confirmed'] }
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
  
  // Detectar preferências
  const serviceCounts: Record<string, number> = {};
  const professionalCounts: Record<string, number> = {};
  
  lastAppointments.forEach((apt: any) => {
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
  
  return {
    id: client.id,
    name: client.name || 'Cliente',
    phone: client.phone,
    email: client.email,
    totalAppointments: client.totalAppointments || lastAppointments.length,
    lastVisit: client.lastVisit || lastAppointments[0]?.datetime || null,
    loyaltyPoints: client.loyaltyPoints || 0,
    notes: client.notes,
    lastServices,
    upcomingAppointments: upcoming,
    preferredServices,
    preferredProfessional
  };
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
    const lastServices = client.lastServices.slice(0, 3).map(s => 
      `${s.serviceName} com ${s.professionalName || 'profissional'} em ${formatDate(s.date)}`
    ).join('; ');
    
    const upcoming = client.upcomingAppointments.map(a =>
      `${a.serviceName} em ${formatDate(a.date)} às ${formatTime(a.date)}`
    ).join('; ');
    
    clientContext = `
CONTEXTO DO CLIENTE (USE ISSO!):
- Nome: ${client.name}
- Telefone: ${client.phone}
- Total de visitas: ${client.totalAppointments}
- Última visita: ${client.lastVisit ? formatDate(client.lastVisit) : 'Primeira vez'}
- Pontos de fidelidade: ${client.loyaltyPoints} pontos
${client.notes ? `- Observações: ${client.notes}` : ''}
${lastServices ? `- Últimos serviços: ${lastServices}` : ''}
${upcoming ? `- ⚠️ AGENDAMENTOS FUTUROS: ${upcoming}` : ''}
${client.preferredServices.length > 0 ? `- Serviços preferidos: ${client.preferredServices.join(', ')}` : ''}
${client.preferredProfessional ? `- Profissional preferido: ${client.preferredProfessional}` : ''}

IMPORTANTE: Use o nome do cliente (${client.name}) na conversa para personalizar o atendimento!
`;
  } else {
    clientContext = `
CONTEXTO DO CLIENTE:
Este é um NOVO cliente (primeiro contato). Seja acolhedor e apresente o salão brevemente.
Pergunte o nome dele para personalizar o atendimento.
`;
  }
  
  const availableToday = salon.workingDays.includes(today.getDay());
  
  return `Você é a RECEPCIONISTA VIRTUAL do ${salon.businessName}. Você é simpática, profissional e MUITO ATENCIOSA.

=== INFORMAÇÕES DO ESTABELECIMENTO ===
Nome: ${salon.businessName}
Tipo: ${salon.businessType === 'salon' ? 'Salão de Beleza' : salon.businessType}
Endereço: ${address}
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

=== FLUXO DE AGENDAMENTO ===
1. Pergunte qual serviço deseja
2. Pergunte se tem preferência de profissional
3. Pergunte data e horário preferidos
4. Confirme todos os dados antes de finalizar
5. Informe o valor total

Lembre-se: você é a primeira impressão do salão. Seja acolhedora e prestativa!`;
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
