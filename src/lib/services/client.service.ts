/**
 * Client Service - Client management operations
 * Re-exports from ai-context-service.ts for cleaner imports
 * Will be expanded in Sprint 2 with tool calling support
 */

export {
  findOrCreateClient,
  updateClientName,
  updateClientPaymentPreference,
  updateClientCpf,
  updateClientBirthDate,
  updateClientAiNotes,
  updateServiceHistory,
  detectNameInMessage,
  detectCpfInMessage,
  detectBirthDateInMessage,
  detectPaymentPreference,
  detectPhoneNumberInMessage,
  getClientContext,
} from '@/lib/ai-context-service';
