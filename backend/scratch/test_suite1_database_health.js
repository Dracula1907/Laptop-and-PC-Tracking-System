const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSuite1() {
  console.log('============================================================');
  console.log('SUITE 1: DATABASE HEALTH & BASELINE INTEGRITY TEST');
  console.log('============================================================\n');

  const results = {
    suite: 'Suite 1: Database Health & Baseline Integrity',
    totalTests: 0,
    passed: 0,
    failed: 0,
    failures: [],
  };

  function assertTest(name, condition, details = '') {
    results.totalTests++;
    if (condition) {
      results.passed++;
      console.log(`  ✓ PASS: ${name}`);
    } else {
      results.failed++;
      console.error(`  ✗ FAIL: ${name} — ${details}`);
      results.failures.push({ test: name, details });
    }
  }

  try {
    // 1. Database Connectivity
    console.log('[1/7] Testing DB Connection & Prisma Connectivity...');
    const dbTest = await prisma.$queryRaw`SELECT 1 as connected, NOW() as current_time, version() as pg_version`;
    assertTest('PostgreSQL is reachable and responding to raw queries', dbTest && dbTest.length > 0 && dbTest[0].connected === 1);
    console.log(`       PostgreSQL Version: ${dbTest[0].pg_version.split(' ')[0] || 'Embedded Postgres'}`);
    console.log(`       Database Server Time: ${dbTest[0].current_time}`);

    // 2. Table Existence & Counts
    console.log('\n[2/7] Verifying Tables Existence & Core Model Counts...');
    const tables = [
      'user', 'role', 'permission', 'rolePermission', 'employee', 'department', 'location',
      'asset', 'assetSpecification', 'assetAssignment', 'assetTransfer', 'assetReturn',
      'maintenanceRecord', 'assetStatusHistory', 'auditLog', 'notification',
      'approvalRequest', 'warranty', 'clearance', 'document', 'retirement',
      'gate', 'assetQrCode', 'gateMovement'
    ];

    for (const table of tables) {
      try {
        const count = await prisma[table].count();
        assertTest(`Table '${table}' exists and is queryable (Count: ${count})`, typeof count === 'number');
      } catch (err) {
        assertTest(`Table '${table}' exists and is queryable`, false, err.message);
      }
    }

    // 3. Foreign Key & Relationship Integrity via Raw SQL (Direct DB Truth)
    console.log('\n[3/7] Checking Foreign Key & Relationship Integrity via SQL...');
    
    // Check Assets without valid Department
    const orphanDeptAssets = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Asset" a
      WHERE a."departmentId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Department" d WHERE d.id = a."departmentId")
    `;
    assertTest('All asset departmentId values reference valid Departments', orphanDeptAssets[0].count === 0, `${orphanDeptAssets[0].count} orphan department references`);

    // Check Assets without valid Location
    const orphanLocAssets = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Asset" a
      WHERE a."locationId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Location" l WHERE l.id = a."locationId")
    `;
    assertTest('All asset locationId values reference valid Locations', orphanLocAssets[0].count === 0, `${orphanLocAssets[0].count} orphan location references`);

    // Check Assignments without valid Asset or Employee
    const orphanAssignments = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "AssetAssignment" aa
      WHERE NOT EXISTS (SELECT 1 FROM "Asset" a WHERE a.id = aa."assetId")
         OR NOT EXISTS (SELECT 1 FROM "Employee" e WHERE e.id = aa."employeeId")
    `;
    assertTest('Zero broken foreign keys in AssetAssignment (Asset & Employee exist)', orphanAssignments[0].count === 0, `${orphanAssignments[0].count} orphan assignments`);

    // Check Gate Movements without valid Gate, Asset, or Guard User
    const orphanMovements = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "GateMovement" gm
      WHERE NOT EXISTS (SELECT 1 FROM "Asset" a WHERE a.id = gm."assetId")
         OR (gm."gateId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Gate" g WHERE g.id = gm."gateId"))
         OR (gm."guardUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = gm."guardUserId"))
    `;
    assertTest('Zero broken foreign keys in GateMovement (Asset, Gate & Guard exist)', orphanMovements[0].count === 0, `${orphanMovements[0].count} orphan movements`);

    // Check QR Codes without valid Asset
    const orphanQrs = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "AssetQrCode" qr
      WHERE NOT EXISTS (SELECT 1 FROM "Asset" a WHERE a.id = qr."assetId")
    `;
    assertTest('Zero orphan QR codes without valid Asset', orphanQrs[0].count === 0, `${orphanQrs[0].count} orphan QR codes`);

    // 4. Gate Presence State Invariants
    console.log('\n[4/7] Checking Gate Presence State Invariants...');
    const invalidPresenceValues = await prisma.asset.count({
      where: { gatePresence: { notIn: ['INSIDE', 'OUTSIDE'] } }
    });
    assertTest('All assets have valid gatePresence (INSIDE or OUTSIDE)', invalidPresenceValues === 0, `${invalidPresenceValues} invalid values`);

    // Check assets marked OUTSIDE: must have exactly 1 unreturned OUT movement
    const outsideAssets = await prisma.asset.findMany({
      where: { gatePresence: 'OUTSIDE' },
      select: { id: true, assetCode: true, assetName: true }
    });
    console.log(`       Currently ${outsideAssets.length} asset(s) marked OUTSIDE.`);

    let outsideConsistencyPassed = true;
    for (const asset of outsideAssets) {
      const openOutCount = await prisma.gateMovement.count({
        where: {
          assetId: asset.id,
          movementType: 'OUT',
          returnMovementId: null
        }
      });
      if (openOutCount !== 1) {
        outsideConsistencyPassed = false;
        console.error(`       Inconsistency for asset ${asset.assetCode}: ${openOutCount} open OUT movements (expected 1).`);
      }
    }
    assertTest('Every asset marked OUTSIDE has exactly ONE open OUT movement', outsideConsistencyPassed);

    // Check assets marked INSIDE: must have zero unreturned OUT movements
    const insideWithOpenOut = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "GateMovement" gm
      JOIN "Asset" a ON a.id = gm."assetId"
      WHERE gm."movementType" = 'OUT'
        AND gm."actualReturn" IS NULL
        AND a."gatePresence" = 'INSIDE'
    `;
    assertTest('Assets marked INSIDE have zero open OUT movements', insideWithOpenOut[0].count === 0, `${insideWithOpenOut[0].count} open movements found`);

    // 5. QR Code Uniqueness Invariant
    console.log('\n[5/7] Checking QR Code Uniqueness & Status Invariants...');
    const activeQrs = await prisma.$queryRaw`
      SELECT "assetId", COUNT(*)::int as count
      FROM "AssetQrCode"
      WHERE status = 'ACTIVE'
      GROUP BY "assetId"
      HAVING COUNT(*) > 1
    `;
    assertTest('Zero assets have multiple ACTIVE QR codes simultaneously', activeQrs.length === 0, `${activeQrs.length} duplicate active QRs found`);

    // 6. User Roles & Permission Mappings
    console.log('\n[6/7] Checking Users & Role RBAC Baseline...');
    const expectedRoles = ['ADMIN', 'MANAGER', 'SECURITY_GUARD'];
    const dbRoles = await prisma.role.findMany({ select: { code: true } });
    const dbRoleCodes = dbRoles.map(r => r.code);
    const hasAllRoles = expectedRoles.every(r => dbRoleCodes.includes(r));
    assertTest('All standard roles exist (ADMIN, MANAGER, SECURITY_GUARD)', hasAllRoles, `Found: ${dbRoleCodes.join(', ')}`);

    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      include: { role: true }
    });
    assertTest('Active users exist with valid assigned roles', activeUsers.length >= 3 && activeUsers.every(u => u.role));

    // 7. Audit Log Integrity
    console.log('\n[7/7] Checking Audit Trail Integrity...');
    const auditCount = await prisma.auditLog.count();
    const auditWithoutUser = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "AuditLog"
      WHERE "userId" IS NULL
    `;
    assertTest('Audit log is active and recording transactions', auditCount > 0);
    assertTest('Audit logs have non-null authoritative userId', auditWithoutUser[0].count === 0, `${auditWithoutUser[0].count} logs missing userId`);

  } catch (err) {
    assertTest('Unhandled error in Suite 1 execution', false, err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`SUITE 1 SUMMARY: ${results.passed}/${results.totalTests} PASSED, ${results.failed} FAILED`);
  console.log('------------------------------------------------------------\n');

  return results;
}

if (require.main === module) {
  runSuite1().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}

module.exports = { runSuite1 };
