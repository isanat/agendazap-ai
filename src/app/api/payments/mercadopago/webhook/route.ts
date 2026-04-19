import { NextRequest, NextResponse } from 'next/server'

/**
 * Mercado Pago Webhook Handler
 * 
 * This endpoint receives notifications from Mercado Pago when payment status changes.
 * 
 * Webhook events:
 * - payment: Payment status updates
 * - merchant_order: Order updates
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[Mercado Pago Webhook] Received notification:', body)

    const { type, data, action } = body

    // Handle different notification types
    switch (type) {
      case 'payment':
        await handlePaymentNotification(data.id, action)
        break
      
      case 'merchant_order':
        await handleMerchantOrderNotification(data.id)
        break
      
      default:
        console.log(`[Mercado Pago Webhook] Unhandled notification type: ${type}`)
    }

    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    console.error('[Mercado Pago Webhook] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Handle payment notification
 */
async function handlePaymentNotification(paymentId: string, action?: string) {
  console.log(`[Mercado Pago Webhook] Payment notification: ${paymentId}, action: ${action}`)

  // In production, you would:
  // 1. Fetch the payment details from Mercado Pago API
  // 2. Update your database with the new payment status
  // 3. Trigger any business logic (e.g., mark no-show fee as paid)
  
  // Example statuses:
  // - pending: Payment is pending
  // - approved: Payment was approved
  // - authorized: Payment is authorized but not captured
  // - in_process: Payment is under review
  // - in_mediation: Payment is in dispute
  // - rejected: Payment was rejected
  // - cancelled: Payment was cancelled
  // - refunded: Payment was refunded
  // - charged_back: Payment was charged back
  
  // For now, we just log the notification
  // In a real implementation, you would update the database:
  // await db.noShowFee.update({
  //   where: { paymentId },
  //   data: { 
  //     status: 'paid',
  //     paidAt: new Date()
  //   }
  // })
}

/**
 * Handle merchant order notification
 */
async function handleMerchantOrderNotification(orderId: string) {
  console.log(`[Mercado Pago Webhook] Merchant order notification: ${orderId}`)
  
  // In production, you would:
  // 1. Fetch the order details from Mercado Pago API
  // 2. Update your database with the order status
  // 3. Handle any order-related business logic
}

/**
 * Verify webhook signature (for security)
 */
function verifyWebhookSignature(request: NextRequest): boolean {
  const signature = request.headers.get('x-signature')
  const secret = process.env.MP_WEBHOOK_SECRET
  
  if (!signature || !secret) {
    // If no signature or secret configured, skip verification
    return true
  }
  
  // In production, verify the signature here
  // This prevents unauthorized requests from being processed
  return true
}
