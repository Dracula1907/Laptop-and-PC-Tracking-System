import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';

export async function seedGuardRole() {
  console.log('Checking SECURITY_GUARD role and user...');

  // 1. Find or create SECURITY_GUARD role
  let guardRole = await prisma.role.findUnique({
    where: { code: 'SECURITY_GUARD' },
  });

  if (!guardRole) {
    guardRole = await prisma.role.create({
      data: {
        name: 'Security Guard',
        code: 'SECURITY_GUARD',
        description: 'Physical gate checkpoint scanning and movement logging personnel',
      },
    });
    console.log('Created SECURITY_GUARD role:', guardRole.id);
  } else {
    console.log('SECURITY_GUARD role already exists:', guardRole.id);
  }

  // 2. Ensure default guard user exists
  const existingGuard = await prisma.user.findUnique({
    where: { username: 'guard' },
  });

  if (!existingGuard) {
    const passwordHash = await bcrypt.hash('guard123', 10);
    const user = await prisma.user.create({
      data: {
        username: 'guard',
        passwordHash,
        roleId: guardRole.id,
        isActive: true,
      },
    });
    console.log('Created default security guard user: "guard" with password "guard123" (ID:', user.id, ')');
  } else {
    // Ensure role is set to SECURITY_GUARD
    if (existingGuard.roleId !== guardRole.id) {
      await prisma.user.update({
        where: { id: existingGuard.id },
        data: { roleId: guardRole.id },
      });
      console.log('Updated guard user role to SECURITY_GUARD');
    } else {
      console.log('Default security guard user "guard" already exists with correct role.');
    }
  }
}

if (require.main === module) {
  seedGuardRole()
    .then(() => {
      console.log('Guard seed completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Guard seed failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
