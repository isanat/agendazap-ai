/**
 * AI Pre-Router - Deterministic message routing
 * Resolves ~40% of messages WITHOUT calling the LLM
 * 
 * Layer 1 of the 3-layer architecture:
 *   Pre-Router (deterministic) → LLM + Tool Calling → Services
 * 
 * Routes:
 * - FAQ questions (price, hours, address, services) → faq.service
 * - Greetings → Template greeting
 * - Simple confirmations → Template response
 * - Everything else → Pass to LLM
 */

import { tryFaqResponse, type FaqResponse } from '@/lib/services/faq.service';
import { db } from '@/lib/db';

export interface PreRouterResult {
  handled: boolean;
  response: string | null;
  routedBy: 'pre_router' | 'none';
  category: string;
}

/**
 * Main pre-router function
 * Attempts to handle the message deterministically.
 * If it can't, returns { handled: false } so the LLM handles it.
 */
export async function preRouteMessage(
  message: string,
  accountId: string,
  phone?: string
): Promise<PreRouterResult> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  
  // 1. Check FAQ (price, hours, address, services) — pass phone for conversation context
  const faqResult = await tryFaqResponse(trimmed, accountId, phone);
  if (faqResult.answered && faqResult.response) {
    console.log(`[Pre-Router] ✅ FAQ matched: ${faqResult.category}`);
    return {
      handled: true,
      response: faqResult.response,
      routedBy: 'pre_router',
      category: faqResult.category,
    };
  }
  
  // 2. Check simple greetings
  const greetingResult = await checkGreeting(lower, accountId);
  if (greetingResult.handled) {
    return greetingResult;
  }
  
  // 3. Check simple confirmations/responses
  const confirmResult = checkConfirmation(lower);
  if (confirmResult.handled) {
    return confirmResult;
  }
  
  // 4. Not handled - pass to LLM
  return {
    handled: false,
    response: null,
    routedBy: 'none',
    category: 'llm',
  };
}

/**
 * Check if the message is a simple greeting
 * Returns a dynamic greeting based on the business niche
 */
async function checkGreeting(lower: string, accountId: string): Promise<PreRouterResult> {
  const greetingPatterns = [
    /^(oi|olá|ola|hey|eai|e aí|bom dia|boa tarde|boa noite|hello|hi|oie|oii|oiii|fala|salve|eae)[\s!.?]*$/i,
  ];
  
  const isGreeting = greetingPatterns.some(p => p.test(lower));
  if (!isGreeting) {
    return { handled: false, response: null, routedBy: 'none', category: 'greeting' };
  }
  
  // Get business info for personalized greeting
  try {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: { businessName: true, businessCategory: true, aiTone: true },
    });
    
    if (!account) {
      return { handled: false, response: null, routedBy: 'none', category: 'greeting' };
    }
    
    const niche = account.businessCategory || 'beauty';
    const tone = account.aiTone || 'friendly';
    const greeting = getNicheGreeting(niche, tone, account.businessName);
    
    return {
      handled: true,
      response: greeting,
      routedBy: 'pre_router',
      category: 'greeting',
    };
  } catch {
    return { handled: false, response: null, routedBy: 'none', category: 'greeting' };
  }
}

/**
 * Check if the message is a simple confirmation (yes/no/ok)
 * These don't need LLM processing
 */
function checkConfirmation(lower: string): PreRouterResult {
  const confirmPatterns = [
    /^(sim|isso|claro|com certeza|exato|exatamente|isso mesmo|positivo|beleza|blz|blz|tá bom|ta bom|ok| ✓|yes|si)[\s!.?]*$/i,
  ];
  
  const isConfirm = confirmPatterns.some(p => p.test(lower));
  if (isConfirm) {
    return {
      handled: false, // Let LLM handle context-dependent confirmations
      response: null,
      routedBy: 'none',
      category: 'confirmation',
    };
  }
  
  const denyPatterns = [
    /^(não|nao|nop|negativo|de jeito nenhum|nenhum|nope)[\s!.?]*$/i,
  ];
  
  const isDeny = denyPatterns.some(p => p.test(lower));
  if (isDeny) {
    return {
      handled: false, // Let LLM handle context-dependent denials
      routedBy: 'none',
      response: null,
      category: 'denial',
    };
  }
  
  return { handled: false, response: null, routedBy: 'none', category: 'confirmation' };
}

/**
 * Get niche-specific greeting message
 */
function getNicheGreeting(niche: string, tone: string, businessName: string): string {
  const greetings: Record<string, Record<string, string>> = {
    barber: {
      casual: `E aí! 🙌 Bem-vindo(a) à ${businessName}! Sou o assistente virtual. Quer marcar um horário? É só me dizer! ✂️`,
      friendly: `E aí! 👊 ${businessName} na área! Quer agendar um horário? Tô aqui pra ajudar! ✂️`,
      professional: `Olá! Bem-vindo(a) à ${businessName}. Como posso ajudar hoje? Temos horários disponíveis para agendamento.`,
    },
    beauty: {
      casual: `Olá! 💕 Bem-vindo(a) ao ${businessName}! Quer agendar um horário? Tô aqui pra ajudar! ✨`,
      friendly: `Olá! 😊 Que bom te ver por aqui! No ${businessName} cuidamos de você! Quer agendar? 💅`,
      professional: `Olá! Bem-vindo(a) ao ${businessName}. Como posso ajudar hoje? Estamos prontos para agendar seu horário.`,
    },
    aesthetics: {
      casual: `Olá! 🌸 Bem-vindo(a) ao ${businessName}! Quer conhecer nossos tratamentos? Posso ajudar a agendar! ✨`,
      friendly: `Oi! 😊 Fico feliz em ajudar! No ${businessName} temos vários tratamentos. Quer agendar? 💆`,
      professional: `Olá! Bem-vindo(a) ao ${businessName}. Somos especializados em estética e bem-estar. Como posso ajudar?`,
    },
    dental: {
      casual: `Olá! 😊 Bem-vindo(a) ao ${businessName}! Posso ajudar a agendar uma consulta? 🦷`,
      friendly: `Oi! 😊 No ${businessName} cuidamos do seu sorriso! Quer agendar uma consulta? Estamos aqui pra ajudar! 🦷`,
      professional: `Olá! Bem-vindo(a) ao ${businessName}. Como posso ajudar? Gostaria de agendar uma consulta?`,
    },
  };
  
  const nicheGreetings = greetings[niche] || greetings.beauty;
  return nicheGreetings[tone] || nicheGreetings.friendly;
}
