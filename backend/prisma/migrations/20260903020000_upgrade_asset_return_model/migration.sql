-- AlterEnum
ALTER TYPE "WorkflowStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "WorkflowStatus" ADD VALUE IF NOT EXISTS 'INSPECTED';

-- AlterTable
ALTER TABLE "AssetReturn" ADD COLUMN IF NOT EXISTS "returnCode" TEXT,
ADD COLUMN IF NOT EXISTS "departmentId" TEXT,
ADD COLUMN IF NOT EXISTS "locationId" TEXT,
ADD COLUMN IF NOT EXISTS "returnReason" TEXT,
ADD COLUMN IF NOT EXISTS "damageCategory" TEXT,
ADD COLUMN IF NOT EXISTS "damageDescription" TEXT,
ADD COLUMN IF NOT EXISTS "accessoriesChecklist" JSONB,
ADD COLUMN IF NOT EXISTS "dataWipeStatus" TEXT DEFAULT 'NOT_REQUIRED',
ADD COLUMN IF NOT EXISTS "inspectionRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "inspectionResult" TEXT,
ADD COLUMN IF NOT EXISTS "inspectedById" TEXT,
ADD COLUMN IF NOT EXISTS "inspectedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "inspectionRemarks" TEXT,
ADD COLUMN IF NOT EXISTS "maintenanceRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "maintenanceId" TEXT,
ADD COLUMN IF NOT EXISTS "disposition" TEXT,
ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
ALTER COLUMN "employeeId" DROP NOT NULL,
ALTER COLUMN "receivedById" DROP NOT NULL,
ALTER COLUMN "conditionAtReturn" SET DEFAULT 'GOOD';

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AssetReturn_returnCode_key" ON "AssetReturn"("returnCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssetReturn_returnCode_idx" ON "AssetReturn"("returnCode");
CREATE INDEX IF NOT EXISTS "AssetReturn_assignmentId_idx" ON "AssetReturn"("assignmentId");
CREATE INDEX IF NOT EXISTS "AssetReturn_departmentId_idx" ON "AssetReturn"("departmentId");
CREATE INDEX IF NOT EXISTS "AssetReturn_locationId_idx" ON "AssetReturn"("locationId");
CREATE INDEX IF NOT EXISTS "AssetReturn_status_idx" ON "AssetReturn"("status");
CREATE INDEX IF NOT EXISTS "AssetReturn_returnDate_idx" ON "AssetReturn"("returnDate");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetReturn_departmentId_fkey') THEN
    ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetReturn_locationId_fkey') THEN
    ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetReturn_inspectedById_fkey') THEN
    ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetReturn_approvedById_fkey') THEN
    ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetReturn_maintenanceId_fkey') THEN
    ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "MaintenanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
