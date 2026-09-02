-- Add new values to AssetAction enum
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_IMPORTED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_ASSIGNED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_UPDATED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_TRANSFERRED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_RETURN_INITIATED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_RETURNED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_INSPECTED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'MAINTENANCE_OPENED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'MAINTENANCE_UPDATED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'EMPLOYEE_CHANGED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ALLOCATION_CHANGED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'DISPOSITION_CHANGED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'HARDWARE_CHANGED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_DEACTIVATED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_REACTIVATED';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'CORRECTION_RECORDED';

-- AlterTable AssetStatusHistory
ALTER TABLE "AssetStatusHistory" ADD COLUMN IF NOT EXISTS "previousAllocationStatus" "AllocationStatus";
ALTER TABLE "AssetStatusHistory" ADD COLUMN IF NOT EXISTS "newAllocationStatus" "AllocationStatus";
ALTER TABLE "AssetStatusHistory" ADD COLUMN IF NOT EXISTS "relatedEntityType" TEXT;
ALTER TABLE "AssetStatusHistory" ADD COLUMN IF NOT EXISTS "relatedEntityId" TEXT;
ALTER TABLE "AssetStatusHistory" ADD COLUMN IF NOT EXISTS "relatedRecordCode" TEXT;
ALTER TABLE "AssetStatusHistory" ADD COLUMN IF NOT EXISTS "isCorrection" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AssetStatusHistory" ADD COLUMN IF NOT EXISTS "correctedHistoryId" TEXT;
ALTER TABLE "AssetStatusHistory" ADD COLUMN IF NOT EXISTS "correctionReason" TEXT;
ALTER TABLE "AssetStatusHistory" ADD COLUMN IF NOT EXISTS "snapshot" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssetStatusHistory_relatedEntityType_relatedEntityId_idx" ON "AssetStatusHistory"("relatedEntityType", "relatedEntityId");
CREATE INDEX IF NOT EXISTS "AssetStatusHistory_relatedRecordCode_idx" ON "AssetStatusHistory"("relatedRecordCode");
CREATE INDEX IF NOT EXISTS "AssetStatusHistory_correctedHistoryId_idx" ON "AssetStatusHistory"("correctedHistoryId");
CREATE INDEX IF NOT EXISTS "AssetStatusHistory_isCorrection_idx" ON "AssetStatusHistory"("isCorrection");
