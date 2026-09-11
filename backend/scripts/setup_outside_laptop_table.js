const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating OutsideLaptopRecord table safely in PostgreSQL if not exists...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."OutsideLaptopRecord" (
      "id" TEXT NOT NULL,
      "recordCode" TEXT NOT NULL,
      "laptopName" TEXT NOT NULL,
      "laptopIdentifier" TEXT NOT NULL,
      "personName" TEXT NOT NULL,
      "personDetails" TEXT,
      "company" TEXT,
      "contactNumber" TEXT,
      "movementType" TEXT NOT NULL,
      "purpose" TEXT NOT NULL,
      "destination" TEXT,
      "movementDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "recordedById" TEXT,
      "status" TEXT NOT NULL DEFAULT 'OUTSIDE',
      "linkedOutRecordId" TEXT,
      "remarks" TEXT,
      "isDeleted" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "OutsideLaptopRecord_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "OutsideLaptopRecord_recordCode_key" ON "public"."OutsideLaptopRecord"("recordCode");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_laptopIdentifier_idx" ON "public"."OutsideLaptopRecord"("laptopIdentifier");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_movementType_idx" ON "public"."OutsideLaptopRecord"("movementType");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_status_idx" ON "public"."OutsideLaptopRecord"("status");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_movementDateTime_idx" ON "public"."OutsideLaptopRecord"("movementDateTime");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_isDeleted_idx" ON "public"."OutsideLaptopRecord"("isDeleted");
  `);

  // Foreign key constraint if User table exists
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'OutsideLaptopRecord_recordedById_fkey'
        ) THEN
          ALTER TABLE "public"."OutsideLaptopRecord"
          ADD CONSTRAINT "OutsideLaptopRecord_recordedById_fkey"
          FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
  } catch (e) {
    console.log('Note on FK creation:', e.message);
  }

  console.log('OutsideLaptopRecord table created/verified successfully in PostgreSQL!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
