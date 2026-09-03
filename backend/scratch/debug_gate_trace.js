const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const m = await p.gateMovement.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { asset: true, gate: true, guardUser: true },
  });

  console.log('=== LATEST 5 GATE MOVEMENTS ===');
  for (const x of m) {
    console.log(`\nMovement: ${x.movementCode} | Type: ${x.movementType} | Status: ${x.status}`);
    console.log(`Asset: ${x.asset?.assetCode} (${x.asset?.assetName}) | Gate Presence: ${x.asset?.gatePresence}`);
    console.log(`Gate: ${x.gate?.name} | Guard: ${x.guardUser?.username} | DateTime: ${x.movementDateTime}`);
    console.log(`Destination: ${x.destination} | Purpose: ${x.purpose}`);

    const h = await p.assetStatusHistory.findMany({
      where: { assetId: x.assetId, action: { in: ['ASSET_GATE_EXIT', 'ASSET_GATE_ENTRY'] } },
      orderBy: { eventDate: 'desc' },
      take: 3,
    });
    console.log(`   History records for this asset (${h.length}):`);
    for (const item of h) {
      console.log(`     - [${item.action}] at ${item.eventDate}: ${item.remarks}`);
    }
  }

  await p.$disconnect();
}

main().catch(console.error);
