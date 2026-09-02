-- CreateEnum
CREATE TYPE "ApprovalRequestType" AS ENUM (
    'ASSIGNMENT',
    'TRANSFER',
    'RETURN_DISPOSITION',
    'MAINTENANCE_COMPLETION',
    'ASSET_STATUS_CHANGE',
    'ASSET_DEACTIVATION',
    'ASSET_RETIREMENT',
    'SENSITIVE_UPDATE'
);

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CHANGES_REQUESTED',
    'CANCELLED',
    'EXPIRED'
);

-- CreateEnum
CREATE TYPE "ApprovalPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "requestType" "ApprovalRequestType" NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "assetId" TEXT,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "ApprovalPriority" NOT NULL DEFAULT 'MEDIUM',
    "reason" TEXT,
    "comments" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 1,
    "targetRole" TEXT,
    "targetDepartmentId" TEXT,
    "decisionById" TEXT,
    "decisionAt" TIMESTAMP(3),
    "decisionComment" TEXT,
    "rejectionReason" TEXT,
    "changesRequested" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "proposedChanges" TEXT NOT NULL,
    "expectedSourceState" TEXT,
    "approvalDeadline" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalHistory" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 1,
    "action" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "comment" TEXT,
    "snapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "operationType" "ApprovalRequestType" NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "approverRole" TEXT DEFAULT 'MANAGER',
    "allowSelfApproval" BOOLEAN NOT NULL DEFAULT false,
    "autoExpireDays" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_requestCode_key" ON "ApprovalRequest"("requestCode");
CREATE INDEX "ApprovalRequest_requestCode_idx" ON "ApprovalRequest"("requestCode");
CREATE INDEX "ApprovalRequest_requestType_idx" ON "ApprovalRequest"("requestType");
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");
CREATE INDEX "ApprovalRequest_priority_idx" ON "ApprovalRequest"("priority");
CREATE INDEX "ApprovalRequest_assetId_idx" ON "ApprovalRequest"("assetId");
CREATE INDEX "ApprovalRequest_requestedById_idx" ON "ApprovalRequest"("requestedById");
CREATE INDEX "ApprovalRequest_decisionById_idx" ON "ApprovalRequest"("decisionById");
CREATE INDEX "ApprovalRequest_targetDepartmentId_idx" ON "ApprovalRequest"("targetDepartmentId");
CREATE INDEX "ApprovalRequest_createdAt_idx" ON "ApprovalRequest"("createdAt");
CREATE INDEX "ApprovalRequest_approvalDeadline_idx" ON "ApprovalRequest"("approvalDeadline");

-- CreateIndex
CREATE INDEX "ApprovalHistory_approvalRequestId_idx" ON "ApprovalHistory"("approvalRequestId");
CREATE INDEX "ApprovalHistory_action_idx" ON "ApprovalHistory"("action");
CREATE INDEX "ApprovalHistory_performedById_idx" ON "ApprovalHistory"("performedById");
CREATE INDEX "ApprovalHistory_createdAt_idx" ON "ApprovalHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalPolicy_operationType_key" ON "ApprovalPolicy"("operationType");
CREATE INDEX "ApprovalPolicy_operationType_idx" ON "ApprovalPolicy"("operationType");
CREATE INDEX "ApprovalPolicy_isActive_idx" ON "ApprovalPolicy"("isActive");

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_targetDepartmentId_fkey" FOREIGN KEY ("targetDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
