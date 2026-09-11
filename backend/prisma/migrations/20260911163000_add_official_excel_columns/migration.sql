-- Safe additive migration for new official Excel format (ASSET LIST.xls)
ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "srNo" INTEGER;
ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "make" TEXT;
ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "wanIp" TEXT;
ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "wanMacAddress" TEXT;
ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "system" TEXT;
ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "warrantyStatus" TEXT;
ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "software" TEXT;
ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "msOffice" TEXT;

CREATE INDEX IF NOT EXISTS "Asset_srNo_idx" ON "public"."Asset"("srNo");
CREATE INDEX IF NOT EXISTS "Asset_make_idx" ON "public"."Asset"("make");
CREATE INDEX IF NOT EXISTS "Asset_wanIp_idx" ON "public"."Asset"("wanIp");
CREATE INDEX IF NOT EXISTS "Asset_wanMacAddress_idx" ON "public"."Asset"("wanMacAddress");
CREATE INDEX IF NOT EXISTS "Asset_system_idx" ON "public"."Asset"("system");
