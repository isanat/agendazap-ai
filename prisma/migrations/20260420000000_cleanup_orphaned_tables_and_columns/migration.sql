-- DropForeignKey: Professional -> User (userId removed - relation never used in code)
ALTER TABLE "Professional" DROP CONSTRAINT "Professional_userId_fkey";

-- DropForeignKey: Report -> Account (Report table is dead - never used in code)
ALTER TABLE "Report" DROP CONSTRAINT "Report_accountId_fkey";

-- DropForeignKey: User -> Client (clientId removed - relation never used in code)
ALTER TABLE "User" DROP CONSTRAINT "User_clientId_fkey";

-- DropIndex: User.clientId unique index removed
DROP INDEX "User_clientId_key";

-- Remove orphaned columns from AITokenUsage
ALTER TABLE "AITokenUsage" DROP COLUMN "metadata",
DROP COLUMN "requestType";

-- Remove orphaned column from Account (googleMapsEmbed never used; googleMapsUrl is kept)
ALTER TABLE "Account" DROP COLUMN "googleMapsEmbed";

-- Remove orphaned column from AccountSubscription (never used)
ALTER TABLE "AccountSubscription" DROP COLUMN "mercadoPagoSubscriptionId";

-- Remove orphaned PIX columns from Appointment (PIX on appointments was never implemented)
ALTER TABLE "Appointment" DROP COLUMN "pixDeepLink",
DROP COLUMN "pixExpiresAt",
DROP COLUMN "pixPaid",
DROP COLUMN "pixQrCode";

-- Remove orphaned columns from NoShowFee (PIX billing on no-show was never fully implemented)
ALTER TABLE "NoShowFee" DROP COLUMN "pixDeepLink",
DROP COLUMN "pixId",
DROP COLUMN "pixQrCode",
DROP COLUMN "reminderSent";

-- Remove orphaned column from OAuthState (PKCE was never implemented)
ALTER TABLE "OAuthState" DROP COLUMN "codeVerifier";

-- Remove orphaned column from Professional (Professional->User link never used)
ALTER TABLE "Professional" DROP COLUMN "userId";

-- Remove orphaned column from ServiceProfessional (custom price override never implemented)
ALTER TABLE "ServiceProfessional" DROP COLUMN "customPrice";

-- Remove orphaned columns from SubscriptionPlan (AI token limits managed via AIProvider instead)
ALTER TABLE "SubscriptionPlan" DROP COLUMN "aiModelType",
DROP COLUMN "maxAiTokensMonth";

-- Remove orphaned columns from User
ALTER TABLE "User" DROP COLUMN "avatar",
DROP COLUMN "clientId";

-- Remove orphaned column from WhatsappMessage (never read/written)
ALTER TABLE "WhatsappMessage" DROP COLUMN "metadata";

-- Drop dead table: BlockedSlot (0 rows, 0 code references - blocking feature never implemented)
DROP TABLE "BlockedSlot";

-- Drop dead table: Report (0 rows, 0 code references - reports page uses client-side mock data)
DROP TABLE "Report";
