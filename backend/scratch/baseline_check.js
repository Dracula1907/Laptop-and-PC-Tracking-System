const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const counts = {
    users: await p.user.count(),
    roles: await p.role.count(),
    employees: await p.employee.count(),
    departments: await p.department.count(),
    locations: await p.location.count(),
    assets: await p.asset.count(),
    assetAssignments: await p.assetAssignment.count(),
    assetTransfers: await p.assetTransfer.count(),
    assetReturns: await p.assetReturn.count(),
    maintenanceRecords: await p.maintenanceRecord.count(),
    warranties: await p.warranty.count(),
    warrantyClaims: await p.warrantyClaim.count(),
    approvalRequests: await p.approvalRequest.count(),
    notifications: await p.notification.count(),
    documents: await p.document.count(),
    clearances: await p.clearance.count(),
    retirements: await p.retirement.count(),
    assetStatusHistory: await p.assetStatusHistory.count(),
    auditLogs: await p.auditLog.count(),
    assetQrCodes: await p.assetQrCode.count(),
    gates: await p.gate.count(),
    gateMovements: await p.gateMovement.count(),
  };

  console.log('BASELINE_COUNTS:\n' + JSON.stringify(counts, null, 2));

  // Check asset presence distribution
  const outsideCount = await p.asset.count({ where: { gatePresence: 'OUTSIDE' } });
  const insideCount = await p.asset.count({ where: { gatePresence: 'INSIDE' } });
  console.log(`Gate Presence: ${insideCount} INSIDE, ${outsideCount} OUTSIDE`);

  // Check users
  const users = await p.user.findMany({
    select: { username: true, role: { select: { code: true, name: true } }, isActive: true },
  });
  console.log('Users in DB:\n' + users.map(u => ` - ${u.username}: ${u.role.code} (${u.role.name}), active: ${u.isActive}`).join('\n'));

  await p.$disconnect();
}

main().catch((e) => {
  console.error('Diagnostic error:', e);
  process.exit(1);
});
