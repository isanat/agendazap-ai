---
Task ID: 1
Agent: Main
Task: Fix #4 (timezone), #5 (validate before confirm), #6 (Evolution API health), #7 (business hours validation)

Work Log:
- Explored and recovered codebase from GitHub (git reset --hard origin/main)
- Created `/src/lib/booking-validation.ts` with comprehensive booking validation:
  - Service existence and active check (exact + fuzzy + multi-service split)
  - Package detection
  - Professional existence, active check, and service offering check
  - Timezone-aware date/time creation using salon's explicit timezone
  - Past datetime detection
  - Business hours validation (salon working days/hours + professional working days/hours)
  - Holiday detection
  - Scheduling conflict detection
  - User-friendly Portuguese error messages for each validation failure
- Created `/src/lib/evolution-health.ts` with health monitoring and message queue:
  - Evolution API health check (fetchInstances endpoint, 5s timeout)
  - In-memory health status tracking (consecutive failures, latency, last success/failure)
  - Pending message queue (max 1000 messages, 3 retries with exponential backoff)
  - Auto-recovery: when API comes back online, pending queue is automatically processed
  - Periodic monitoring (60s health checks, 30s queue processing)
  - isApiReady() for checking before sending
  - getQueueStats() for monitoring
- Updated `prisma/schema.prisma`: Added `timezone` field to Account model (default: "America/Sao_Paulo")
- Updated `/src/lib/ai-context-service.ts`:
  - Now uses `getSalonTimezone()` and `getNowInSalonTz()` instead of server `new Date()`
  - System prompt shows current time in salon's timezone with TZ label
  - Fixes issue where server timezone differs from salon timezone
- Updated `/src/app/api/webhooks/evolution/route.ts`:
  - Added import for booking-validation and evolution-health
  - createAppointmentFromBooking() now calls validateBooking() BEFORE creating anything
  - Replaced 3 hardcoded `-03:00` timezone offsets with `createDateInSalonTz(booking.date, booking.time, salonTimezone)`
  - Failed bookings now include validationErrors in response for better error messages
  - Error handling improved to use validation error messages (already user-friendly Portuguese)
  - Added message queue enqueue when Evolution API appears down
  - Added health status check before retrying failed messages
- Updated `/src/app/api/health/route.ts`:
  - Added Evolution API health status to health check endpoint
  - Added message queue stats (size, oldest message, next retry)

Stage Summary:
- Fix #4: Timezone now uses salon's explicit `timezone` field (default America/Sao_Paulo) instead of server timezone
- Fix #5: Booking validation runs BEFORE appointment creation with detailed error messages
- Fix #6: Evolution API health check + auto-reconnect + pending message queue
- Fix #7: Business hours validation (salon + professional + holidays) in createAppointmentFromBooking()
- All changes compile and lint clean (0 errors in modified files)
