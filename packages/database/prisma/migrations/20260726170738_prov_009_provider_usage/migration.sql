-- CreateEnum
CREATE TYPE "ProviderUnitType" AS ENUM ('tokens', 'seconds', 'calls');

-- CreateTable
CREATE TABLE "ProviderUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "units" DOUBLE PRECISION NOT NULL,
    "unitType" "ProviderUnitType" NOT NULL,
    "estimatedCostUsd" DECIMAL(10,4) NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderUsage_tenantId_createdAt_idx" ON "ProviderUsage"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProviderUsage" ADD CONSTRAINT "ProviderUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
