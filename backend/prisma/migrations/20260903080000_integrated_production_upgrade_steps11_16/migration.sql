-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('APPROVAL', 'ASSIGNMENT', 'TRANSFER', 'RETURN', 'MAINTENANCE', 'WARRANTY', 'DATA_QUALITY', 'EMPLOYEE', 'RETIREMENT', 'REPLACEMENT', 'BULK_OPERATION', 'DOCUMENT', 'ASSET', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ClearanceStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'CLEARED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClearanceAction" AS ENUM ('RETURN', 'TRANSFER', 'RETAIN_EXCEPTION', 'MISSING', 'DAMAGED', 'MAINTENANCE_REQUIRED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('HANDOVER', 'TRANSFER', 'RETURN_RECEIPT', 'CLEARANCE', 'RETIREMENT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'FINAL', 'VOIDED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RetirementReason" AS ENUM ('END_OF_LIFE', 'OBSOLETE', 'REPEATED_FAILURE', 'SEVERE_DAMAGE', 'UNECONOMICAL_TO_REPAIR', 'SECURITY_SUPPORT_END', 'WARRANTY_EXPIRED', 'PERFORMANCE', 'LOST_OR_UNRECOVERED', 'OTHER');

-- CreateEnum
CREATE TYPE "RetirementStatus" AS ENUM ('PROPOSED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisposalMethod" AS ENUM ('ELECTRONIC_WASTE_RECYCLER', 'DONATION', 'BUYBACK', 'SCRAP', 'INTERNAL_REPURPOSE', 'OTHER');

-- CreateEnum
CREATE TYPE "DataSanitizationStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'COMPLETED', 'FAILED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ReplacementStatus" AS ENUM ('NOT_REQUIRED', 'RECOMMENDED', 'REQUESTED', 'REPLACED', 'DEFERRED');

-- DropForeignKey
ALTER TABLE "AssetReturn" DROP CONSTRAINT "AssetReturn_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "AssetReturn" DROP CONSTRAINT "AssetReturn_receivedById_fkey";

-- DropForeignKey
ALTER TABLE "AssetTransfer" DROP CONSTRAINT "AssetTransfer_newHolderId_fkey";

-- DropIndex
DROP INDEX "Notification_isRead_idx";

-- DropIndex
DROP INDEX "Notification_userId_idx";

-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "changeSummary" TEXT,
ADD COLUMN     "entityType" TEXT NOT NULL DEFAULT 'ASSET',
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'CREATE_AND_UPDATE',
ADD COLUMN     "rollbackLog" TEXT,
ADD COLUMN     "rollbackStatus" TEXT DEFAULT 'CAN_ROLLBACK',
ADD COLUMN     "stagedData" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceRecord" ALTER COLUMN "repairStatus" SET DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "actionRoute" TEXT,
ADD COLUMN     "assetId" TEXT,
ADD COLUMN     "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reportType" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "sortBy" TEXT,
    "sortOrder" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clearance" (
    "id" TEXT NOT NULL,
    "clearanceCode" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "exitDate" TIMESTAMP(3) NOT NULL,
    "initiatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ClearanceStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "reason" TEXT,
    "notes" TEXT,
    "initiatedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "completedDate" TIMESTAMP(3),
    "slaDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearanceItem" (
    "id" TEXT NOT NULL,
    "clearanceId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "action" "ClearanceAction" NOT NULL DEFAULT 'RETURN',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "returnId" TEXT,
    "transferId" TEXT,
    "maintenanceId" TEXT,
    "inspectionStatus" TEXT,
    "conditionAtClearance" "AssetCondition",
    "damageDescription" TEXT,
    "missingAccessories" TEXT,
    "exceptionReason" TEXT,
    "exceptionApprovedById" TEXT,
    "resolutionNotes" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClearanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "relatedEntityType" TEXT NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "assetId" TEXT,
    "employeeId" TEXT,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'FINAL',
    "fileReference" TEXT,
    "fileHash" TEXT,
    "snapshotData" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retirement" (
    "id" TEXT NOT NULL,
    "retirementCode" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" "RetirementStatus" NOT NULL DEFAULT 'PROPOSED',
    "reason" "RetirementReason" NOT NULL,
    "overrideReason" TEXT,
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retirementDate" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvalRequestId" TEXT,
    "finalCondition" "AssetCondition",
    "finalLocation" TEXT,
    "dataSanitizationStatus" "DataSanitizationStatus" NOT NULL DEFAULT 'PENDING',
    "disposalMethod" "DisposalMethod",
    "disposalVendor" TEXT,
    "disposalReference" TEXT,
    "disposalDate" TIMESTAMP(3),
    "residualValue" DOUBLE PRECISION,
    "replacementAssetId" TEXT,
    "replacementStatus" "ReplacementStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId", "category");

-- CreateIndex
CREATE INDEX "SavedReport_createdById_idx" ON "SavedReport"("createdById");

-- CreateIndex
CREATE INDEX "SavedReport_reportType_idx" ON "SavedReport"("reportType");

-- CreateIndex
CREATE UNIQUE INDEX "Clearance_clearanceCode_key" ON "Clearance"("clearanceCode");

-- CreateIndex
CREATE INDEX "Clearance_clearanceCode_idx" ON "Clearance"("clearanceCode");

-- CreateIndex
CREATE INDEX "Clearance_employeeId_idx" ON "Clearance"("employeeId");

-- CreateIndex
CREATE INDEX "Clearance_status_idx" ON "Clearance"("status");

-- CreateIndex
CREATE INDEX "Clearance_exitDate_idx" ON "Clearance"("exitDate");

-- CreateIndex
CREATE INDEX "Clearance_initiatedById_idx" ON "Clearance"("initiatedById");

-- CreateIndex
CREATE INDEX "ClearanceItem_clearanceId_idx" ON "ClearanceItem"("clearanceId");

-- CreateIndex
CREATE INDEX "ClearanceItem_assetId_idx" ON "ClearanceItem"("assetId");

-- CreateIndex
CREATE INDEX "ClearanceItem_assignmentId_idx" ON "ClearanceItem"("assignmentId");

-- CreateIndex
CREATE INDEX "ClearanceItem_status_idx" ON "ClearanceItem"("status");

-- CreateIndex
CREATE INDEX "ClearanceItem_action_idx" ON "ClearanceItem"("action");

-- CreateIndex
CREATE UNIQUE INDEX "Document_documentNumber_key" ON "Document"("documentNumber");

-- CreateIndex
CREATE INDEX "Document_documentNumber_idx" ON "Document"("documentNumber");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE INDEX "Document_relatedEntityType_relatedEntityId_idx" ON "Document"("relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE INDEX "Document_assetId_idx" ON "Document"("assetId");

-- CreateIndex
CREATE INDEX "Document_employeeId_idx" ON "Document"("employeeId");

-- CreateIndex
CREATE INDEX "Document_generatedById_idx" ON "Document"("generatedById");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Retirement_retirementCode_key" ON "Retirement"("retirementCode");

-- CreateIndex
CREATE INDEX "Retirement_retirementCode_idx" ON "Retirement"("retirementCode");

-- CreateIndex
CREATE INDEX "Retirement_assetId_idx" ON "Retirement"("assetId");

-- CreateIndex
CREATE INDEX "Retirement_status_idx" ON "Retirement"("status");

-- CreateIndex
CREATE INDEX "Retirement_reason_idx" ON "Retirement"("reason");

-- CreateIndex
CREATE INDEX "Retirement_requestedDate_idx" ON "Retirement"("requestedDate");

-- CreateIndex
CREATE INDEX "Retirement_requestedById_idx" ON "Retirement"("requestedById");

-- CreateIndex
CREATE INDEX "Retirement_approvedById_idx" ON "Retirement"("approvedById");

-- CreateIndex
CREATE INDEX "Retirement_approvalRequestId_idx" ON "Retirement"("approvalRequestId");

-- CreateIndex
CREATE INDEX "Retirement_replacementAssetId_idx" ON "Retirement"("replacementAssetId");

-- CreateIndex
CREATE INDEX "ImportBatch_entityType_idx" ON "ImportBatch"("entityType");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_category_idx" ON "Notification"("userId", "category");

-- CreateIndex
CREATE INDEX "Notification_fingerprint_idx" ON "Notification"("fingerprint");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- AddForeignKey
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_newHolderId_fkey" FOREIGN KEY ("newHolderId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReturn" ADD CONSTRAINT "AssetReturn_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceItem" ADD CONSTRAINT "ClearanceItem_clearanceId_fkey" FOREIGN KEY ("clearanceId") REFERENCES "Clearance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceItem" ADD CONSTRAINT "ClearanceItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceItem" ADD CONSTRAINT "ClearanceItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssetAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceItem" ADD CONSTRAINT "ClearanceItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "AssetReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceItem" ADD CONSTRAINT "ClearanceItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "AssetTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceItem" ADD CONSTRAINT "ClearanceItem_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "MaintenanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceItem" ADD CONSTRAINT "ClearanceItem_exceptionApprovedById_fkey" FOREIGN KEY ("exceptionApprovedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceItem" ADD CONSTRAINT "ClearanceItem_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retirement" ADD CONSTRAINT "Retirement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retirement" ADD CONSTRAINT "Retirement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retirement" ADD CONSTRAINT "Retirement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retirement" ADD CONSTRAINT "Retirement_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retirement" ADD CONSTRAINT "Retirement_replacementAssetId_fkey" FOREIGN KEY ("replacementAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

