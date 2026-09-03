const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } }
  });
  console.log('Roles:');
  for (const r of roles) {
    console.log(`- ${r.name} (${r.code}) [${r.permissions.length} perms]`);
  }
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: { select: { name: true, code: true } }, isActive: true }
  });
  console.log('\nUsers:');
  for (const u of users) {
    console.log(`- ${u.username} -> ${u.role.name} (${u.role.code})`);
  }
}

main().finally(() => prisma.$disconnect());
