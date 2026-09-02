-- CreateEnum
CREATE TYPE "WarrantyType" AS ENUM (
    'STANDARD',
    'EXTENDED',
    'ONSITE',
    'DEPOT',
    'ACCIDENTAL_DAMAGE',
    'LIMITED',
    'SERVICE_CONTRACT',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "CoverageStatus" AS ENUM (
    'ACTIVE',
    'EXPIRING_SOON',
    'EXPIRED',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'IN_SERVICE',
    'RESOLVED',
    'CANCELLED'
);

-- AlterTable
ALTER TABLE "MaintenanceRecord" ADD COLUMN "warrantyId" TEXT;
ALTER TABLE "MaintenanceRecord" ADD COLUMN "coveredAmount" DOUBLE PRECISION;
ALTER TABLE "MaintenanceRecord" ADD COLUMN "outOfPocketAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Warranty" (
    "id" TEXT NOT NULL,
    "warrantyCode" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "warrantyType" "WarrantyType" NOT NULL DEFAULT 'STANDARD',
    "provider" TEXT NOT NULL,
    "policyNumber" TEXT,
    "coverageDescription" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CoverageStatus" NOT NULL DEFAULT 'ACTIVE',
    "claimContact" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseReference" TEXT,
    "warrantyCost" DOUBLE PRECISION,
    "coverageNotes" TEXT,
    "attachmentRef" TEXT,
    "isExtended" BOOLEAN NOT NULL DEFAULT false,
    "previousWarrantyId" TEXT,
    "extensionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "warrantyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "claimDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issue" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "approvedDate" TIMESTAMP(3),
    "serviceDate" TIMESTAMP(3),
    "resolvedDate" TIMESTAMP(3),
    "resolution" TEXT,
    "claimCost" DOUBLE PRECISION,
    "warrantyCovered" BOOLEAN NOT NULL DEFAULT true,
    "coveredAmount" DOUBLE PRECISION,
    "outOfPocketAmount" DOUBLE PRECISION,
    "maintenanceId" TEXT,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warranty_warrantyCode_key" ON "Warranty"("warrantyCode");
CREATE INDEX "Warranty_warrantyCode_idx" ON "Warranty"("warrantyCode");
CREATE INDEX "Warranty_assetId_idx" ON "Warranty"("assetId");
CREATE INDEX "Warranty_provider_idx" ON "Warranty"("provider");
CREATE INDEX "Warranty_startDate_idx" ON "Warranty"("startDate");
CREATE INDEX "Warranty_endDate_idx" ON "Warranty"("endDate");
CREATE INDEX "Warranty_status_idx" ON "Warranty"("status");
CREATE INDEX "Warranty_warrantyType_idx" ON "Warranty"("warrantyType");
CREATE INDEX "Warranty_isExtended_idx" ON "Warranty"("isExtended");

-- CreateIndex
CREATE UNIQUE INDEX "WarrantyClaim_claimNumber_key" ON "WarrantyClaim"("claimNumber");
CREATE INDEX "WarrantyClaim_claimNumber_idx" ON "WarrantyClaim"("claimNumber");
CREATE INDEX "WarrantyClaim_warrantyId_idx" ON "WarrantyClaim"("warrantyId");
CREATE INDEX "WarrantyClaim_assetId_idx" ON "WarrantyClaim"("assetId");
CREATE INDEX "WarrantyClaim_status_idx" ON "WarrantyClaim"("status");
CREATE INDEX "WarrantyClaim_claimDate_idx" ON "WarrantyClaim"("claimDate");
CREATE INDEX "WarrantyClaim_provider_idx" ON "WarrantyClaim"("provider");
CREATE INDEX "WarrantyClaim_maintenanceId_idx" ON "WarrantyClaim"("maintenanceId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_warrantyId_idx" ON "MaintenanceRecord"("warrantyId");

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_previousWarrantyId_fkey" FOREIGN KEY ("previousWarrantyId") REFERENCES "Warranty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "MaintenanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
