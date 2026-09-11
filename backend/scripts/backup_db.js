const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany();
  const assignments = await prisma.assetAssignment.findMany();
  const maintenance = await prisma.maintenanceRecord.findMany();
  const gateMovements = await prisma.gateMovement.findMany();
  const qrCodes = await prisma.assetQrCode.findMany();

  const backupData = {
    timestamp: new Date().toISOString(),
    assetsCount: assets.length,
    assets,
    assignmentsCount: assignments.length,
    assignments,
    maintenanceCount: maintenance.length,
    maintenance,
    gateMovementsCount: gateMovements.length,
    gateMovements,
    qrCodesCount: qrCodes.length,
    qrCodes,
  };

  fs.writeFileSync('scripts/pre_upgrade_backup.json', JSON.stringify(backupData, null, 2));
  console.log(`✓ Backup completed: ${assets.length} assets, ${assignments.length} assignments, ${maintenance.length} maintenance, ${gateMovements.length} gate movements, ${qrCodes.length} QR codes.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
