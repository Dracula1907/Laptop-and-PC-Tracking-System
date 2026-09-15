const { PrismaClient, EmployeeStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('  FAITH AUTOMATION IT INVENTORY — DATABASE CLEANUP');
  console.log('====================================================');
  console.log('Target: Local PostgreSQL Database (itam_db)');
  console.log('Resetting database to a pristine baseline...\n');

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
    { code: 'MAINTENANCE_APPROVE', name: 'Approve Maintenance Requests', module: 'MAINTENANCE' },

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

  const directorRole = await prisma.role.create({
    data: {
      name: 'Director',
      code: 'DIRECTOR',
      description: 'Executive management authority with comprehensive operational oversight and maintenance approval control.',
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

  const guardRole = await prisma.role.create({
    data: {
      name: 'Security Guard',
      code: 'SECURITY_GUARD',
      description: 'Gate pass and laptop physical entry/exit verification and monitoring.',
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

  // Assign Director Permissions
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
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: directorRole.id, permissionId: permissions[code].id },
      });
    }
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

  // Assign Security Guard Permissions
  const guardPermCodes = ['ASSET_VIEW'];
  for (const code of guardPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: guardRole.id, permissionId: permissions[code].id },
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

  // 5. Create Default Quick Accounts
  const standardAccounts = [
    { username: 'admin', pass: 'admin123', roleId: adminRole.id, empCode: 'EMP-001', name: 'System Administrator', email: 'admin@faithautomation.com' },
    { username: 'director', pass: 'director123', roleId: directorRole.id, empCode: 'EMP-002', name: 'Operations Director', email: 'director@faithautomation.com' },
    { username: 'manager', pass: 'manager123', roleId: managerRole.id, empCode: 'EMP-003', name: 'Engineering Manager', email: 'manager@faithautomation.com' },
    { username: 'it', pass: 'it123', roleId: itRole.id, empCode: 'EMP-004', name: 'IT Support Specialist', email: 'it@faithautomation.com' },
    { username: 'guard', pass: 'guard123', roleId: guardRole.id, empCode: 'EMP-005', name: 'Security Guard Lead', email: 'guard@faithautomation.com' },
    { username: 'user', pass: 'user123', roleId: userRole.id, empCode: 'EMP-006', name: 'Standard Employee', email: 'user@faithautomation.com' },
  ];

  for (const acc of standardAccounts) {
    const passHash = await bcrypt.hash(acc.pass, 10);
    const emp = await prisma.employee.create({
      data: {
        employeeCode: acc.empCode,
        fullName: acc.name,
        email: acc.email,
        departmentId: deptIT.id,
        locationId: locHQ.id,
        status: EmployeeStatus.ACTIVE,
      },
    });

    await prisma.user.create({
      data: {
        username: acc.username,
        passwordHash: passHash,
        employeeId: emp.id,
        roleId: acc.roleId,
        isActive: true,
      },
    });
  }

  // 6. Approval Policy for Maintenance
  await prisma.approvalPolicy.create({
    data: {
      operationType: 'MAINTENANCE',
      requiresApproval: true,
      approverRole: 'DIRECTOR',
      allowSelfApproval: false,
      description: 'Maintenance requests with cost require Director approval.',
    },
  });

  // 7. Default System Settings
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

  console.log('✔ Permissions & Roles initialized (ADMIN, DIRECTOR, MANAGER, IT, SECURITY_GUARD, USER).');
  console.log('✔ Base organization created (Faith Automation HQ, IT Department).');
  console.log('✔ Standard quick login accounts initialized (admin, director, manager, it, guard, user).');
  console.log('✔ Approval policies and system settings initialized.\n');

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

  console.log('====================================================');
  console.log('  FRESH SYSTEM BASELINE STATUS:');
  console.log(`    Assets          : ${aCount} (Completely Empty)`);
  console.log(`    Employees       : ${eCount} (Standard Base Accounts)`);
  console.log(`    Locations       : ${lCount} (Faith Automation HQ)`);
  console.log(`    Departments     : ${dCount} (Information Technology)`);
  console.log(`    Users           : ${uCount} (admin, director, manager, it, guard, user)`);
  console.log(`    Roles           : ${rCount} (ADMIN, DIRECTOR, MANAGER, IT, GUARD, USER)`);
  console.log(`    Permissions     : ${pCount}`);
  console.log(`    System Settings : ${sCount}`);
  console.log('====================================================');
  console.log('System is ready for clean production operations!\n');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
