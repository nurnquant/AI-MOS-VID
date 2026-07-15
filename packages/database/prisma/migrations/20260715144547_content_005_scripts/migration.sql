-- CreateEnum
CREATE TYPE "ScriptStatus" AS ENUM ('draft', 'in_review', 'approved');

-- CreateEnum
CREATE TYPE "ScriptLanguage" AS ENUM ('ar', 'en');

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "language" "ScriptLanguage" NOT NULL DEFAULT 'en',
    "targetPresets" TEXT[],
    "status" "ScriptStatus" NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "narration" TEXT NOT NULL,
    "visualDescription" TEXT NOT NULL,
    "durationTargetSeconds" DOUBLE PRECISION,
    "referenceAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Script_tenantId_projectId_idx" ON "Script"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "Script_tenantId_status_idx" ON "Script"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Scene_scriptId_position_idx" ON "Scene"("scriptId", "position");

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_referenceAssetId_fkey" FOREIGN KEY ("referenceAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
