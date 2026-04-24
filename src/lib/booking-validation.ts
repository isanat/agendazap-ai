/**
 * Booking Validation Service
 * 
 * Validates appointment booking data BEFORE creating the appointment:
 * - Service exists and is active
 * - Professional exists, is active, and offers the requested service
 * - Time is within business hours (salon + professional)
 * - Day is a working day (not closed, not a holiday)
 * - No conflicts with existing appointments
 * - Timezone-aware: uses the salon's explicit timezone, NOT the server's
 */

import { db } from '@/lib/db';

// === TYPES ===

export interface BookingValidationRequest {
  accountId: string;
  serviceName: string;
  professionalName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  paymentMethod: string;
  clientId?: string;
  excludeAppointmentId?: string; // For rescheduling: exclude this appointment from conflict check
}

export interface BookingValidationResult {
  valid: boolean;
  errors: BookingValidationError[];
  warnings: string[];
  // Resolved data (available when validation passes)
  serviceId?: string;
  professionalId?: string;
  datetime?: Date;
  endTime?: Date;
  price?: number;
  serviceDuration?: number;
  salonTimezone?: string;
}

export interface BookingValidationError {
  field: string;
  message: string;
  userMessage: string; // Message to show the WhatsApp client
  code: string;
}

// === TIMEZONE UTILITIES ===

/**
 * Get the salon's timezone from the Account record.
 * Defaults to "America/Sao_Paulo" if not set.
 */
export async function getSalonTimezone(accountId: string): Promise<string> {
  try {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: { timezone: true }
    });
    return account?.timezone || 'America/Sao_Paulo';
  } catch (error) {
    // Column might not exist yet during schema migration
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('does not exist')) {
      console.warn('[getSalonTimezone] timezone column not yet migrated, using default');
      return 'America/Sao_Paulo';
    }
    throw error;
  }
}

/**
 * Create a Date object in the salon's timezone.
 * This avoids relying on the server's timezone.
 * 
 * Example: createDateInSalonTz("2026-04-24", "14:00", "America/Sao_Paulo")
 * Returns a Date object representing 14:00 in São Paulo timezone.
 */
export function createDateInSalonTz(date: string, time: string, timezone: string): Date {
  // Use Intl.DateTimeFormat to get the offset for the salon's timezone on the given date
  // This handles DST correctly
  
  // First, try the native approach: create an ISO string with the timezone
  // Unfortunately, JavaScript Date doesn't support arbitrary timezone in constructor
  // So we use the approach: create a UTC date, then adjust by the timezone offset
  
  const tempDate = new Date(`${date}T${time}:00`);
  
  // Get the timezone offset for the salon's timezone at this specific date/time
  // This handles DST transitions correctly
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // Format the date in the salon's timezone to verify it matches
  const parts = formatter.formatToParts(tempDate);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  // Create a date that, when formatted in the salon's timezone, gives us the desired date/time
  // We do this by creating the target as if it were UTC, then adjusting
  const targetInSalonTz = new Date(
    Date.UTC(
      parseInt(date.substring(0, 4)),
      parseInt(date.substring(5, 7)) - 1,
      parseInt(date.substring(8, 10)),
      parseInt(time.substring(0, 2)),
      parseInt(time.substring(3, 5)),
      0
    )
  );
  
  // Get the difference between UTC and the salon timezone at this moment
  // This tells us how many minutes to add/subtract
  const salonFormatted = formatter.format(targetInSalonTz);
  const salonParts = formatter.formatToParts(targetInSalonTz);
  
  // Extract the actual salon time from the formatted output
  const salonHour = parseInt(getPartValue(salonParts, 'hour'));
  const salonMinute = parseInt(getPartValue(salonParts, 'minute'));
  const targetHour = parseInt(time.substring(0, 2));
  const targetMinute = parseInt(time.substring(3, 5));
  
  // Calculate the offset (difference between what we put in UTC and what the salon sees)
  const offsetMinutes = (salonHour * 60 + salonMinute) - (targetHour * 60 + targetMinute);
  
  // Adjust the UTC date by the offset to get the correct time in the salon's timezone
  const adjustedDate = new Date(targetInSalonTz.getTime() - offsetMinutes * 60 * 1000);
  
  return adjustedDate;
}

function getPartValue(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find(p => p.type === type)?.value || '0';
}

/**
 * Get current date/time in the salon's timezone
 * Returns formatted strings for use in prompts and validation
 */
export function getNowInSalonTz(timezone: string): {
  now: Date;
  dateStr: string; // DD/MM/YYYY
  timeStr: string; // HH:mm
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  dayName: string; // Portuguese abbreviation
  isoDate: string; // YYYY-MM-DD
} {
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const weekday = getPart('weekday');
  
  // Map Portuguese weekday abbreviations to day numbers
  const dayMap: Record<string, number> = {
    'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sáb': 6,
    'Dom': 0, 'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sáb': 6,
  };
  
  const dayOfWeek = dayMap[weekday] ?? now.getDay();
  
  return {
    now,
    dateStr: `${day}/${month}/${year}`,
    timeStr: `${hour}:${minute}`,
    dayOfWeek,
    dayName: weekday || ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek],
    isoDate: `${year}-${month}-${day}`,
  };
}

/**
 * Parse working days string (e.g., "1,2,3,4,5") into array of day numbers
 */
function parseWorkingDays(workingDays: string | null): number[] {
  if (!workingDays) return [1, 2, 3, 4, 5]; // Default: Mon-Fri
  return workingDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 0 && d <= 6);
}

/**
 * Parse time string (e.g., "09:00") into minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// === MAIN VALIDATION FUNCTION ===

/**
 * Validate a booking request before creating an appointment.
 * 
 * This is the single entry point for all booking validation.
 * It checks:
 * 1. Service exists and is active
 * 2. Professional exists, is active, and offers the service
 * 3. Date/time is valid (not in the past)
 * 4. Day is a working day for both salon and professional
 * 5. Time is within business hours for both salon and professional
 * 6. Not a holiday
 * 7. No scheduling conflicts
 * 8. Timezone is handled correctly
 * 
 * Returns a detailed validation result with errors and resolved data.
 */
export async function validateBooking(
  request: BookingValidationRequest
): Promise<BookingValidationResult> {
  const errors: BookingValidationError[] = [];
  const warnings: string[] = [];
  
  // === STEP 0: Get salon context ===
  let account: { timezone: string | null; openingTime: string; closingTime: string; workingDays: string | null } | null = null;
  try {
    account = await db.account.findUnique({
      where: { id: request.accountId },
      select: {
        timezone: true,
        openingTime: true,
        closingTime: true,
        workingDays: true,
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('does not exist')) {
      console.warn('[validateBooking] Schema not fully migrated, querying without timezone');
      account = await db.account.findUnique({
        where: { id: request.accountId },
        select: {
          openingTime: true,
          closingTime: true,
          workingDays: true,
        }
      }) as any;
    } else {
      throw error;
    }
  }
  
  const salonTimezone = account?.timezone || 'America/Sao_Paulo';
  const salonOpeningTime = account?.openingTime || '09:00';
  const salonClosingTime = account?.closingTime || '18:00';
  const salonWorkingDays = parseWorkingDays(account?.workingDays || null);
  
  // === STEP 1: Validate service ===
  // Try exact match first, then contains (case-insensitive)
  let foundService = await db.service.findFirst({
    where: {
      accountId: request.accountId,
      name: { equals: request.serviceName, mode: 'insensitive' },
      isActive: true,
    }
  });
  
  if (!foundService) {
    foundService = await db.service.findFirst({
      where: {
        accountId: request.accountId,
        name: { contains: request.serviceName, mode: 'insensitive' },
        isActive: true,
      }
    });
  }
  
  // Try multi-service split (e.g., "Corte + Barba" or "Corte e Barba")
  let isMultiService = false;
  let foundServices: any[] = [];
  
  if (!foundService) {
    const separatorMatch = request.serviceName.match(/\s*[+&]\s*|\s+e\s+/i);
    if (separatorMatch) {
      const parts = request.serviceName.split(/\s*[+&]\s*|\s+e\s+/i).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        for (const part of parts) {
          let svc = await db.service.findFirst({
            where: { accountId: request.accountId, name: { equals: part, mode: 'insensitive' }, isActive: true }
          });
          if (!svc) {
            svc = await db.service.findFirst({
              where: { accountId: request.accountId, name: { contains: part, mode: 'insensitive' }, isActive: true }
            });
          }
          if (svc) foundServices.push(svc);
        }
        if (foundServices.length === parts.length) {
          isMultiService = true;
        } else {
          foundServices = []; // Reset - not all services found
        }
      }
    }
  }
  
  // Check if it matches a package
  let foundPackage = await db.package.findFirst({
    where: {
      accountId: request.accountId,
      name: { equals: request.serviceName, mode: 'insensitive' },
      isActive: true,
    },
    include: { packageServices: { include: { Service: true } } }
  });
  
  if (!foundPackage) {
    foundPackage = await db.package.findFirst({
      where: {
        accountId: request.accountId,
        name: { contains: request.serviceName, mode: 'insensitive' },
        isActive: true,
      },
      include: { packageServices: { include: { Service: true } } }
    });
  }
  
  if (!foundService && !isMultiService && !foundPackage) {
    const availableServices = await db.service.findMany({
      where: { accountId: request.accountId, isActive: true },
      select: { name: true }
    });
    const availablePackages = await db.package.findMany({
      where: { accountId: request.accountId, isActive: true },
      select: { name: true }
    });
    
    console.error(`[Booking Validation] Service not found: "${request.serviceName}". Available: ${availableServices.map(s => s.name).join(', ')}. Packages: ${availablePackages.map(p => p.name).join(', ')}`);
    
    errors.push({
      field: 'service',
      message: `Service not found: ${request.serviceName}`,
      userMessage: `Não encontrei o serviço "${request.serviceName}" no nosso catálogo. Os serviços disponíveis são: ${availableServices.slice(0, 8).map(s => s.name).join(', ')}${availablePackages.length > 0 ? `. Pacotes: ${availablePackages.map(p => p.name).join(', ')}` : ''}. Qual você deseja?`,
      code: 'SERVICE_NOT_FOUND',
    });
  }
  
  // === STEP 2: Validate professional ===
  let foundProfessional = await db.professional.findFirst({
    where: {
      accountId: request.accountId,
      name: { equals: request.professionalName, mode: 'insensitive' },
      isActive: true,
    },
    include: {
      ServiceProfessional: {
        include: { Service: true }
      }
    }
  });
  
  if (!foundProfessional) {
    foundProfessional = await db.professional.findFirst({
      where: {
        accountId: request.accountId,
        name: { contains: request.professionalName, mode: 'insensitive' },
        isActive: true,
      },
      include: {
        ServiceProfessional: {
          include: { Service: true }
        }
      }
    });
  }
  
  if (!foundProfessional) {
    const allProfs = await db.professional.findMany({
      where: { accountId: request.accountId, isActive: true },
      select: { name: true }
    });
    
    errors.push({
      field: 'professional',
      message: `Professional not found: ${request.professionalName}`,
      userMessage: `Não encontrei o profissional "${request.professionalName}" em nossa equipe. Profissionais disponíveis: ${allProfs.map(p => p.name).join(', ')}. Com quem gostaria de agendar?`,
      code: 'PROFESSIONAL_NOT_FOUND',
    });
  }
  
  // Check if professional offers the requested service
  if (foundProfessional && (foundService || isMultiService)) {
    const profServiceNames = foundProfessional.ServiceProfessional?.map((sp: any) => sp.Service?.name).filter(Boolean) || [];
    
    if (isMultiService) {
      // For multi-service bookings, check if the professional offers ALL services
      const missingServices = foundServices.filter(s => !profServiceNames.some((name: string) => 
        name.toLowerCase() === s.name.toLowerCase()
      ));
      
      if (missingServices.length > 0 && profServiceNames.length > 0) {
        warnings.push(`Professional "${foundProfessional.name}" may not offer: ${missingServices.map(s => s.name).join(', ')}. Available services: ${profServiceNames.join(', ')}`);
      }
    } else if (foundService) {
      const hasService = profServiceNames.some((name: string) => 
        name.toLowerCase() === foundService!.name.toLowerCase()
      );
      
      if (!hasService && profServiceNames.length > 0) {
        // Professional doesn't offer this service - but don't block, just warn
        // Some salons allow any professional to do any service
        warnings.push(`Professional "${foundProfessional.name}" may not offer "${foundService.name}". Their services: ${profServiceNames.join(', ')}`);
      }
    }
  }
  
  // === STEP 3: Validate date/time format and timezone ===
  const datetime = createDateInSalonTz(request.date, request.time, salonTimezone);
  
  if (isNaN(datetime.getTime())) {
    errors.push({
      field: 'datetime',
      message: `Invalid datetime: ${request.date}T${request.time}`,
      userMessage: `A data/hora informada parece inválida. Pode confirmar qual data e horário você deseja?`,
      code: 'INVALID_DATETIME',
    });
  }
  
  // Check if the appointment is in the past
  if (!isNaN(datetime.getTime())) {
    const nowInSalonTz = getNowInSalonTz(salonTimezone);
    if (datetime.getTime() < nowInSalonTz.now.getTime() - 5 * 60 * 1000) { // 5 min tolerance
      errors.push({
        field: 'datetime',
        message: `Appointment time is in the past: ${request.date}T${request.time} (${salonTimezone})`,
        userMessage: `O horário solicitado já passou. Gostaria de agendar para outro horário? Estamos em ${nowInSalonTz.dateStr} às ${nowInSalonTz.timeStr}.`,
        code: 'PAST_DATETIME',
      });
    }
  }
  
  // === STEP 4: Validate business hours ===
  if (!isNaN(datetime.getTime())) {
    const salonNow = getNowInSalonTz(salonTimezone);
    const appointmentDayOfWeek = datetime.getDay();
    
    // 4a: Check salon working days
    if (!salonWorkingDays.includes(appointmentDayOfWeek)) {
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      errors.push({
        field: 'businessHours',
        message: `Salon is closed on day ${appointmentDayOfWeek} (${dayNames[appointmentDayOfWeek]})`,
        userMessage: `Estamos fechados no ${dayNames[appointmentDayOfWeek]}. Funcionamos de ${salonWorkingDays.map(d => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}. Qual outro dia funciona para você?`,
        code: 'SALON_CLOSED_DAY',
      });
    }
    
    // 4b: Check salon working hours
    if (salonWorkingDays.includes(appointmentDayOfWeek)) {
      const appointmentTimeMinutes = parseTimeToMinutes(request.time);
      const salonOpenMinutes = parseTimeToMinutes(salonOpeningTime);
      const salonCloseMinutes = parseTimeToMinutes(salonClosingTime);
      
      if (appointmentTimeMinutes < salonOpenMinutes || appointmentTimeMinutes >= salonCloseMinutes) {
        errors.push({
          field: 'businessHours',
          message: `Time ${request.time} is outside salon hours (${salonOpeningTime}-${salonClosingTime})`,
          userMessage: `Nosso horário de funcionamento é das ${salonOpeningTime} às ${salonClosingTime}. O horário solicitado (${request.time}) está fora desse período. Qual horário dentro do nosso funcionamento funciona para você?`,
          code: 'OUTSIDE_SALON_HOURS',
        });
      }
      
      // Also check if the appointment END time exceeds closing time
      const serviceDuration = foundService?.durationMinutes || 
        (isMultiService ? foundServices.reduce((sum, s) => sum + s.durationMinutes, 0) : 30);
      const endTimeMinutes = appointmentTimeMinutes + serviceDuration;
      
      if (endTimeMinutes > salonCloseMinutes && errors.length === 0) {
        // Only warn if no other errors (don't pile up)
        warnings.push(`Appointment would end at ${Math.floor(endTimeMinutes / 60)}:${(endTimeMinutes % 60).toString().padStart(2, '0')}, after salon closes at ${salonClosingTime}`);
      }
    }
    
    // 4c: Check professional working days and hours
    if (foundProfessional) {
      const profWorkingDays = parseWorkingDays(foundProfessional.workingDays);
      const profOpeningTime = foundProfessional.openingTime;
      const profClosingTime = foundProfessional.closingTime;
      
      // Professional has custom working days
      if (profWorkingDays.length > 0 && !profWorkingDays.includes(appointmentDayOfWeek)) {
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        errors.push({
          field: 'professionalHours',
          message: `Professional ${foundProfessional.name} doesn't work on ${dayNames[appointmentDayOfWeek]}`,
          userMessage: `${foundProfessional.name} não atende no ${dayNames[appointmentDayOfWeek]}. Os dias de atendimento são: ${profWorkingDays.map(d => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}. Quer agendar com outro profissional ou em outro dia?`,
          code: 'PROFESSIONAL_OFF_DAY',
        });
      }
      
      // Professional has custom working hours
      if (profOpeningTime && profClosingTime && profWorkingDays.includes(appointmentDayOfWeek)) {
        const appointmentTimeMinutes = parseTimeToMinutes(request.time);
        const profOpenMinutes = parseTimeToMinutes(profOpeningTime);
        const profCloseMinutes = parseTimeToMinutes(profClosingTime);
        
        if (appointmentTimeMinutes < profOpenMinutes || appointmentTimeMinutes >= profCloseMinutes) {
          errors.push({
            field: 'professionalHours',
            message: `Time ${request.time} is outside professional hours (${profOpeningTime}-${profClosingTime}) for ${foundProfessional.name}`,
            userMessage: `${foundProfessional.name} atende das ${profOpeningTime} às ${profClosingTime}. O horário ${request.time} está fora desse período. Qual horário funciona para você?`,
            code: 'OUTSIDE_PROFESSIONAL_HOURS',
          });
        }
      }
    }
    
    // 4d: Check holidays
    const dayStart = new Date(datetime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(datetime);
    dayEnd.setHours(23, 59, 59, 999);
    
    const holidays = await db.holiday.findMany({
      where: {
        accountId: request.accountId,
        date: { gte: dayStart, lte: dayEnd },
      }
    });
    
    if (holidays.length > 0) {
      const holidayNames = holidays.map(h => h.description || 'Feriado').join(', ');
      errors.push({
        field: 'holiday',
        message: `Date is a holiday: ${holidayNames}`,
        userMessage: `Estaremos fechados neste dia (${holidayNames}). Que tal agendar para outro dia? 😊`,
        code: 'HOLIDAY',
      });
    }
  }
  
  // === STEP 5: Check scheduling conflicts (only if no previous errors) ===
  if (errors.length === 0 && foundProfessional && !isNaN(datetime.getTime())) {
    const serviceDuration = foundService?.durationMinutes || 
      (isMultiService ? foundServices.reduce((sum, s) => sum + s.durationMinutes, 0) : 30) ||
      (foundPackage ? foundPackage.packageServices.reduce((sum: number, ps: any) => sum + ((ps.Service?.durationMinutes || 30) * ps.quantity), 0) : 30);
    
    const endTime = new Date(datetime.getTime() + serviceDuration * 60000);
    
    const conflicts = await db.appointment.findMany({
      where: {
        accountId: request.accountId,
        professionalId: foundProfessional.id,
        status: { in: ['pending', 'confirmed', 'scheduled'] },
        datetime: { lt: endTime },
        endTime: { gt: datetime },
        ...(request.excludeAppointmentId ? { id: { not: request.excludeAppointmentId } } : {}),
      }
    });
    
    if (conflicts.length > 0) {
      // Check if this is a duplicate from the same client
      const duplicateFromSameClient = request.clientId 
        ? conflicts.find(c => c.clientId === request.clientId)
        : null;
      
      if (duplicateFromSameClient) {
        warnings.push(`Client already has an appointment at this time: ${duplicateFromSameClient.id}`);
      } else {
        errors.push({
          field: 'conflict',
          message: `Time slot conflict on ${request.date} at ${request.time} for professional ${foundProfessional.name}`,
          userMessage: `Infelizmente o horário das ${request.time} com ${foundProfessional.name} já está ocupado. Posso verificar outros horários disponíveis? 😊`,
          code: 'TIME_CONFLICT',
        });
      }
    }
  }
  
  // === BUILD RESULT ===
  const result: BookingValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
    salonTimezone,
  };
  
  // Attach resolved data if validation passed
  if (result.valid) {
    result.serviceId = foundService?.id || (isMultiService ? foundServices[0]?.id : undefined);
    result.professionalId = foundProfessional?.id;
    result.datetime = datetime;
    
    const serviceDuration = foundService?.durationMinutes || 
      (isMultiService ? foundServices.reduce((sum, s) => sum + s.durationMinutes, 0) : 30) ||
      (foundPackage ? foundPackage.packageServices.reduce((sum: number, ps: any) => sum + ((ps.Service?.durationMinutes || 30) * ps.quantity), 0) : 30);
    
    result.endTime = new Date(datetime.getTime() + serviceDuration * 60000);
    result.serviceDuration = serviceDuration;
    
    if (foundService) {
      result.price = foundService.price;
    } else if (isMultiService) {
      result.price = foundServices.reduce((sum, s) => sum + s.price, 0);
    } else if (foundPackage) {
      result.price = foundPackage.price;
    }
  }
  
  return result;
}

/**
 * Get a user-friendly error message combining all validation errors
 */
export function getBookingErrorMessage(result: BookingValidationResult): string {
  if (result.errors.length === 0) return '';
  
  // Return the first error's user message (most relevant)
  // If multiple errors, combine them
  const messages = result.errors.map(e => e.userMessage);
  
  if (messages.length === 1) return messages[0];
  
  // For multiple errors, return the most critical one
  // Priority: SERVICE_NOT_FOUND > PROFESSIONAL_NOT_FOUND > PAST_DATETIME > SALON_CLOSED_DAY > TIME_CONFLICT
  const priorityOrder = ['SERVICE_NOT_FOUND', 'PROFESSIONAL_NOT_FOUND', 'PAST_DATETIME', 'SALON_CLOSED_DAY', 'HOLIDAY', 'OUTSIDE_SALON_HOURS', 'OUTSIDE_PROFESSIONAL_HOURS', 'PROFESSIONAL_OFF_DAY', 'TIME_CONFLICT', 'INVALID_DATETIME'];
  
  for (const code of priorityOrder) {
    const error = result.errors.find(e => e.code === code);
    if (error) return error.userMessage;
  }
  
  return messages[0];
}
