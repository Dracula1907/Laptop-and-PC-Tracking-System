const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const perms = await prisma.permission.findMany({
    orderBy: { module: 'asc' }
  });
  console.log(`Total permissions: ${perms.length}`);
  for (const p of perms) {
    console.log(`- [${p.module}] ${p.code} (${p.name})`);
  }
}

main().finally(() => prisma.$disconnect());
