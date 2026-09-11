const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`SELECT enum_range(NULL::"ApprovalRequestType")`);
  console.log('ApprovalRequestType enum values:', result);
  const roles = await prisma.role.findMany();
  console.log('Existing roles:', roles);
  const users = await prisma.user.findMany({ select: { username: true, role: true } });
  console.log('Existing users:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
