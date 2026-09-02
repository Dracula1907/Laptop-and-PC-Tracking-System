-- AlterEnum
ALTER TYPE "WorkflowStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

-- AlterTable
ALTER TABLE "AssetAssignment" ADD COLUMN IF NOT EXISTS "assignmentCode" TEXT,
ADD COLUMN IF NOT EXISTS "departmentId" TEXT,
ADD COLUMN IF NOT EXISTS "locationId" TEXT,
ADD COLUMN IF NOT EXISTS "actualReturnDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "conditionAtReturn" "AssetCondition",
ADD COLUMN IF NOT EXISTS "reason" TEXT;

ALTER TABLE "AssetAssignment" ALTER COLUMN "conditionAtAssignment" SET DEFAULT 'GOOD';

-- AlterTable
ALTER TABLE "AssetReturn" ADD COLUMN IF NOT EXISTS "assignmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AssetAssignment_assignmentCode_key" ON "AssetAssignment"("assignmentCode");
CREATE INDEX IF NOT EXISTS "AssetAssignment_assignedAt_idx" ON "AssetAssignment"("assignedAt");
CREATE INDEX IF NOT EXISTS "AssetAssignment_expectedReturnDate_idx" ON "AssetAssignment"("expectedReturnDate");
CREATE INDEX IF NOT EXISTS "AssetAssignment_departmentId_idx" ON "AssetAssignment"("departmentId");
CREATE INDEX IF NOT EXISTS "AssetAssignment_locationId_idx" ON "AssetAssignment"("locationId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssetAssignment_departmentId_fkey'
  ) THEN
    ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssetAssignment_locationId_fkey'
  ) THEN
    ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssetReturn_assignmentId_fkey'
  ) THEN
    ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssetAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
