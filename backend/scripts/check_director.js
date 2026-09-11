const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const directorRole = await prisma.role.findUnique({
    where: { code: 'DIRECTOR' },
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });
  console.log('Director Role:', directorRole ? {
    id: directorRole.id,
    code: directorRole.code,
    name: directorRole.name,
    permissionsCount: directorRole.permissions.length,
    permissions: directorRole.permissions.map(p => p.permission.code)
  } : 'NOT FOUND');

  const directorUser = await prisma.user.findUnique({
    where: { username: 'director' },
    include: { role: true }
  });
  const bcrypt = require('bcryptjs');
  const isMatch = await bcrypt.compare('director123', directorUser.passwordHash);
  console.log('Password matches director123:', isMatch);
}

main().catch(console.error).finally(() => prisma.$disconnect());
