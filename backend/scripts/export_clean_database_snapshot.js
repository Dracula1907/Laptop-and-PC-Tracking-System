const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log('Generating complete snapshot of clean official ITAM inventory database...');

  const [
    assets,
    specifications,
    assignments,
    qrCodes,
    employees,
    departments,
    locations,
    users,
    roles,
    permissions,
    gates,
    systemSettings,
    approvalPolicies,
  ] = await Promise.all([
    prisma.asset.findMany(),
    prisma.assetSpecification.findMany(),
    prisma.assetAssignment.findMany(),
    prisma.assetQrCode.findMany(),
    prisma.employee.findMany(),
    prisma.department.findMany(),
    prisma.location.findMany(),
    prisma.user.findMany({ select: { id: true, username: true, roleId: true, employeeId: true, isActive: true } }),
    prisma.role.findMany(),
    prisma.permission.findMany(),
    prisma.gate.findMany(),
    prisma.systemSetting.findMany(),
    prisma.approvalPolicy.findMany(),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    totalAssets: assets.length,
    totalQrCodes: qrCodes.length,
    totalEmployees: employees.length,
    totalDepartments: departments.length,
    totalLocations: locations.length,
    totalUsers: users.length,
    totalRoles: roles.length,
    totalGates: gates.length,
    assets,
    specifications,
    assignments,
    qrCodes,
    employees,
    departments,
    locations,
    users,
    roles,
    permissions,
    gates,
    systemSettings,
    approvalPolicies,
  };

  const backupDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const jsonPath = path.join(backupDir, 'official_401_inventory_clean_snapshot.json');
  fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log(`✓ Snapshot saved successfully: ${jsonPath}`);
  console.log(`  - Assets: ${assets.length}`);
  console.log(`  - QR Codes: ${qrCodes.length}`);
  console.log(`  - Employees: ${employees.length}`);
  console.log(`  - Departments: ${departments.length}`);
  console.log(`  - Locations: ${locations.length}`);
  console.log(`  - Users: ${users.length}`);
  console.log(`  - Gates: ${gates.length}`);
}

main()
  .catch((e) => {
    console.error('Error generating snapshot:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
