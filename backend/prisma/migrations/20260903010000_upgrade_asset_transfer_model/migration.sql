-- AlterTable
ALTER TABLE "AssetTransfer" ADD COLUMN IF NOT EXISTS "transferCode" TEXT,
ADD COLUMN IF NOT EXISTS "effectiveDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "conditionBefore" "AssetCondition",
ADD COLUMN IF NOT EXISTS "conditionAfter" "AssetCondition";

ALTER TABLE "AssetTransfer" ALTER COLUMN "newHolderId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AssetTransfer_transferCode_key" ON "AssetTransfer"("transferCode");
CREATE INDEX IF NOT EXISTS "AssetTransfer_previousHolderId_idx" ON "AssetTransfer"("previousHolderId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_previousDepartmentId_idx" ON "AssetTransfer"("previousDepartmentId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_newDepartmentId_idx" ON "AssetTransfer"("newDepartmentId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_previousLocationId_idx" ON "AssetTransfer"("previousLocationId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_newLocationId_idx" ON "AssetTransfer"("newLocationId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_transferDate_idx" ON "AssetTransfer"("transferDate");
