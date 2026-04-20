# AgendZap-AI Work Log

## Task 2 - Restore Removed Columns and Implement Business Logic
**Date**: 2026-04-20
**Agent**: Task 2 Agent

### Summary
Restored all database columns and tables that were incorrectly removed by a previous agent, and implemented their actual business logic.

### Changes Made

#### 1. Prisma Schema Restoration (BOTH schema.prisma AND schema.postgresql.prisma kept in sync)
- **Account.googleMapsEmbed** - Google Maps embed iframe URL for business location
- **AccountSubscription.mercadoPagoSubscriptionId** - MercadoPago subscription tracking for recurring billing
- **Appointment.pixQrCode, pixDeepLink, pixExpiresAt, pixPaid** - PIX payment integration
- **AITokenUsage.requestType, metadata** - AI request type tracking and additional context
- **NoShowFee.pixQrCode, pixDeepLink, pixId, reminderSent** - PIX payment for no-show fees
- **OAuthState.codeVerifier** - PKCE flow for OAuth security
- **Professional.userId** - Links Professional to User for login access
- **ServiceProfessional.customPrice** - Custom pricing per professional for a service
- **SubscriptionPlan.maxAiTokensMonth, aiModelType** - AI token limits per plan
- **User.avatar, clientId** - Profile pictures and client-user linking
- **WhatsappMessage.metadata** - Additional message data (media info, etc.)
- **BlockedSlot** table - Time slot blocking for professionals
- **Report** table - Generated reports storage

#### 2. Migration Applied to Neon Database
- Created migration: `20260420000001_restore_and_implement_features/migration.sql`
- Applied successfully to Neon PostgreSQL

#### 3. Implemented Business Logic

##### Professional.userId (Professional -> User link)
- **File**: `src/app/api/professionals/route.ts`
- When creating a professional with email, auto-creates a User with role "professional"
- Links existing users if email matches
- Supports unlinking user accounts on update/delete
- Professional users can log in and manage their own schedule
- **File**: `src/lib/auth-helpers.ts` - Updated `getAuthUser()` to resolve accountId from Professional relation for professional-role users
- Added `getProfessionalForUser()` and `getProfessionalContext()` helpers

##### SubscriptionPlan AI Limits
- **File**: `src/lib/ai-provider-service.ts`
- `canAccountUseAI()` now checks `maxAiTokensMonth` limit via AITokenUsage aggregate
- Returns token usage info (tokensUsed, tokensLimit, aiModelType)
- `getModelForPlan()` selects model quality based on `aiModelType`:
  - "basic" → cheaper models (glm-4-flash, llama-3.1-8b-instant)
  - "premium" → better models (glm-4-plus, llama-3.1-70b-versatile)
- `trackTokenUsage()` now accepts `requestType` and `metadata` parameters
- `generateChatCompletion()` uses plan-based model selection

##### PIX Payment for Appointments
- **File**: `src/app/api/appointments/route.ts`
- Auto-generates PIX payment on appointment creation when price > 0
- `getEffectivePrice()` checks ServiceProfessional.customPrice before service default
- Checks blocked slots before creating appointment (returns 409 if conflict)
- When marking as no_show, creates NoShowFee with PIX payment
- **File**: `src/app/api/payments/pix-status/route.ts` - New endpoint for checking/updating PIX payment status
- **File**: `src/app/api/noshow-fees/route.ts` - Updated to include PIX fields (pixQrCode, pixDeepLink, pixId, reminderSent)

##### BlockedSlot Availability Check
- **File**: `src/app/api/blocked-slots/route.ts` - New CRUD API route
- Supports account-wide and professional-specific blocked slots
- Validates against overlapping appointments before creating blocks
- Appointment creation checks blocked slots and returns 409 if conflicting

##### ServiceProfessional.customPrice
- `getEffectivePrice()` helper in appointments route checks custom pricing
- Falls back to service default price if no custom price set

### Files Modified
1. `prisma/schema.prisma` - Added all restored columns and tables
2. `prisma/schema.postgresql.prisma` - Kept in sync with schema.prisma
3. `prisma/migrations/20260420000001_restore_and_implement_features/migration.sql` - New migration
4. `src/app/api/professionals/route.ts` - Professional-User linking
5. `src/app/api/appointments/route.ts` - PIX payments, blocked slot checks, custom pricing
6. `src/app/api/blocked-slots/route.ts` - New CRUD route
7. `src/app/api/noshow-fees/route.ts` - PIX fields for no-show fees
8. `src/app/api/payments/pix-status/route.ts` - New PIX status endpoint
9. `src/lib/ai-provider-service.ts` - AI token limits, model selection
10. `src/lib/auth-helpers.ts` - Professional user auth support

### Deployment
- Pushed to GitHub: commit 6b1d8e0 on main branch
- Vercel auto-deploy triggered
