const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Step 1: Running safe SQL schema updates...');

  try {
    await prisma.$queryRawUnsafe(`ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'MAINTENANCE';`);
    console.log('✓ Enum ApprovalRequestType updated with MAINTENANCE');
  } catch (e) {
    console.log('Notice on ALTER TYPE:', e.message);
  }

  await prisma.$queryRawUnsafe(`ALTER TABLE "MaintenanceRecord" ADD COLUMN IF NOT EXISTS "approvalStatus" text DEFAULT 'PENDING';`);
  await prisma.$queryRawUnsafe(`ALTER TABLE "MaintenanceRecord" ADD COLUMN IF NOT EXISTS "rejectionReason" text;`);
  await prisma.$queryRawUnsafe(`ALTER TABLE "MaintenanceRecord" ADD COLUMN IF NOT EXISTS "estimatedCost" double precision;`);
  await prisma.$queryRawUnsafe(`ALTER TABLE "MaintenanceRecord" ADD COLUMN IF NOT EXISTS "approvalRequestId" text;`);
  console.log('✓ MaintenanceRecord columns verified in PostgreSQL');

  console.log('🚀 Step 2: Ensuring MAINTENANCE_APPROVE permission...');
  const maintApprovePerm = await prisma.permission.upsert({
    where: { code: 'MAINTENANCE_APPROVE' },
    update: {},
    create: {
      code: 'MAINTENANCE_APPROVE',
      name: 'Approve Maintenance Requests',
      module: 'MAINTENANCE',
      description: 'Authority to approve or reject asset maintenance requests and cost proposals.',
    },
  });
  console.log('✓ MAINTENANCE_APPROVE permission:', maintApprovePerm.id);

  console.log('🚀 Step 3: Ensuring DIRECTOR role...');
  const directorRole = await prisma.role.upsert({
    where: { code: 'DIRECTOR' },
    update: {
      name: 'Director',
      description: 'Executive management authority with comprehensive operational oversight and maintenance approval control.',
    },
    create: {
      code: 'DIRECTOR',
      name: 'Director',
      description: 'Executive management authority with comprehensive operational oversight and maintenance approval control.',
    },
  });
  console.log('✓ DIRECTOR role id:', directorRole.id);

  // Assign operational permissions to DIRECTOR (exclude USER_CREATE, USER_UPDATE, USER_DEACTIVATE, SETTINGS_MANAGE)
  const directorPermCodes = [
    'ASSET_CREATE', 'ASSET_VIEW', 'ASSET_UPDATE', 'ASSET_DEACTIVATE',
    'EMPLOYEE_CREATE', 'EMPLOYEE_VIEW', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DEACTIVATE',
    'ASSIGNMENT_CREATE', 'ASSIGNMENT_APPROVE',
    'TRANSFER_CREATE', 'TRANSFER_APPROVE',
    'RETURN_CREATE', 'RETURN_APPROVE',
    'MAINTENANCE_CREATE', 'MAINTENANCE_UPDATE', 'MAINTENANCE_APPROVE',
    'REPORT_VIEW', 'REPORT_EXPORT',
    'AUDIT_VIEW',
    'DEPARTMENT_MANAGE', 'LOCATION_MANAGE',
  ];

  for (const code of directorPermCodes) {
    const perm = await prisma.permission.findUnique({ where: { code } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: directorRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: directorRole.id,
          permissionId: perm.id,
        },
      });
    }
  }
  console.log('✓ Operational permissions mapped to DIRECTOR role');

  // Also ensure ADMIN has MAINTENANCE_APPROVE
  const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
  if (adminRole && maintApprovePerm) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: maintApprovePerm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: maintApprovePerm.id,
      },
    });
    console.log('✓ Admin granted MAINTENANCE_APPROVE');
  }

  console.log('🚀 Step 4: Ensuring ApprovalPolicy for MAINTENANCE...');
  await prisma.approvalPolicy.upsert({
    where: { operationType: 'MAINTENANCE' },
    update: {
      requiresApproval: true,
      approverRole: 'DIRECTOR',
      allowSelfApproval: false,
      description: 'Maintenance requests with cost require Director approval.',
    },
    create: {
      operationType: 'MAINTENANCE',
      requiresApproval: true,
      approverRole: 'DIRECTOR',
      allowSelfApproval: false,
      description: 'Maintenance requests with cost require Director approval.',
    },
  });
  console.log('✓ ApprovalPolicy for MAINTENANCE configured');

  console.log('🚀 Step 5: Ensuring default Director user account...');
  // Check if an employee exists or create an executive employee for Director
  let dirEmp = await prisma.employee.findFirst({
    where: { employeeCode: 'EMP-DIR' },
  });
  if (!dirEmp) {
    // find a department
    const dept = await prisma.department.findFirst();
    const loc = await prisma.location.findFirst();
    if (dept && loc) {
      dirEmp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP-DIR',
          fullName: 'Managing Director',
          email: 'director@faithautomation.com',
          phone: '+91 98765 00099',
          designation: 'Director',
          departmentId: dept.id,
          locationId: loc.id,
          status: 'ACTIVE',
        },
      });
      console.log('✓ Director employee record created:', dirEmp.employeeCode);
    }
  }

  const passHash = await bcrypt.hash('director123', 10);
  const dirUser = await prisma.user.upsert({
    where: { username: 'director' },
    update: {
      roleId: directorRole.id,
      isActive: true,
      employeeId: dirEmp ? dirEmp.id : undefined,
    },
    create: {
      username: 'director',
      passwordHash: passHash,
      roleId: directorRole.id,
      isActive: true,
      employeeId: dirEmp ? dirEmp.id : null,
    },
  });
  console.log('✓ Director user created/updated:', dirUser.username, '(role: DIRECTOR)');

  console.log('🎉 Migration & Seed finished successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
