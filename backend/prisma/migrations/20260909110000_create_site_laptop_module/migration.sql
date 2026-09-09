-- CreateEnum
CREATE TYPE "SiteLaptopEntryType" AS ENUM ('INVENTORY_LINKED', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "SiteLaptopStatus" AS ENUM ('AT_SITE', 'RETURNED', 'IN_TRANSIT', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "SiteLaptop" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "entryType" "SiteLaptopEntryType" NOT NULL DEFAULT 'INVENTORY_LINKED',
    "assetId" TEXT,
    "laptopName" TEXT NOT NULL,
    "assetIdDisplay" TEXT NOT NULL,
    "qrCode" TEXT,
    "serialNumber" TEXT,
    "dispatchDate" TIMESTAMP(3) NOT NULL,
    "dispatchTime" TEXT,
    "destinationSite" TEXT NOT NULL,
    "assignedTo" TEXT,
    "contactNumber" TEXT,
    "purpose" TEXT,
    "expectedReturn" TIMESTAMP(3),
    "actualReturn" TIMESTAMP(3),
    "status" "SiteLaptopStatus" NOT NULL DEFAULT 'AT_SITE',
    "remarks" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteLaptop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteLaptopHistory" (
    "id" TEXT NOT NULL,
    "siteLaptopId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromSite" TEXT,
    "toSite" TEXT,
    "fromStatus" "SiteLaptopStatus",
    "toStatus" "SiteLaptopStatus",
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteLaptopHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteLaptop_code_key" ON "SiteLaptop"("code");

-- CreateIndex
CREATE INDEX "SiteLaptop_code_idx" ON "SiteLaptop"("code");

-- CreateIndex
CREATE INDEX "SiteLaptop_assetId_idx" ON "SiteLaptop"("assetId");

-- CreateIndex
CREATE INDEX "SiteLaptop_assetIdDisplay_idx" ON "SiteLaptop"("assetIdDisplay");

-- CreateIndex
CREATE INDEX "SiteLaptop_status_idx" ON "SiteLaptop"("status");

-- CreateIndex
CREATE INDEX "SiteLaptop_destinationSite_idx" ON "SiteLaptop"("destinationSite");

-- CreateIndex
CREATE INDEX "SiteLaptop_dispatchDate_idx" ON "SiteLaptop"("dispatchDate");

-- CreateIndex
CREATE INDEX "SiteLaptopHistory_siteLaptopId_idx" ON "SiteLaptopHistory"("siteLaptopId");

-- CreateIndex
CREATE INDEX "SiteLaptopHistory_eventDate_idx" ON "SiteLaptopHistory"("eventDate");

-- AddForeignKey
ALTER TABLE "SiteLaptop" ADD CONSTRAINT "SiteLaptop_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLaptop" ADD CONSTRAINT "SiteLaptop_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLaptop" ADD CONSTRAINT "SiteLaptop_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLaptopHistory" ADD CONSTRAINT "SiteLaptopHistory_siteLaptopId_fkey" FOREIGN KEY ("siteLaptopId") REFERENCES "SiteLaptop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLaptopHistory" ADD CONSTRAINT "SiteLaptopHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
