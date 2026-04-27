-- RestoreAndImplementFeatures: Re-add columns and tables removed by the previous cleanup migration.
-- These represent real business features that should be implemented, not removed.

-- 1. Account.googleMapsEmbed
ALTER TABLE "Account" ADD COLUMN "googleMapsEmbed" TEXT;

-- 2. AccountSubscription.mercadoPagoSubscriptionId
ALTER TABLE "AccountSubscription" ADD COLUMN "mercadoPagoSubscriptionId" TEXT;

-- 3. Appointment PIX payment columns
ALTER TABLE "Appointment" ADD COLUMN "pixQrCode" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "pixDeepLink" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "pixExpiresAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "pixPaid" BOOLEAN NOT NULL DEFAULT false;

-- 4. AITokenUsage.requestType and metadata
ALTER TABLE "AITokenUsage" ADD COLUMN "requestType" TEXT;
ALTER TABLE "AITokenUsage" ADD COLUMN "metadata" JSONB;

-- 5. NoShowFee PIX columns and reminderSent
ALTER TABLE "NoShowFee" ADD COLUMN "pixQrCode" TEXT;
ALTER TABLE "NoShowFee" ADD COLUMN "pixDeepLink" TEXT;
ALTER TABLE "NoShowFee" ADD COLUMN "pixId" TEXT;
ALTER TABLE "NoShowFee" ADD COLUMN "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- 6. OAuthState.codeVerifier (PKCE)
ALTER TABLE "OAuthState" ADD COLUMN "codeVerifier" TEXT;

-- 7. Professional.userId (Professional -> User link)
ALTER TABLE "Professional" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Professional_userId_key" ON "Professional"("userId");

-- 8. ServiceProfessional.customPrice
ALTER TABLE "ServiceProfessional" ADD COLUMN "customPrice" DOUBLE PRECISION;

-- 9. SubscriptionPlan.maxAiTokensMonth and aiModelType
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxAiTokensMonth" INTEGER NOT NULL DEFAULT 100000;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "aiModelType" TEXT NOT NULL DEFAULT 'basic';

-- 10. User.avatar and clientId
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN "clientId" TEXT;
CREATE UNIQUE INDEX "User_clientId_key" ON "User"("clientId");

-- 11. WhatsappMessage.metadata
ALTER TABLE "WhatsappMessage" ADD COLUMN "metadata" JSONB;

-- 12. Create BlockedSlot table
CREATE TABLE "BlockedSlot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "professionalId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'unavailable',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BlockedSlot_accountId_startDate_idx" ON "BlockedSlot"("accountId", "startDate");
CREATE INDEX "BlockedSlot_professionalId_startDate_idx" ON "BlockedSlot"("professionalId", "startDate");

-- 13. Create Report table
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_accountId_idx" ON "Report"("accountId");
CREATE INDEX "Report_accountId_type_idx" ON "Report"("accountId", "type");

-- 14. Add foreign key constraints

-- Professional -> User
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User -> Client
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BlockedSlot -> Account
ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BlockedSlot -> Professional
ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Report -> Account
ALTER TABLE "Report" ADD CONSTRAINT "Report_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 15. Add Professional index for userId
CREATE INDEX "Professional_userId_idx" ON "Professional"("userId");
