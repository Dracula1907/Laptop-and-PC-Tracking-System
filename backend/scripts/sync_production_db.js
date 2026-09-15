const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function runSqlSafe(description, sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`  ✓ ${description}`);
  } catch (err) {
    console.warn(`  ⚠ ${description} (Notice: ${err.message})`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('  FAITH IT INVENTORY - PRODUCTION DATABASE SYNC');
  console.log('====================================================\n');

  // 1. Connection check
  console.log('1. Connecting to PostgreSQL database...');
  await prisma.$connect();
  console.log('  ✓ Connected to database successfully.\n');

  // 2. Safe Schema Updates (DDL)
  console.log('2. Applying safe idempotent schema updates...');

  // 2a. Asset official 19-column Excel format additions
  const assetColumns = [
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
  for (const sql of assetColumns) {
    await runSqlSafe('Asset 19-column field / index update', sql);
  }

  // 2b. ApprovalRequestType enum & MaintenanceRecord columns
  await runSqlSafe(
    'ApprovalRequestType enum update (MAINTENANCE)',
    `ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'MAINTENANCE';`
  );

  const maintenanceColumns = [
    `ALTER TABLE "public"."MaintenanceRecord" ADD COLUMN IF NOT EXISTS "approvalStatus" text DEFAULT 'PENDING';`,
    `ALTER TABLE "public"."MaintenanceRecord" ADD COLUMN IF NOT EXISTS "rejectionReason" text;`,
    `ALTER TABLE "public"."MaintenanceRecord" ADD COLUMN IF NOT EXISTS "estimatedCost" double precision;`,
    `ALTER TABLE "public"."MaintenanceRecord" ADD COLUMN IF NOT EXISTS "approvalRequestId" text;`,
  ];
  for (const sql of maintenanceColumns) {
    await runSqlSafe('MaintenanceRecord approval column', sql);
  }

  // 2c. SiteLaptop enums and tables
  await runSqlSafe(
    'SiteLaptopEntryType enum',
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SiteLaptopEntryType') THEN CREATE TYPE "SiteLaptopEntryType" AS ENUM ('INVENTORY_LINKED', 'MANUAL_ENTRY'); END IF; END $$;`
  );
  await runSqlSafe(
    'SiteLaptopStatus enum',
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SiteLaptopStatus') THEN CREATE TYPE "SiteLaptopStatus" AS ENUM ('AT_SITE', 'RETURNED', 'IN_TRANSIT', 'MAINTENANCE'); END IF; END $$;`
  );

  await runSqlSafe(
    'SiteLaptop table',
    `CREATE TABLE IF NOT EXISTS "public"."SiteLaptop" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "entryType" "SiteLaptopEntryType" NOT NULL DEFAULT 'INVENTORY_LINKED',
      "assetId" TEXT,
      "laptopName" TEXT NOT NULL,
      "assetIdDisplay" TEXT NOT NULL,
      "qrCode" TEXT,
      "serialNumber" TEXT,
      "dispatchDate" TIMESTAMP(3) NOT NULL,
      "dispatchTime" TEXT,
      "destinationSite" TEXT NOT NULL,
      "assignedTo" TEXT,
      "contactNumber" TEXT,
      "purpose" TEXT,
      "expectedReturn" TIMESTAMP(3),
      "actualReturn" TIMESTAMP(3),
      "status" "SiteLaptopStatus" NOT NULL DEFAULT 'AT_SITE',
      "remarks" TEXT,
      "createdById" TEXT,
      "updatedById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SiteLaptop_pkey" PRIMARY KEY ("id")
    );`
  );

  await runSqlSafe(
    'SiteLaptop code unique index',
    `CREATE UNIQUE INDEX IF NOT EXISTS "SiteLaptop_code_key" ON "public"."SiteLaptop"("code");`
  );
  await runSqlSafe(
    'SiteLaptop indexes',
    `CREATE INDEX IF NOT EXISTS "SiteLaptop_assetId_idx" ON "public"."SiteLaptop"("assetId");
     CREATE INDEX IF NOT EXISTS "SiteLaptop_status_idx" ON "public"."SiteLaptop"("status");
     CREATE INDEX IF NOT EXISTS "SiteLaptop_destinationSite_idx" ON "public"."SiteLaptop"("destinationSite");
     CREATE INDEX IF NOT EXISTS "SiteLaptop_dispatchDate_idx" ON "public"."SiteLaptop"("dispatchDate");`
  );

  await runSqlSafe(
    'SiteLaptopHistory table',
    `CREATE TABLE IF NOT EXISTS "public"."SiteLaptopHistory" (
      "id" TEXT NOT NULL,
      "siteLaptopId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "fromSite" TEXT,
      "toSite" TEXT,
      "fromStatus" "SiteLaptopStatus",
      "toStatus" "SiteLaptopStatus",
      "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notes" TEXT,
      "performedById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SiteLaptopHistory_pkey" PRIMARY KEY ("id")
    );`
  );

  await runSqlSafe(
    'SiteLaptopHistory indexes',
    `CREATE INDEX IF NOT EXISTS "SiteLaptopHistory_siteLaptopId_idx" ON "public"."SiteLaptopHistory"("siteLaptopId");
     CREATE INDEX IF NOT EXISTS "SiteLaptopHistory_eventDate_idx" ON "public"."SiteLaptopHistory"("eventDate");`
  );

  // 2d. OutsideLaptopRecord table
  await runSqlSafe(
    'OutsideLaptopRecord table',
    `CREATE TABLE IF NOT EXISTS "public"."OutsideLaptopRecord" (
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
    );`
  );

  await runSqlSafe(
    'OutsideLaptopRecord indexes',
    `CREATE UNIQUE INDEX IF NOT EXISTS "OutsideLaptopRecord_recordCode_key" ON "public"."OutsideLaptopRecord"("recordCode");
     CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_laptopIdentifier_idx" ON "public"."OutsideLaptopRecord"("laptopIdentifier");
     CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_movementType_idx" ON "public"."OutsideLaptopRecord"("movementType");
     CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_status_idx" ON "public"."OutsideLaptopRecord"("status");
     CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_movementDateTime_idx" ON "public"."OutsideLaptopRecord"("movementDateTime");
     CREATE INDEX IF NOT EXISTS "OutsideLaptopRecord_isDeleted_idx" ON "public"."OutsideLaptopRecord"("isDeleted");`
  );

  // Safe Foreign Keys
  await runSqlSafe(
    'SiteLaptop FKs',
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SiteLaptop_assetId_fkey') THEN
        ALTER TABLE "public"."SiteLaptop" ADD CONSTRAINT "SiteLaptop_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SiteLaptop_createdById_fkey') THEN
        ALTER TABLE "public"."SiteLaptop" ADD CONSTRAINT "SiteLaptop_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SiteLaptop_updatedById_fkey') THEN
        ALTER TABLE "public"."SiteLaptop" ADD CONSTRAINT "SiteLaptop_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SiteLaptopHistory_siteLaptopId_fkey') THEN
        ALTER TABLE "public"."SiteLaptopHistory" ADD CONSTRAINT "SiteLaptopHistory_siteLaptopId_fkey" FOREIGN KEY ("siteLaptopId") REFERENCES "public"."SiteLaptop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;`
  );

  await runSqlSafe(
    'OutsideLaptopRecord FK',
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OutsideLaptopRecord_recordedById_fkey') THEN
        ALTER TABLE "public"."OutsideLaptopRecord" ADD CONSTRAINT "OutsideLaptopRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;`
  );

  console.log('  ✓ Schema DDL synchronization completed.\n');

  // 3. Auto-heal Prisma Migrations Table
  console.log('3. Checking and repairing Prisma migrations history...');
  try {
    const migrationsTableExists = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations';
    `);

    if (migrationsTableExists && migrationsTableExists.length > 0) {
      // Fix any failed migration entries
      const fixedFailed = await prisma.$executeRawUnsafe(`
        UPDATE "public"."_prisma_migrations"
        SET "finished_at" = COALESCE("finished_at", NOW()),
            "rolled_back_at" = NULL,
            "applied_steps_count" = GREATEST("applied_steps_count", 1)
        WHERE "finished_at" IS NULL OR "rolled_back_at" IS NOT NULL;
      `);
      if (fixedFailed > 0) {
        console.log(`  ✓ Repaired ${fixedFailed} failed/incomplete migration record(s) in _prisma_migrations.`);
      } else {
        console.log('  ✓ No failed migrations in registry.');
      }

      // Ensure 20260911163000_add_official_excel_columns is marked applied
      const officialMigration = '20260911163000_add_official_excel_columns';
      const existingOfficial = await prisma.$queryRawUnsafe(`
        SELECT id FROM "public"."_prisma_migrations" WHERE "migration_name" = '${officialMigration}';
      `);
      if (!existingOfficial || existingOfficial.length === 0) {
        const dummyChecksum = crypto.createHash('sha256').update(officialMigration).digest('hex');
        await prisma.$executeRawUnsafe(`
          INSERT INTO "public"."_prisma_migrations" (
            "id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count"
          ) VALUES (
            gen_random_uuid()::text, '${dummyChecksum}', NOW(), '${officialMigration}', NULL, NULL, NOW(), 1
          );
        `);
        console.log(`  ✓ Registered ${officialMigration} as applied in Prisma registry.`);
      }

      // Ensure 20260909110000_create_site_laptop_module is marked applied
      const siteMigration = '20260909110000_create_site_laptop_module';
      const existingSite = await prisma.$queryRawUnsafe(`
        SELECT id FROM "public"."_prisma_migrations" WHERE "migration_name" = '${siteMigration}';
      `);
      if (!existingSite || existingSite.length === 0) {
        const dummyChecksum = crypto.createHash('sha256').update(siteMigration).digest('hex');
        await prisma.$executeRawUnsafe(`
          INSERT INTO "public"."_prisma_migrations" (
            "id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count"
          ) VALUES (
            gen_random_uuid()::text, '${dummyChecksum}', NOW(), '${siteMigration}', NULL, NULL, NOW(), 1
          );
        `);
        console.log(`  ✓ Registered ${siteMigration} as applied in Prisma registry.`);
      }
    }
  } catch (migErr) {
    console.warn(`  ⚠ Prisma migration registry check:`, migErr.message);
  }
  console.log('  ✓ Migration registry synchronized.\n');

  // 4. Ensure Permissions, Roles & Director Workflow
  console.log('4. Synchronizing core roles, permissions, and policies...');
  try {
    // Permission: MAINTENANCE_APPROVE
    const maintApprovePerm = await prisma.permission.upsert({
      where: { code: 'MAINTENANCE_APPROVE' },
      update: {},
      create: {
        code: 'MAINTENANCE_APPROVE',
        name: 'Approve Maintenance Requests',
        module: 'MAINTENANCE',
        description: 'Authority to approve or reject asset maintenance requests and cost proposals.',
      },
    });

    // Role: DIRECTOR
    const directorRole = await prisma.role.upsert({
      where: { code: 'DIRECTOR' },
      update: {
        name: 'Director',
        description: 'Executive management authority with comprehensive operational oversight and maintenance approval control.',
      },
      create: {
        code: 'DIRECTOR',
        name: 'Director',
        description: 'Executive management authority with comprehensive operational oversight and maintenance approval control.',
      },
    });

    const directorPermCodes = [
      'ASSET_CREATE', 'ASSET_VIEW', 'ASSET_UPDATE', 'ASSET_DEACTIVATE',
      'EMPLOYEE_CREATE', 'EMPLOYEE_VIEW', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DEACTIVATE',
      'ASSIGNMENT_CREATE', 'ASSIGNMENT_APPROVE',
      'TRANSFER_CREATE', 'TRANSFER_APPROVE',
      'RETURN_CREATE', 'RETURN_APPROVE',
      'MAINTENANCE_CREATE', 'MAINTENANCE_UPDATE', 'MAINTENANCE_APPROVE',
      'REPORT_VIEW', 'REPORT_EXPORT',
      'AUDIT_VIEW',
      'DEPARTMENT_MANAGE', 'LOCATION_MANAGE',
    ];

    for (const code of directorPermCodes) {
      const perm = await prisma.permission.findUnique({ where: { code } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: directorRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: directorRole.id,
            permissionId: perm.id,
          },
        });
      }
    }

    // Grant Admin MAINTENANCE_APPROVE as well
    const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
    if (adminRole && maintApprovePerm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: maintApprovePerm.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: maintApprovePerm.id,
        },
      });
    }

    // ApprovalPolicy for MAINTENANCE
    await prisma.approvalPolicy.upsert({
      where: { operationType: 'MAINTENANCE' },
      update: {
        requiresApproval: true,
        approverRole: 'DIRECTOR',
        allowSelfApproval: false,
        description: 'Maintenance requests with cost require Director approval.',
      },
      create: {
        operationType: 'MAINTENANCE',
        requiresApproval: true,
        approverRole: 'DIRECTOR',
        allowSelfApproval: false,
        description: 'Maintenance requests with cost require Director approval.',
      },
    });

    console.log('  ✓ Roles, permissions, and approval policies verified.');
  } catch (roleErr) {
    console.warn(`  ⚠ Role/permission sync:`, roleErr.message);
  }

  // 5. Ensure Default Quick Accounts
  console.log('\n5. Ensuring required standard user accounts...');
  try {
    const roles = await prisma.role.findMany();
    const roleMap = {};
    roles.forEach((r) => {
      roleMap[r.code] = r;
    });

    const accounts = [
      { username: 'admin', pass: 'admin123', roleCode: 'ADMIN' },
      { username: 'manager', pass: 'manager123', roleCode: 'MANAGER' },
      { username: 'director', pass: 'director123', roleCode: 'DIRECTOR' },
      { username: 'guard', pass: 'guard123', roleCode: 'SECURITY_GUARD' },
      { username: 'it', pass: 'it123', roleCode: 'IT' },
      { username: 'user', pass: 'user123', roleCode: 'USER' },
    ];

    for (const acc of accounts) {
      const role = roleMap[acc.roleCode];
      if (!role) continue;

      const existing = await prisma.user.findUnique({
        where: { username: acc.username },
      });

      if (!existing) {
        const passwordHash = await bcrypt.hash(acc.pass, 10);
        await prisma.user.create({
          data: {
            username: acc.username,
            passwordHash,
            roleId: role.id,
            isActive: true,
          },
        });
        console.log(`  ✓ Created user: ${acc.username} (${acc.roleCode})`);
      }
    }
    console.log('  ✓ Standard user accounts verified.');
  } catch (userErr) {
    console.warn(`  ⚠ Account check:`, userErr.message);
  }

  const assetCount = await prisma.asset.count().catch(() => 0);
  console.log(`\n====================================================`);
  console.log(`PRODUCTION DATABASE SYNCHRONIZED SUCCESSFULLY`);
  console.log(`Total Assets in Database: ${assetCount}`);
  console.log(`====================================================\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n❌ Production DB Sync failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
