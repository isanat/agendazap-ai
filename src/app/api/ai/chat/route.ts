import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateChatCompletion, canAccountUseAI, type ChatMessage } from '@/lib/ai-provider-service'
import { generateSystemPrompt, findOrCreateClient, detectNameInMessage, updateClientName, detectPaymentPreference, updateClientPaymentPreference } from '@/lib/ai-context-service'

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
    const clientPhone = context?.phone || sessionId
    
    // Auto-create or find client
    const clientId = await findOrCreateClient(accountId, clientPhone, context?.pushName)
    
    // Detect name from message
    const detectedName = detectNameInMessage(message)
    if (detectedName) {
      await updateClientName(clientId, detectedName)
    }

    // Detect payment preference
    const detectedPayment = detectPaymentPreference(message)
    if (detectedPayment) {
      await updateClientPaymentPreference(clientId, detectedPayment)
    }

    const SYSTEM_PROMPT = await generateSystemPrompt(accountId, clientPhone)

    // Get conversation history from database (more reliable than in-memory)
    const dbMessages = await db.whatsappMessage.findMany({
      where: { accountId, clientPhone },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { direction: true, message: true }
    })
    
    const history: ChatMessage[] = dbMessages.reverse().map(m => ({
      role: m.direction === 'incoming' ? 'user' as const : 'assistant' as const,
      content: m.message || ''
    }))

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

    // Save conversation to database for persistence
    await db.whatsappMessage.create({
      data: {
        accountId,
        clientPhone,
        direction: 'incoming',
        message,
        messageType: 'text',
        status: 'received',
        metadata: { sessionId, detectedName: detectedName || undefined, detectedPayment: detectedPayment || undefined }
      }
    })

    await db.whatsappMessage.create({
      data: {
        accountId,
        clientPhone,
        direction: 'outgoing',
        message: aiResponse,
        messageType: 'text',
        status: 'sent',
        metadata: { sessionId, autoReply: true, provider: result.provider }
      }
    })

    // Update last AI interaction
    await db.client.update({
      where: { id: clientId },
      data: { lastAiInteraction: new Date() }
    })

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
      fallbackUsed: result.fallbackUsed,
      detectedName: detectedName || undefined,
      detectedPayment: detectedPayment || undefined
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
  
  return `Olá! Sou a Luna, assistente virtual de ${businessName}. Como posso te ajudar hoje? 😊`
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
  if (lowerMessage.includes('pagamento') || lowerMessage.includes('pagar') || lowerMessage.includes('pix') || lowerMessage.includes('cartão') || lowerMessage.includes('dinheiro')) {
    return 'payment'
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

  // Extract name from name patterns
  const nameMatch = detectNameInMessage(message)
  if (nameMatch) {
    entities.name = nameMatch
  }

  // Extract payment preference
  const paymentPref = detectPaymentPreference(message)
  if (paymentPref) {
    entities.paymentPreference = paymentPref
  }
  
  return entities
}

// Delete conversation history
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const accountId = searchParams.get('accountId')
  const clientPhone = searchParams.get('clientPhone')
  
  if (clientPhone && accountId) {
    // Delete from database
    await db.whatsappMessage.deleteMany({
      where: { accountId, clientPhone }
    })
  }
  
  return NextResponse.json({ success: true, message: 'Conversation cleared' })
}

// Get conversation history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const accountId = searchParams.get('accountId')
  const clientPhone = searchParams.get('clientPhone')
  
  if (!accountId || !clientPhone) {
    return NextResponse.json(
      { success: false, error: 'Account ID and clientPhone are required' },
      { status: 400 }
    )
  }
  
  const messages = await db.whatsappMessage.findMany({
    where: { accountId, clientPhone },
    orderBy: { createdAt: 'asc' },
    select: { direction: true, message: true, createdAt: true }
  })

  const history = messages.map(m => ({
    role: m.direction === 'incoming' ? 'user' : 'assistant',
    content: m.message,
    timestamp: m.createdAt
  }))
  
  return NextResponse.json({
    success: true,
    history,
    messageCount: history.length
  })
}
