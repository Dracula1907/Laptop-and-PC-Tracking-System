-- CreateIndex
CREATE INDEX IF NOT EXISTS "Asset_location_idx" ON "Asset"("location");
CREATE INDEX IF NOT EXISTS "Asset_lanIp_idx" ON "Asset"("lanIp");
CREATE INDEX IF NOT EXISTS "Asset_employeeNameSource_idx" ON "Asset"("employeeNameSource");
