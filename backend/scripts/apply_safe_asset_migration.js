const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Applying safe additive migration to PostgreSQL table "Asset"...');

  const statements = [
    `ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "srNo" INTEGER;`,
    `ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "make" TEXT;`,
    `ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "wanIp" TEXT;`,
    `ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "wanMacAddress" TEXT;`,
    `ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "system" TEXT;`,
    `ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "warrantyStatus" TEXT;`,
    `ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "software" TEXT;`,
    `ALTER TABLE "public"."Asset" ADD COLUMN IF NOT EXISTS "msOffice" TEXT;`,
    `CREATE INDEX IF NOT EXISTS "Asset_srNo_idx" ON "public"."Asset"("srNo");`,
    `CREATE INDEX IF NOT EXISTS "Asset_make_idx" ON "public"."Asset"("make");`,
    `CREATE INDEX IF NOT EXISTS "Asset_wanIp_idx" ON "public"."Asset"("wanIp");`,
    `CREATE INDEX IF NOT EXISTS "Asset_wanMacAddress_idx" ON "public"."Asset"("wanMacAddress");`,
    `CREATE INDEX IF NOT EXISTS "Asset_system_idx" ON "public"."Asset"("system");`,
  ];

  for (const sql of statements) {
    console.log('Executing:', sql);
    await prisma.$executeRawUnsafe(sql);
  }

  const assetCount = await prisma.asset.count();
  console.log(`✓ Migration applied successfully. Asset count remains: ${assetCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
