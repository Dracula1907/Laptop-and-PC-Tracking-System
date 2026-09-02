-- AlterEnum
ALTER TYPE "MaintenanceStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "MaintenanceStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "MaintenanceStatus" ADD VALUE IF NOT EXISTS 'WAITING_PARTS';
ALTER TYPE "MaintenanceStatus" ADD VALUE IF NOT EXISTS 'WAITING_VENDOR';

-- AlterTable
ALTER TABLE "MaintenanceRecord" ADD COLUMN IF NOT EXISTS "maintenanceCode" TEXT,
ADD COLUMN IF NOT EXISTS "maintenanceType" TEXT NOT NULL DEFAULT 'CORRECTIVE',
ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS "technicianId" TEXT,
ADD COLUMN IF NOT EXISTS "assignedToId" TEXT,
ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "diagnosis" TEXT,
ADD COLUMN IF NOT EXISTS "rootCause" TEXT,
ADD COLUMN IF NOT EXISTS "recommendedAction" TEXT,
ADD COLUMN IF NOT EXISTS "repairAction" TEXT,
ADD COLUMN IF NOT EXISTS "partsReplaced" TEXT,
ADD COLUMN IF NOT EXISTS "laborCost" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "partsCost" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "serviceCost" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "otherCost" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "underWarranty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "warrantyProvider" TEXT,
ADD COLUMN IF NOT EXISTS "warrantyReference" TEXT,
ADD COLUMN IF NOT EXISTS "warrantyClaimNumber" TEXT,
ADD COLUMN IF NOT EXISTS "warrantyExpiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "warrantyCoverage" TEXT DEFAULT 'NOT_COVERED',
ADD COLUMN IF NOT EXISTS "expectedCompletionDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "conditionBefore" "AssetCondition" DEFAULT 'GOOD',
ADD COLUMN IF NOT EXISTS "conditionAfter" "AssetCondition",
ADD COLUMN IF NOT EXISTS "finalDisposition" TEXT DEFAULT 'AVAILABLE',
ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
ADD COLUMN IF NOT EXISTS "departmentId" TEXT,
ADD COLUMN IF NOT EXISTS "locationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceRecord_maintenanceCode_key" ON "MaintenanceRecord"("maintenanceCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MaintenanceRecord_maintenanceCode_idx" ON "MaintenanceRecord"("maintenanceCode");
CREATE INDEX IF NOT EXISTS "MaintenanceRecord_priority_idx" ON "MaintenanceRecord"("priority");
CREATE INDEX IF NOT EXISTS "MaintenanceRecord_maintenanceType_idx" ON "MaintenanceRecord"("maintenanceType");
CREATE INDEX IF NOT EXISTS "MaintenanceRecord_reportedAt_idx" ON "MaintenanceRecord"("reportedAt");
CREATE INDEX IF NOT EXISTS "MaintenanceRecord_expectedCompletionDate_idx" ON "MaintenanceRecord"("expectedCompletionDate");
CREATE INDEX IF NOT EXISTS "MaintenanceRecord_technicianId_idx" ON "MaintenanceRecord"("technicianId");
CREATE INDEX IF NOT EXISTS "MaintenanceRecord_departmentId_idx" ON "MaintenanceRecord"("departmentId");
CREATE INDEX IF NOT EXISTS "MaintenanceRecord_locationId_idx" ON "MaintenanceRecord"("locationId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceRecord_technicianId_fkey') THEN
    ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceRecord_assignedToId_fkey') THEN
    ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceRecord_approvedById_fkey') THEN
    ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceRecord_departmentId_fkey') THEN
    ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceRecord_locationId_fkey') THEN
    ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
