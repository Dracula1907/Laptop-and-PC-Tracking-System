const { PrismaClient, EmployeeStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('==================================================');
  console.log('  FAITH AUTOMATION IT INVENTORY — DATABASE CLEANUP');
  console.log('==================================================');
  console.log('Target: Local PostgreSQL Database (itam_db)');
  console.log('Cleaning all mock data from this system...\n');

  // 1. Fetch all user tables in the public schema dynamically (preserve migrations table if present)
  const tableRows = await prisma.$queryRawUnsafe(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
  `);

  console.log(`Found ${tableRows.length} tables to truncate.`);

  // Truncate all tables in one clean CASCADE batch
  for (const row of tableRows) {
    const table = row.tablename;
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (e) {
      console.warn(`Warning truncating ${table}:`, e.message);
    }
  }

  console.log('✔ All tables truncated cleanly.\n');

  // 2. Setup Core Permissions
  const permissionList = [
    { code: 'ASSET_CREATE', name: 'Create Assets', module: 'ASSETS' },
    { code: 'ASSET_VIEW', name: 'View Assets', module: 'ASSETS' },
    { code: 'ASSET_UPDATE', name: 'Update Assets', module: 'ASSETS' },
    { code: 'ASSET_DEACTIVATE', name: 'Deactivate Assets', module: 'ASSETS' },

    { code: 'EMPLOYEE_CREATE', name: 'Create Employees', module: 'EMPLOYEES' },
    { code: 'EMPLOYEE_VIEW', name: 'View Employees', module: 'EMPLOYEES' },
    { code: 'EMPLOYEE_UPDATE', name: 'Update Employees', module: 'EMPLOYEES' },
    { code: 'EMPLOYEE_DEACTIVATE', name: 'Deactivate Employees', module: 'EMPLOYEES' },

    { code: 'ASSIGNMENT_CREATE', name: 'Create Assignment', module: 'ASSIGNMENTS' },
    { code: 'ASSIGNMENT_APPROVE', name: 'Approve Assignment', module: 'ASSIGNMENTS' },

    { code: 'TRANSFER_CREATE', name: 'Create Transfer', module: 'TRANSFERS' },
    { code: 'TRANSFER_APPROVE', name: 'Approve Transfer', module: 'TRANSFERS' },

    { code: 'RETURN_CREATE', name: 'Create Return', module: 'RETURNS' },
    { code: 'RETURN_APPROVE', name: 'Approve Return', module: 'RETURNS' },

    { code: 'MAINTENANCE_CREATE', name: 'Create Maintenance', module: 'MAINTENANCE' },
    { code: 'MAINTENANCE_UPDATE', name: 'Update Maintenance', module: 'MAINTENANCE' },

    { code: 'REPORT_VIEW', name: 'View Reports', module: 'REPORTS' },
    { code: 'REPORT_EXPORT', name: 'Export Reports', module: 'REPORTS' },

    { code: 'AUDIT_VIEW', name: 'View Audit Logs', module: 'AUDIT' },

    { code: 'USER_CREATE', name: 'Create Users', module: 'USERS' },
    { code: 'USER_UPDATE', name: 'Update Users', module: 'USERS' },
    { code: 'USER_DEACTIVATE', name: 'Deactivate Users', module: 'USERS' },

    { code: 'DEPARTMENT_MANAGE', name: 'Manage Departments', module: 'ORGANIZATION' },
    { code: 'LOCATION_MANAGE', name: 'Manage Locations', module: 'ORGANIZATION' },
    { code: 'SETTINGS_MANAGE', name: 'Manage System Settings', module: 'SETTINGS' },
  ];

  const permissions = {};
  for (const perm of permissionList) {
    permissions[perm.code] = await prisma.permission.create({
      data: perm,
    });
  }

  // 3. Setup Roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'Administrator',
      code: 'ADMIN',
      description: 'Full system administrative access to all assets, users, organization settings, and logs.',
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      name: 'Department Manager',
      code: 'MANAGER',
      description: 'Managerial access for approving assignments, transfers, returns, and viewing reports.',
    },
  });

  const itRole = await prisma.role.create({
    data: {
      name: 'IT Staff',
      code: 'IT',
      description: 'Technical asset lifecycle management, specifications, QR codes, and maintenance execution.',
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: 'Employee User',
      code: 'USER',
      description: 'Self-service user access to view assigned assets and file return/maintenance requests.',
    },
  });

  // Assign All Permissions to Admin Role
  for (const p of Object.values(permissions)) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  // Assign Manager Permissions
  const managerPermCodes = [
    'ASSET_VIEW', 'EMPLOYEE_VIEW', 'ASSIGNMENT_CREATE', 'ASSIGNMENT_APPROVE',
    'TRANSFER_CREATE', 'TRANSFER_APPROVE', 'RETURN_CREATE', 'RETURN_APPROVE',
    'MAINTENANCE_CREATE', 'REPORT_VIEW', 'REPORT_EXPORT', 'AUDIT_VIEW'
  ];
  for (const code of managerPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: managerRole.id, permissionId: permissions[code].id },
      });
    }
  }

  // Assign IT Staff Permissions
  const itPermCodes = [
    'ASSET_CREATE', 'ASSET_VIEW', 'ASSET_UPDATE', 'EMPLOYEE_VIEW', 'EMPLOYEE_CREATE',
    'ASSIGNMENT_CREATE', 'TRANSFER_CREATE', 'RETURN_CREATE', 'RETURN_APPROVE',
    'MAINTENANCE_CREATE', 'MAINTENANCE_UPDATE', 'REPORT_VIEW', 'REPORT_EXPORT'
  ];
  for (const code of itPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: itRole.id, permissionId: permissions[code].id },
      });
    }
  }

  // Assign Employee User Permissions
  const userPermCodes = ['ASSET_VIEW', 'MAINTENANCE_CREATE', 'RETURN_CREATE'];
  for (const code of userPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: userRole.id, permissionId: permissions[code].id },
      });
    }
  }

  // 4. Default Department & Location
  const deptIT = await prisma.department.create({
    data: {
      name: 'Information Technology',
      code: 'DEPT-IT',
      description: 'IT Infrastructure & Operations',
    },
  });

  const locHQ = await prisma.location.create({
    data: {
      name: 'Faith Automation HQ',
      code: 'LOC-HQ',
      address: 'Pune Facility, India',
    },
  });

  // 5. Create Default System Administrator
  const passAdmin = await bcrypt.hash('admin123', 10);
  const empAdmin = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-001',
      fullName: 'System Administrator',
      email: 'admin@faithautomation.com',
      phone: '+91 98765 00001',
      designation: 'IT Lead',
      departmentId: deptIT.id,
      locationId: locHQ.id,
      joiningDate: new Date(),
      status: EmployeeStatus.ACTIVE,
    },
  });

  await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: passAdmin,
      employeeId: empAdmin.id,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  // 6. Default System Settings
  const defaultSettings = [
    { key: 'ORG_NAME', value: 'Faith Automation & Engineering', category: 'General', description: 'Organization Display Name' },
    { key: 'WARRANTY_ALERT_DAYS', value: '60', category: 'Asset Configuration', description: 'Days before warranty expiry to trigger system notifications' },
    { key: 'OVERDUE_RETURN_DAYS', value: '3', category: 'Return Settings', description: 'Grace period before flagging return as overdue' },
    { key: 'SYSTEM_VERSION', value: 'v1.0.0', category: 'System Information', description: 'Current System Build Version' },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.create({
      data: setting,
    });
  }

  console.log('✔ Permissions & Roles initialized (ADMIN, MANAGER, IT, USER).');
  console.log('✔ Base organization created (Faith Automation HQ, IT Department).');
  console.log('✔ System Settings initialized.');
  console.log('✔ Administrator created (admin / admin123).\n');

  // Verify final counts
  const [aCount, eCount, lCount, dCount, uCount, rCount, pCount, sCount] = await Promise.all([
    prisma.asset.count(),
    prisma.employee.count(),
    prisma.location.count(),
    prisma.department.count(),
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.systemSetting.count(),
  ]);

  console.log('==================================================');
  console.log('  FRESH SYSTEM STATUS:');
  console.log(`    Assets          : ${aCount} (Completely Empty)`);
  console.log(`    Employees       : ${eCount} (System Administrator)`);
  console.log(`    Locations       : ${lCount} (Faith Automation HQ)`);
  console.log(`    Departments     : ${dCount} (Information Technology)`);
  console.log(`    Users           : ${uCount} (admin)`);
  console.log(`    Roles           : ${rCount} (ADMIN, MANAGER, IT, USER)`);
  console.log(`    Permissions     : ${pCount}`);
  console.log(`    System Settings : ${sCount}`);
  console.log('==================================================');
  console.log('Ready for live data entry!\n');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
