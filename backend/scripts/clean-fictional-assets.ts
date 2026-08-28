import prisma from '../src/config/prisma';

async function clean() {
  await prisma.maintenancePart.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.assetReturn.deleteMany();
  await prisma.assetTransfer.deleteMany();
  await prisma.assetAssignment.deleteMany();
  await prisma.assetStatusHistory.deleteMany();
  await prisma.assetSpecification.deleteMany();
  const res = await prisma.asset.deleteMany();
  console.log(`Deleted ${res.count} fictional assets.`);
  await prisma.$disconnect();
}

clean();
