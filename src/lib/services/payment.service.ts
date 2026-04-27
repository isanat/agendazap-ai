/**
 * Payment Service - PIX and payment operations
 * Currently a pass-through to webhook functions.
 * Will be expanded in Sprint 2 with tool calling support.
 */

// Payment service functions will be fully extracted in Sprint 2
// when we implement tool calling. For now, this provides
// the interface and types for future extraction.

export interface PixPaymentData {
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  deepLink?: string;
}

export interface PaymentServiceResult {
  success: boolean;
  error?: string;
  pixData?: PixPaymentData;
}

// The actual PIX generation (generatePixPayment) and sending (sendPixPaymentMessage)
// are still in the webhook route for now, as they have deep integration with
// Evolution API sending. They will be extracted here in Sprint 2.
