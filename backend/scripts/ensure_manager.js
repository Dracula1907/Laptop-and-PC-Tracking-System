const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const managerRole = await prisma.role.findUnique({ where: { code: 'MANAGER' } });
  if (managerRole) {
    let mgrEmp = await prisma.employee.findFirst({ where: { employeeCode: 'EMP-MGR' } });
    if (!mgrEmp) {
      const dept = await prisma.department.findFirst();
      const loc = await prisma.location.findFirst();
      if (dept && loc) {
        mgrEmp = await prisma.employee.create({
          data: {
            employeeCode: 'EMP-MGR',
            fullName: 'Department Manager',
            email: 'manager@faithautomation.com',
            phone: '+91 98765 00002',
            designation: 'Department Manager',
            departmentId: dept.id,
            locationId: loc.id,
            status: 'ACTIVE',
          },
        });
      }
    }

    const passHash = await bcrypt.hash('manager123', 10);
    const mgrUser = await prisma.user.upsert({
      where: { username: 'manager' },
      update: {
        roleId: managerRole.id,
        isActive: true,
      },
      create: {
        username: 'manager',
        passwordHash: passHash,
        roleId: managerRole.id,
        isActive: true,
        employeeId: mgrEmp ? mgrEmp.id : null,
      },
    });
    console.log('✓ Manager user ensured:', mgrUser.username);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
