import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decryptCredentials } from '@/app/api/integrations/route'

/**
 * Mercado Pago Webhook Handler
 * 
 * Receives notifications from Mercado Pago when payment status changes.
 * Automatically confirms appointments when PIX payments are approved.
 * 
 * Webhook URL: https://agendazap-ai.vercel.app/api/payments/mercadopago/webhook
 * 
 * To configure: Add this URL in Mercado Pago Developers panel → Webhooks
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[MP Webhook] Received notification:', JSON.stringify(body).substring(0, 500))

    const { type, action, data } = body

    // Handle different notification types
    switch (type) {
      case 'payment':
        await handlePaymentNotification(data?.id, action)
        break
      
      case 'merchant_order':
        await handleMerchantOrderNotification(data?.id)
        break
      
      default:
        console.log(`[MP Webhook] Unhandled notification type: ${type}`)
    }

    // Always return 200 quickly so MP doesn't retry
    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    console.error('[MP Webhook] Error:', error)
    // Still return 200 to prevent MP retries on our errors
    return NextResponse.json({ success: true, received: true })
  }
}

/**
 * Handle payment notification from Mercado Pago
 * When a PIX payment is approved, find the associated appointment and confirm it
 */
async function handlePaymentNotification(paymentId: string | number | undefined, action?: string) {
  if (!paymentId) {
    console.warn('[MP Webhook] No payment ID in notification')
    return
  }

  const mpPaymentId = String(paymentId)
  console.log(`[MP Webhook] Payment notification: MP ID ${mpPaymentId}, action: ${action}`)

  try {
    // Find the appointment by the Mercado Pago payment ID (stored in pixId field)
    const appointment = await db.appointment.findFirst({
      where: { pixId: mpPaymentId },
      include: {
        Account: { select: { id: true, businessName: true } },
        Client: { select: { id: true, name: true, phone: true } },
        Service: { select: { id: true, name: true, price: true } },
        Professional: { select: { id: true, name: true } },
      }
    })

    if (!appointment) {
      // Try to find by external_reference pattern (appointment_{id})
      console.log(`[MP Webhook] No appointment found with pixId ${mpPaymentId}, trying API lookup...`)
      
      // Fetch payment details from MP API to get external_reference
      const paymentDetails = await fetchPaymentDetails(mpPaymentId)
      if (paymentDetails?.external_reference?.startsWith('appointment_')) {
        const appointmentId = paymentDetails.external_reference.replace('appointment_', '')
        const refAppointment = await db.appointment.findUnique({
          where: { id: appointmentId },
          include: {
            Account: { select: { id: true, businessName: true } },
            Client: { select: { id: true, name: true, phone: true } },
            Service: { select: { id: true, name: true, price: true } },
            Professional: { select: { id: true, name: true } },
          }
        })
        
        if (refAppointment) {
          // Update the pixId for future lookups
          await db.appointment.update({
            where: { id: appointmentId },
            data: { pixId: mpPaymentId }
          })
          await processPaymentUpdate(refAppointment, paymentDetails.status, mpPaymentId)
          return
        }
      }
      
      // Check no-show fees
      const noShowFee = await db.noShowFee.findFirst({
        where: { pixId: mpPaymentId },
        include: {
          Appointment: {
            include: {
              Client: { select: { id: true, name: true, phone: true } },
            }
          }
        }
      })
      
      if (noShowFee) {
        await processNoShowFeePayment(noShowFee, mpPaymentId)
        return
      }
      
      console.log(`[MP Webhook] No matching appointment or no-show fee found for payment ${mpPaymentId}`)
      return
    }

    // Fetch current payment details from MP API
    const paymentDetails = await fetchPaymentDetails(mpPaymentId)
    if (paymentDetails) {
      await processPaymentUpdate(appointment, paymentDetails.status, mpPaymentId)
    } else {
      // If we can't fetch details, assume approved if we have a notification
      // (MP only sends payment notifications when status changes)
      if (!appointment.pixPaid) {
        console.log(`[MP Webhook] Cannot fetch payment details, but received notification for ${mpPaymentId}. Marking as paid.`)
        await processPaymentUpdate(appointment, 'approved', mpPaymentId)
      }
    }
  } catch (error) {
    console.error(`[MP Webhook] Error processing payment notification for ${mpPaymentId}:`, error)
  }
}

/**
 * Process a payment status update for an appointment
 */
async function processPaymentUpdate(
  appointment: {
    id: string;
    status: string;
    pixPaid: boolean;
    pixId: string | null;
    Account: { id: string; businessName: string };
    Client: { id: string; name: string; phone: string };
    Service: { id: string; name: string; price: number };
    Professional: { id: string; name: string };
  },
  mpStatus: string,
  mpPaymentId: string
) {
  const statusMap: Record<string, string> = {
    'approved': 'approved',
    'authorized': 'approved',
    'pending': 'pending',
    'in_process': 'in_process',
    'in_mediation': 'in_mediation',
    'rejected': 'rejected',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'charged_back': 'charged_back',
  }

  const mappedStatus = statusMap[mpStatus] || mpStatus
  console.log(`[MP Webhook] Payment ${mpPaymentId} status: ${mpStatus} → ${mappedStatus} for appointment ${appointment.id}`)

  if (mappedStatus === 'approved' && !appointment.pixPaid) {
    // PIX payment approved! Confirm the appointment
    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        pixPaid: true,
        pixPaidAt: new Date(),
        status: 'confirmed',
        confirmedAt: new Date(),
        pixId: mpPaymentId,
      }
    })

    console.log(`[MP Webhook] ✅ Appointment ${appointment.id} CONFIRMED - PIX payment approved!`)

    // Send WhatsApp notification to client
    try {
      await sendWhatsAppPaymentConfirmation(
        appointment.Account.id,
        appointment.Client.phone,
        appointment.Client.name,
        appointment.Service.name,
        appointment.Professional.name,
        appointment.Service.price
      )
    } catch (sendError) {
      console.error(`[MP Webhook] Failed to send payment confirmation WhatsApp:`, sendError)
      // Don't fail the webhook - payment was still processed
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        appointmentId: appointment.id,
        action: 'pix_payment_confirmed',
        details: `PIX payment ${mpPaymentId} approved. Amount: R$ ${appointment.Service.price.toFixed(2)}`,
      }
    }).catch(() => {}) // Don't fail if audit log fails

  } else if (mappedStatus === 'rejected' || mappedStatus === 'cancelled') {
    console.log(`[MP Webhook] ❌ Payment ${mpPaymentId} was ${mappedStatus} for appointment ${appointment.id}`)
    // Optionally notify the client that payment failed
  } else if (mappedStatus === 'refunded') {
    // Mark as not paid if refunded
    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        pixPaid: false,
        pixPaidAt: null,
        status: 'pending',
      }
    }).catch(() => {})
    console.log(`[MP Webhook] 💸 Payment ${mpPaymentId} was REFUNDED for appointment ${appointment.id}`)
  }
}

/**
 * Process a no-show fee payment
 */
async function processNoShowFeePayment(
  noShowFee: {
    id: string;
    paid: boolean;
    pixId: string | null;
    Appointment: {
      Client: { id: string; name: string; phone: string };
    };
  },
  mpPaymentId: string
) {
  await db.noShowFee.update({
    where: { id: noShowFee.id },
    data: {
      paid: true,
      paidAt: new Date(),
      pixId: mpPaymentId,
    }
  })
  console.log(`[MP Webhook] ✅ No-show fee ${noShowFee.id} marked as PAID`)
}

/**
 * Fetch payment details from Mercado Pago API
 */
async function fetchPaymentDetails(paymentId: string): Promise<{
  id: string;
  status: string;
  status_detail: string;
  external_reference?: string;
  transaction_amount?: number;
} | null> {
  try {
    // Find any connected MP integration to get access token
    const integration = await db.integration.findFirst({
      where: { type: 'mercadopago', status: 'connected' }
    })

    if (!integration) {
      console.log('[MP Webhook] No MP integration found to fetch payment details')
      return null
    }

    const credentials = decryptCredentials(integration.credentials)
    const accessToken = credentials.accessToken as string

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[MP Webhook] Error fetching payment ${paymentId}: ${response.status} - ${error.substring(0, 200)}`)
      return null
    }

    const data = await response.json()
    return {
      id: String(data.id),
      status: data.status,
      status_detail: data.status_detail,
      external_reference: data.external_reference,
      transaction_amount: data.transaction_amount,
    }
  } catch (error) {
    console.error('[MP Webhook] Error fetching payment details:', error)
    return null
  }
}

/**
 * Send WhatsApp payment confirmation message via Evolution API
 */
async function sendWhatsAppPaymentConfirmation(
  accountId: string,
  clientPhone: string,
  clientName: string,
  serviceName: string,
  professionalName: string,
  price: number
): Promise<void> {
  try {
    // Get Evolution API config from SystemConfiguration
    const systemConfig = await db.systemConfiguration.findFirst()
    if (!systemConfig?.evolutionApiUrl || !systemConfig?.evolutionApiKey) {
      console.warn('[MP Webhook] Evolution API not configured, cannot send WhatsApp notification')
      return
    }

    // Get WhatsApp integration for instance name
    const whatsappIntegration = await db.integration.findUnique({
      where: { accountId_type: { accountId, type: 'whatsapp' } }
    })
    if (!whatsappIntegration) {
      console.warn('[MP Webhook] WhatsApp integration not found for account', accountId)
      return
    }

    const credentials = typeof whatsappIntegration.credentials === 'string'
      ? JSON.parse(whatsappIntegration.credentials)
      : whatsappIntegration.credentials
    const instanceName = credentials.instanceName
    if (!instanceName) {
      console.warn('[MP Webhook] Instance name not found')
      return
    }

    const message = `✅ Pagamento PIX confirmado, ${clientName}!\n\n` +
      `Seu agendamento está confirmado:\n` +
      `📅 ${serviceName}\n` +
      `👨‍🦱 Profissional: ${professionalName}\n` +
      `💰 Valor: R$ ${price.toFixed(2)}\n\n` +
      `Te esperamos! 😊`

    const formattedPhone = clientPhone.replace(/\D/g, '')
    
    const response = await fetch(`${systemConfig.evolutionApiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': systemConfig.evolutionApiKey,
      },
      body: JSON.stringify({
        number: formattedPhone.includes('@') ? formattedPhone : `${formattedPhone}@s.whatsapp.net`,
        options: { delay: 1000, presence: 'composing' },
        textMessage: { text: message },
      }),
    })

    if (response.ok) {
      console.log(`[MP Webhook] 📤 Payment confirmation sent to ${clientPhone}`)
    } else {
      const errorText = await response.text()
      console.error(`[MP Webhook] Failed to send WhatsApp message: ${response.status} - ${errorText.substring(0, 200)}`)
    }
  } catch (error) {
    console.error('[MP Webhook] Error sending WhatsApp notification:', error)
  }
}

/**
 * Handle merchant order notification
 */
async function handleMerchantOrderNotification(orderId: string | number | undefined) {
  console.log(`[MP Webhook] Merchant order notification: ${orderId}`)
  // Not commonly used for PIX payments, but logged for future implementation
}
