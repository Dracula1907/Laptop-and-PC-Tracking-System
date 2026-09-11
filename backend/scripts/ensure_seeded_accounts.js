const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring all development quick accounts exist...');

  const roles = await prisma.role.findMany();
  const roleMap = {};
  roles.forEach((r) => {
    roleMap[r.code] = r;
  });

  const accounts = [
    { username: 'admin', pass: 'admin123', roleCode: 'ADMIN' },
    { username: 'manager', pass: 'manager123', roleCode: 'MANAGER' },
    { username: 'director', pass: 'director123', roleCode: 'DIRECTOR' },
    { username: 'guard', pass: 'guard123', roleCode: 'SECURITY_GUARD' },
    { username: 'it', pass: 'it123', roleCode: 'IT' },
    { username: 'user', pass: 'user123', roleCode: 'USER' },
  ];

  for (const acc of accounts) {
    const role = roleMap[acc.roleCode];
    if (!role) {
      console.error(`Role not found for code: ${acc.roleCode}`);
      continue;
    }

    const existing = await prisma.user.findUnique({
      where: { username: acc.username },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(acc.pass, 10);
      const created = await prisma.user.create({
        data: {
          username: acc.username,
          passwordHash,
          roleId: role.id,
          isActive: true,
        },
      });
      console.log(`✓ Created user: ${acc.username} (${acc.roleCode})`);
    } else {
      console.log(`✓ User already exists: ${acc.username} (${acc.roleCode})`);
    }
  }
}

main()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
