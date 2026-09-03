-- Migration: 20260903090000_qr_security_gate_system
-- Safe incremental migration for QR & Security Gate Tracking

-- 1. Extend AssetAction Enum
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_GATE_EXIT';
ALTER TYPE "AssetAction" ADD VALUE IF NOT EXISTS 'ASSET_GATE_ENTRY';

-- 2. Extend NotificationCategory Enum
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'GATE_MOVEMENT';

-- 3. Create Enums
DO $$ BEGIN
    CREATE TYPE "GatePresence" AS ENUM ('INSIDE', 'OUTSIDE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "GateMovementType" AS ENUM ('OUT', 'IN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "GateMovementStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "QrCodeStatus" AS ENUM ('ACTIVE', 'REVOKED', 'REPLACED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Extend Asset with gatePresence
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "gatePresence" "GatePresence" NOT NULL DEFAULT 'INSIDE';
CREATE INDEX IF NOT EXISTS "Asset_gatePresence_idx" ON "Asset"("gatePresence");

-- 5. Create Gate Table
CREATE TABLE IF NOT EXISTS "Gate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Gate_code_key" ON "Gate"("code");
CREATE INDEX IF NOT EXISTS "Gate_code_idx" ON "Gate"("code");
CREATE INDEX IF NOT EXISTS "Gate_status_idx" ON "Gate"("status");

-- 6. Create AssetQrCode Table
CREATE TABLE IF NOT EXISTS "AssetQrCode" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "QrCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revocationReason" TEXT,
    "replacedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "replacementReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetQrCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssetQrCode_token_key" ON "AssetQrCode"("token");
CREATE INDEX IF NOT EXISTS "AssetQrCode_assetId_idx" ON "AssetQrCode"("assetId");
CREATE INDEX IF NOT EXISTS "AssetQrCode_token_idx" ON "AssetQrCode"("token");
CREATE INDEX IF NOT EXISTS "AssetQrCode_status_idx" ON "AssetQrCode"("status");

-- 7. Create GateMovement Table
CREATE TABLE IF NOT EXISTS "GateMovement" (
    "id" TEXT NOT NULL,
    "movementCode" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "qrCodeId" TEXT,
    "movementType" "GateMovementType" NOT NULL,
    "movementDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gateId" TEXT,
    "guardUserId" TEXT,
    "employeeId" TEXT,
    "departmentId" TEXT,
    "locationId" TEXT,
    "destination" TEXT,
    "purpose" TEXT,
    "expectedReturn" TIMESTAMP(3),
    "actualReturn" TIMESTAMP(3),
    "relatedMovementId" TEXT,
    "remarks" TEXT,
    "status" "GateMovementStatus" NOT NULL DEFAULT 'OPEN',
    "approvalRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GateMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GateMovement_movementCode_key" ON "GateMovement"("movementCode");
CREATE INDEX IF NOT EXISTS "GateMovement_movementCode_idx" ON "GateMovement"("movementCode");
CREATE INDEX IF NOT EXISTS "GateMovement_assetId_idx" ON "GateMovement"("assetId");
CREATE INDEX IF NOT EXISTS "GateMovement_movementType_idx" ON "GateMovement"("movementType");
CREATE INDEX IF NOT EXISTS "GateMovement_movementDateTime_idx" ON "GateMovement"("movementDateTime");
CREATE INDEX IF NOT EXISTS "GateMovement_status_idx" ON "GateMovement"("status");
CREATE INDEX IF NOT EXISTS "GateMovement_gateId_idx" ON "GateMovement"("gateId");
CREATE INDEX IF NOT EXISTS "GateMovement_guardUserId_idx" ON "GateMovement"("guardUserId");
CREATE INDEX IF NOT EXISTS "GateMovement_employeeId_idx" ON "GateMovement"("employeeId");
CREATE INDEX IF NOT EXISTS "GateMovement_relatedMovementId_idx" ON "GateMovement"("relatedMovementId");

-- 8. Add Foreign Keys
DO $$ BEGIN
    ALTER TABLE "AssetQrCode" ADD CONSTRAINT "AssetQrCode_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AssetQrCode" ADD CONSTRAINT "AssetQrCode_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AssetQrCode" ADD CONSTRAINT "AssetQrCode_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AssetQrCode" ADD CONSTRAINT "AssetQrCode_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GateMovement" ADD CONSTRAINT "GateMovement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GateMovement" ADD CONSTRAINT "GateMovement_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "AssetQrCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GateMovement" ADD CONSTRAINT "GateMovement_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "Gate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GateMovement" ADD CONSTRAINT "GateMovement_guardUserId_fkey" FOREIGN KEY ("guardUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GateMovement" ADD CONSTRAINT "GateMovement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GateMovement" ADD CONSTRAINT "GateMovement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GateMovement" ADD CONSTRAINT "GateMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GateMovement" ADD CONSTRAINT "GateMovement_relatedMovementId_fkey" FOREIGN KEY ("relatedMovementId") REFERENCES "GateMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GateMovement" ADD CONSTRAINT "GateMovement_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
