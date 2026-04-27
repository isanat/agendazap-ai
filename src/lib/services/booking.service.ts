/**
 * Booking Service - Handles all appointment booking operations
 * Extracted from webhook route.ts for cleaner architecture
 */

import { db } from '@/lib/db';
import { validateBooking, getBookingErrorMessage, getSalonTimezone, createDateInSalonTz, type BookingValidationResult } from '@/lib/booking-validation';
import { updateServiceHistory } from '@/lib/ai-context-service';

// Types
export interface BookingCommand {
  serviceName: string;
  professionalName: string;
  date: string;
  time: string;
  paymentMethod: string;
}

export interface CancelCommand {
  appointmentShortId: string;
}

export interface RescheduleCommand {
  appointmentShortId: string;
  date: string;
  time: string;
}

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  appointmentIds?: string[];
  error?: string;
  pixData?: { qrCode?: string; qrCodeBase64?: string; ticketUrl?: string; deepLink?: string };
  isPackage?: boolean;
  validationErrors?: BookingValidationResult;
}

// Parse [AGENDAR:serviceName:professionalName:YYYY-MM-DD:HH:mm:paymentMethod]
export function parseBookingCommand(aiResponse: string): {
  cleanedResponse: string;
  booking: BookingCommand | null;
} {
  const bookingRegex = /\[AGENDAR:([^:]+):([^:]+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2}):([^\]]+)\]/;
  const match = aiResponse.match(bookingRegex);
  
  if (!match) {
    return { cleanedResponse: aiResponse, booking: null };
  }
  
  const booking: BookingCommand = {
    serviceName: match[1].trim(),
    professionalName: match[2].trim(),
    date: match[3].trim(),
    time: match[4].trim(),
    paymentMethod: match[5].trim(),
  };
  
  const cleanedResponse = aiResponse.replace(bookingRegex, '').trim();
  return { cleanedResponse, booking };
}

// Parse [CANCELAR:appointmentShortId]
export function parseCancelCommand(aiResponse: string): {
  cleanedResponse: string;
  cancel: CancelCommand | null;
} {
  const cancelRegex = /\[CANCELAR:([a-f0-9]{8})\]/i;
  const match = aiResponse.match(cancelRegex);
  
  if (!match) {
    return { cleanedResponse: aiResponse, cancel: null };
  }
  
  const cancel: CancelCommand = {
    appointmentShortId: match[1].trim().toLowerCase(),
  };
  
  const cleanedResponse = aiResponse.replace(cancelRegex, '').trim();
  return { cleanedResponse, cancel };
}

// Parse [REAGENDAR:appointmentShortId:YYYY-MM-DD:HH:mm]
export function parseRescheduleCommand(aiResponse: string): {
  cleanedResponse: string;
  reschedule: RescheduleCommand | null;
} {
  const rescheduleRegex = /\[REAGENDAR:([a-f0-9]{8}):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})\]/i;
  const match = aiResponse.match(rescheduleRegex);
  
  if (!match) {
    return { cleanedResponse: aiResponse, reschedule: null };
  }
  
  const reschedule: RescheduleCommand = {
    appointmentShortId: match[1].trim().toLowerCase(),
    date: match[2].trim(),
    time: match[3].trim(),
  };
  
  const cleanedResponse = aiResponse.replace(rescheduleRegex, '').trim();
  return { cleanedResponse, reschedule };
}

// Cancel appointment by short ID
export async function cancelAppointment(
  accountId: string,
  clientId: string,
  shortId: string
): Promise<{ success: boolean; error?: string; appointmentInfo?: string }> {
  try {
    const appointment = await db.appointment.findFirst({
      where: {
        id: { startsWith: shortId },
        clientId,
        accountId,
        status: { in: ['scheduled', 'confirmed', 'pending'] },
      },
      include: { Service: true, Professional: true },
    });
    
    if (!appointment) {
      return { success: false, error: 'Agendamento não encontrado ou já cancelado.' };
    }
    
    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: 'Cancelado pelo cliente via WhatsApp',
      },
    });
    
    const info = `${appointment.Service?.name || 'Serviço'} com ${appointment.Professional?.name || 'profissional'} em ${appointment.datetime.toLocaleDateString('pt-BR')} às ${appointment.datetime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    
    console.log(`[Booking] ✅ Appointment cancelled: ${appointment.id} - ${info}`);
    return { success: true, appointmentInfo: info };
  } catch (error) {
    console.error(`[Booking] ❌ Error cancelling appointment:`, error);
    return { success: false, error: 'Erro ao cancelar agendamento. Tente novamente.' };
  }
}

// Reschedule appointment by short ID
export async function rescheduleAppointment(
  accountId: string,
  clientId: string,
  shortId: string,
  newDate: string,
  newTime: string
): Promise<{ success: boolean; error?: string; appointmentInfo?: string; validationErrors?: BookingValidationResult }> {
  try {
    const appointment = await db.appointment.findFirst({
      where: {
        id: { startsWith: shortId },
        clientId,
        accountId,
        status: { in: ['scheduled', 'confirmed', 'pending'] },
      },
      include: { Service: true, Professional: true },
    });
    
    if (!appointment) {
      return { success: false, error: 'Agendamento não encontrado ou já cancelado.' };
    }
    
    const serviceName = appointment.Service?.name || '';
    const professionalName = appointment.Professional?.name || '';
    const paymentMethod = appointment.pixId ? 'pix' : 'in_person';
    
    const validation = await validateBooking({
      accountId,
      serviceName,
      professionalName,
      date: newDate,
      time: newTime,
      paymentMethod,
      clientId,
      excludeAppointmentId: appointment.id,
    });
    
    if (!validation.valid) {
      const errorMsg = getBookingErrorMessage(validation);
      return { success: false, error: errorMsg, validationErrors: validation };
    }
    
    const salonTimezone = validation.salonTimezone || 'America/Sao_Paulo';
    const newDatetime = createDateInSalonTz(newDate, newTime, salonTimezone);
    const service = appointment.Service;
    const duration = service?.durationMinutes || 30;
    const newEndTime = new Date(newDatetime.getTime() + duration * 60000);
    
    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        datetime: newDatetime,
        endTime: newEndTime,
        status: 'confirmed',
      },
    });
    
    const info = `${serviceName} com ${professionalName} reagendado para ${newDate} às ${newTime}`;
    console.log(`[Booking] ✅ Appointment rescheduled: ${appointment.id} - ${info}`);
    return { success: true, appointmentInfo: info };
  } catch (error) {
    console.error(`[Booking] ❌ Error rescheduling appointment:`, error);
    return { success: false, error: 'Erro ao reagendar. Tente novamente.' };
  }
}

// NOTE: createAppointmentFromBooking is kept in webhook for now because it has
// deep integration with PIX generation. It will be fully extracted in Sprint 2
// when we implement tool calling.
