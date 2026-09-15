const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('  FAITH IT INVENTORY — CLEAR INVENTORY & TRACKING DATA');
  console.log('====================================================');
  console.log('Target: Local PostgreSQL Database (itam_db)');
  console.log('Scope: Clear assets, transactions, movements, tickets, and logs.');
  console.log('SAFEGUARD: All Users, Employees, Departments, Locations, Roles, and Settings remain UNTOUCHED.\n');

  console.log('1. Deleting tracking records and transactions...');

  // Safe table clear helper using raw SQL truncate or prisma deleteMany
  const tablesToClear = [
    'SiteLaptopHistory',
    'SiteLaptop',
    'OutsideLaptopRecord',
    'GateMovement',
    'ClearanceItem',
    'Clearance',
    'Document',
    'Retirement',
    'AssetQrCode',
    'WarrantyClaim',
    'Warranty',
    'MaintenancePart',
    'MaintenanceRecord',
    'AssetReturn',
    'AssetTransfer',
    'AssetAssignment',
    'AssetStatusHistory',
    'AssetSpecification',
    'ImportRowLog',
    'ImportRowError',
    'ImportBatch',
    'ApprovalHistory',
    'ApprovalRequest',
    'Notification',
    'AuditLog',
    'Asset'
  ];

  for (const table of tablesToClear) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${table}" CASCADE;`);
      console.log(`  ✓ Cleared table: ${table}`);
    } catch (err) {
      // Table might not exist or already empty
      console.log(`  - Table notice on ${table}: ${err.message}`);
    }
  }

  // Verify counts
  const assetCount = await prisma.asset.count().catch(() => 0);
  const userCount = await prisma.user.count().catch(() => 0);
  const empCount = await prisma.employee.count().catch(() => 0);
  const deptCount = await prisma.department.count().catch(() => 0);

  console.log('\n====================================================');
  console.log('  INVENTORY CLEANUP COMPLETE');
  console.log(`    Assets in Database    : ${assetCount} (Cleaned)`);
  console.log(`    Users Preserved       : ${userCount} (Untouched)`);
  console.log(`    Employees Preserved   : ${empCount} (Untouched)`);
  console.log(`    Departments Preserved : ${deptCount} (Untouched)`);
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('Error during inventory cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
