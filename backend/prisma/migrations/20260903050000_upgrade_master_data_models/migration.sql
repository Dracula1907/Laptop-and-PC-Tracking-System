-- AlterTable Department
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "managerId" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "locationId" TEXT;

-- AlterTable Location
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "building" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "floor" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "roomZone" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- AlterTable Employee
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "exitDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "managerId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "remarks" TEXT;

-- Create Indexes for Department
CREATE INDEX IF NOT EXISTS "Department_name_idx" ON "Department"("name");
CREATE INDEX IF NOT EXISTS "Department_code_idx" ON "Department"("code");
CREATE INDEX IF NOT EXISTS "Department_isActive_idx" ON "Department"("isActive");
CREATE INDEX IF NOT EXISTS "Department_managerId_idx" ON "Department"("managerId");
CREATE INDEX IF NOT EXISTS "Department_locationId_idx" ON "Department"("locationId");

-- Create Indexes for Location
CREATE INDEX IF NOT EXISTS "Location_name_idx" ON "Location"("name");
CREATE INDEX IF NOT EXISTS "Location_code_idx" ON "Location"("code");
CREATE INDEX IF NOT EXISTS "Location_isActive_idx" ON "Location"("isActive");
CREATE INDEX IF NOT EXISTS "Location_departmentId_idx" ON "Location"("departmentId");

-- Create Indexes for Employee
CREATE INDEX IF NOT EXISTS "Employee_status_idx" ON "Employee"("status");
CREATE INDEX IF NOT EXISTS "Employee_managerId_idx" ON "Employee"("managerId");

-- Foreign key constraints
DO $$ BEGIN
  ALTER TABLE "Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Department" ADD CONSTRAINT "Department_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Location" ADD CONSTRAINT "Location_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
