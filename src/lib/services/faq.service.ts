/**
 * FAQ Service - Deterministic template responses for common questions
 * Resolves FAQ queries WITHOUT calling the LLM (zero token cost)
 * 
 * Part of the 3-layer architecture:
 *   Pre-Router (deterministic) → LLM + Tool Calling → Services
 * 
 * Handles:
 * - Pricing questions ("quanto custa?", "preço?")
 * - Hours questions ("que horas?", "horário?")
 * - Address questions ("onde fica?", "endereço?")
 * - Services list ("quais serviços?", "o que fazem?")
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
 */
export async function tryFaqResponse(
  message: string,
  accountId: string
): Promise<FaqResponse> {
  const lower = message.trim().toLowerCase();
  
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
  
  // 5. Thanks/goodbye
  if (isThanksQuestion(lower)) {
    return {
      answered: true,
      response: 'Por nada! Estou aqui pra ajudar. Qualquer coisa é só chamar! 😊',
      category: 'thanks',
    };
  }
  
  return { answered: false, response: null, category: 'none' };
}

// ===== PATTERN MATCHING =====

function isPricingQuestion(lower: string): boolean {
  const patterns = [
    /preço|precos|preç(o|os)|quanto|valor|valores|custo|custa|tarifa|tabela/,
    /quanto (custa|fica|é|ta|tá)|quanto (é|custa|fica) (o|a|um|uma)/,
    /qual (o|a) (preço|valor|custo)|lista de (preço|valor)/,
    /tabela de (preço|preço)|preço(.*)serviço|serviço(.*)preço/,
    /quanto (voce|você)s? cobr/,
  ];
  return patterns.some(p => p.test(lower));
}

function isHoursQuestion(lower: string): boolean {
  const patterns = [
    /horário|horario|hora|horas|funcionamento|aberto|fechado|abrem|fecham/,
    /que horas|a que hora|qual (o|a) horário|horário de (funcionamento|atendimento)/,
    /estão? abert|estão? fechad|abre (hoje|amanhã|amanha)|fecha (hoje|amanhã|amanha)/,
    /quando abrem|quando fecham|até que hora|a partir de que hora/,
    /funciona (hoje|amanhã|amanha|sábado|sabado|domingo)/,
  ];
  return patterns.some(p => p.test(lower));
}

function isAddressQuestion(lower: string): boolean {
  const patterns = [
    /endereço|endereco|localização|localizacao|local|onde (fica|é|está|esta)|como chegar/,
    /rua|avenida|av\.|bairro|cep|ponto de referência|referência/,
    /fica (onde|aonde|em que)|que (rua|avenida|bairro)/,
    /mapa|google maps|waze|gps/,
  ];
  return patterns.some(p => p.test(lower));
}

function isServicesQuestion(lower: string): boolean {
  const patterns = [
    /serviço|serviços|servico|servicos|fazem|faz|oferecem|oferece|trabalham/,
    /quais (serviço|serviços|servico|servicos)|que (serviço|serviços|servico|servicos)/,
    /lista de (serviço|serviços|servico|servicos)|catálogo|catalogo/,
    /o que (vocês|voce|vcs) (faz|fazem|oferece|oferecem)/,
    /o que (tem|temos)|tem (disponível|disponivel)/,
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
      },
    });
    
    if (!account) return null;
    
    const addressParts = [account.address, account.addressCity, account.addressState].filter(Boolean);
    if (addressParts.length === 0) return null;
    
    const address = addressParts.join(', ');
    const mapsLink = account.googleMapsUrl ? `\n🗺️ Maps: ${account.googleMapsUrl}` : '';
    
    return `📍 Endereço: ${address}${mapsLink}\n\nQuer agendar uma visita? 😊`;
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
