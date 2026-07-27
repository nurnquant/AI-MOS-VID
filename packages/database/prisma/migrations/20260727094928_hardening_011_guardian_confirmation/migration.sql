-- AlterTable
ALTER TABLE "ConsentRecord" ADD COLUMN     "guardianConfirmationToken" TEXT,
ADD COLUMN     "guardianConfirmedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_guardianConfirmationToken_key" ON "ConsentRecord"("guardianConfirmationToken");

