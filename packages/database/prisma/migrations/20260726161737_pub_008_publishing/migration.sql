-- CreateEnum
CREATE TYPE "PublishPlatform" AS ENUM ('facebook', 'instagram', 'tiktok', 'youtube', 'whatsapp');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('draft', 'in_review', 'approved', 'published', 'failed', 'retracted');

-- CreateEnum
CREATE TYPE "ApprovalKind" AS ENUM ('content_review', 'guardian_scope', 'final_approval');

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT,
    "platform" "PublishPlatform" NOT NULL,
    "caption" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'draft',
    "externalId" TEXT,
    "error" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationApproval" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "kind" "ApprovalKind" NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Publication_tenantId_status_idx" ON "Publication"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Publication_assetId_idx" ON "Publication"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationApproval_publicationId_kind_key" ON "PublicationApproval"("publicationId", "kind");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationApproval" ADD CONSTRAINT "PublicationApproval_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
