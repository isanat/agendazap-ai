-- Add client CPF and birthDate fields
ALTER TABLE "Client" ADD COLUMN "cpf" TEXT;
ALTER TABLE "Client" ADD COLUMN "birthDate" TIMESTAMP(3);

-- Add appointment price and PIX tracking fields
ALTER TABLE "Appointment" ADD COLUMN "price" DOUBLE PRECISION;
ALTER TABLE "Appointment" ADD COLUMN "pixId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "pixPaidAt" TIMESTAMP(3);

-- Add Mercado Pago OAuth fields to SystemConfiguration
ALTER TABLE "SystemConfiguration" ADD COLUMN "mpClientId" TEXT;
ALTER TABLE "SystemConfiguration" ADD COLUMN "mpClientSecret" TEXT;
ALTER TABLE "SystemConfiguration" ADD COLUMN "mpRedirectUri" TEXT;
