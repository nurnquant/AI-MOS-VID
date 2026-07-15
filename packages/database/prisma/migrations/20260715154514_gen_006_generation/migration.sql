-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'partial');

-- CreateEnum
CREATE TYPE "SceneGenerationStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "targetPreset" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'queued',
    "startedBy" TEXT NOT NULL,
    "error" TEXT,
    "finalAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneGeneration" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "SceneGenerationStatus" NOT NULL DEFAULT 'queued',
    "assetId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Generation_tenantId_scriptId_idx" ON "Generation"("tenantId", "scriptId");

-- CreateIndex
CREATE INDEX "SceneGeneration_generationId_position_idx" ON "SceneGeneration"("generationId", "position");

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_finalAssetId_fkey" FOREIGN KEY ("finalAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneGeneration" ADD CONSTRAINT "SceneGeneration_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneGeneration" ADD CONSTRAINT "SceneGeneration_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneGeneration" ADD CONSTRAINT "SceneGeneration_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
