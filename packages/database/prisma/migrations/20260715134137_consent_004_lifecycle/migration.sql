-- AlterTable
ALTER TABLE "ConsentRecord" ADD COLUMN     "documentRef" TEXT,
ADD COLUMN     "enforcedAt" TIMESTAMP(3),
ADD COLUMN     "guardianContact" TEXT,
ADD COLUMN     "revokeReason" TEXT,
ADD COLUMN     "revokedBy" TEXT;
