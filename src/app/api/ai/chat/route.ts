import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateChatCompletion, canAccountUseAI, type ChatMessage } from '@/lib/ai-provider-service'
import { generateSystemPrompt } from '@/lib/ai-context-service'

// Store conversations in memory (in production, use Redis or database)
const conversations = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>()

// Get account info for context
async function getAccountInfo(accountId?: string) {
  if (!accountId) return undefined
  
  try {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: {
        businessName: true,
        businessType: true,
        instagram: true,
        address: true,
        addressCity: true,
        addressState: true,
        googleMapsUrl: true,
        description: true
      }
    })
    return account || undefined
  } catch {
    return undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message, context, accountId } = body

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Check if account can use AI
    const canUse = await canAccountUseAI(accountId)
    if (!canUse.allowed) {
      return NextResponse.json(
        { success: false, error: canUse.reason || 'AI not available for this account' },
        { status: 403 }
      )
    }

    // Get account info for personalized responses
    const accountInfo = await getAccountInfo(accountId)
    
    // Generate system prompt with full salon context
    // For now, we use a phone number from context or generate a session-based one
    const clientPhone = context?.phone || sessionId
    
    const SYSTEM_PROMPT = await generateSystemPrompt(accountId, clientPhone)

    // Get or create conversation history
    let history = conversations.get(sessionId) || []
    
    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT }
    ]
    
    // Add conversation history
    for (const msg of history) {
      messages.push(msg)
    }
    
    // Add context if provided (like client info, upcoming appointments)
    if (context?.extra) {
      messages.push({
        role: 'system',
        content: `Contexto adicional: ${context.extra}`
      })
    }
    
    // Add current user message
    messages.push({ role: 'user', content: message })

    // Get completion with fallback support (ZAI -> Groq)
    const result = await generateChatCompletion(accountId, messages)

    if (!result.success || !result.content) {
      console.error('[AI Chat] Generation failed:', result.error)
      
      // Provide a fallback response
      const fallbackResponse = getFallbackResponse(message, accountInfo)
      
      return NextResponse.json({
        success: true,
        response: fallbackResponse,
        provider: 'fallback',
        fallbackUsed: true,
        error: result.error,
        intent: detectIntent(message),
        entities: extractEntities(message)
      })
    }

    const aiResponse = result.content

    // Update conversation history
    history.push({ role: 'user', content: message })
    history.push({ role: 'assistant', content: aiResponse })
    
    // Keep only last 20 messages to avoid token limits
    if (history.length > 20) {
      history = history.slice(-20)
    }
    
    conversations.set(sessionId, history)

    // Detect intent from the message
    const intent = detectIntent(message)
    
    // Extract entities (dates, times, services)
    const entities = extractEntities(message)

    return NextResponse.json({
      success: true,
      response: aiResponse,
      provider: result.provider,
      tokens: result.totalTokens,
      intent,
      entities,
      messageCount: history.length,
      fallbackUsed: result.fallbackUsed
    })
  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Fallback response when AI fails
function getFallbackResponse(message: string, accountInfo?: { businessName?: string; address?: string | null }): string {
  const businessName = accountInfo?.businessName || 'nosso estabelecimento'
  const lowerMessage = message.toLowerCase()
  
  if (/agend|marcar|horário|reservar/.test(lowerMessage)) {
    return `Olá! 👋 Para agendar em ${businessName}, me diga qual serviço você gostaria e qual horário prefere!`
  }
  if (/preço|valor|quanto/.test(lowerMessage)) {
    return `Olá! Posso te informar sobre nossos serviços e valores. Qual serviço você gostaria de saber?`
  }
  if (/endereço|onde|localização/.test(lowerMessage)) {
    return `Estamos em ${accountInfo?.address || 'nossa localização'}. Como posso te ajudar?`
  }
  
  return `Olá! Sou a assistente virtual de ${businessName}. Como posso te ajudar hoje? 😊`
}

// Detect customer intent
function detectIntent(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('agendar') || lowerMessage.includes('marcar') || lowerMessage.includes('reservar')) {
    return 'schedule'
  }
  if (lowerMessage.includes('cancelar') || lowerMessage.includes('desmarcar')) {
    return 'cancel'
  }
  if (lowerMessage.includes('remarcar') || lowerMessage.includes('mudar') || lowerMessage.includes('alterar')) {
    return 'reschedule'
  }
  if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('quanto custa') || lowerMessage.includes('quanto é')) {
    return 'price'
  }
  if (lowerMessage.includes('horário') || lowerMessage.includes('disponível') || lowerMessage.includes('vaga')) {
    return 'availability'
  }
  if (lowerMessage.includes('endereço') || lowerMessage.includes('onde fica') || lowerMessage.includes('localização') || lowerMessage.includes('como chegar') || lowerMessage.includes('qual o endereço') || lowerMessage.includes('qual endereço')) {
    return 'address'
  }
  if (lowerMessage.includes('instagram') || lowerMessage.includes('@') || lowerMessage.includes('rede social') || lowerMessage.includes('facebook') || lowerMessage.includes('conhecer') || lowerMessage.includes('não conheço') || lowerMessage.includes('nao conheco') || lowerMessage.includes('primeira vez')) {
    return 'social'
  }
  if (lowerMessage.includes('obrigado') || lowerMessage.includes('valeu') || lowerMessage.includes('agradeço')) {
    return 'thanks'
  }
  if (lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('bom dia') || lowerMessage.includes('boa tarde') || lowerMessage.includes('boa noite')) {
    return 'greeting'
  }
  
  return 'general'
}

// Extract entities from message
function extractEntities(message: string): Record<string, string | undefined> {
  const entities: Record<string, string | undefined> = {}
  
  // Extract date patterns
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/g,
    /(hoje|amanhã|depois de amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo)/gi,
    /(próxim[oa] (dia|semana|mês))/gi
  ]
  
  for (const pattern of datePatterns) {
    const match = message.match(pattern)
    if (match) {
      entities.date = match[0]
      break
    }
  }
  
  // Extract time patterns
  const timeMatch = message.match(/(\d{1,2})[:h]?(\d{2})?(?:\s*(?:horas?|h))?/i)
  if (timeMatch) {
    entities.time = timeMatch[0]
  }
  
  // Extract service patterns
  const services = ['corte', 'barba', 'hidratação', 'manicure', 'pedicure', 'coloração', 'escova', 'penteado', 'maquiagem']
  for (const service of services) {
    if (message.toLowerCase().includes(service)) {
      entities.service = service
      break
    }
  }
  
  // Extract Instagram mention
  const instagramMatch = message.match(/@([\w.]+)/)
  if (instagramMatch) {
    entities.instagram = instagramMatch[0]
  }
  
  return entities
}

// Delete conversation history
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  
  if (sessionId) {
    conversations.delete(sessionId)
  }
  
  return NextResponse.json({ success: true, message: 'Conversation cleared' })
}

// Get conversation history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: 'Session ID is required' },
      { status: 400 }
    )
  }
  
  const history = conversations.get(sessionId) || []
  
  return NextResponse.json({
    success: true,
    history,
    messageCount: history.length
  })
}
