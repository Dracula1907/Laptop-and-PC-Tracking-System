import { PrismaClient, EmployeeStatus, AssetType, AssetStatus, AssetCondition, WorkflowStatus, MaintenanceStatus, AssetAction } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ITAM database seeding...');

  // 1. Permissions
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

  const permissions: Record<string, any> = {};
  for (const perm of permissionList) {
    permissions[perm.code] = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }

  // 2. Roles
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      name: 'Administrator',
      code: 'ADMIN',
      description: 'Full system administrative access to all assets, users, organization settings, and logs.',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { code: 'MANAGER' },
    update: {},
    create: {
      name: 'Department Manager',
      code: 'MANAGER',
      description: 'Managerial access for approving assignments, transfers, returns, and viewing reports.',
    },
  });

  const itRole = await prisma.role.upsert({
    where: { code: 'IT' },
    update: {},
    create: {
      name: 'IT Staff',
      code: 'IT',
      description: 'Technical asset lifecycle management, specifications, QR codes, and maintenance execution.',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { code: 'USER' },
    update: {},
    create: {
      name: 'Employee User',
      code: 'USER',
      description: 'Self-service user access to view assigned assets and file return/maintenance requests.',
    },
  });

  // Assign Permissions to Roles
  const allPermissionIds = Object.values(permissions).map((p) => p.id);
  for (const pId of allPermissionIds) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: pId } },
      update: {},
      create: { roleId: adminRole.id, permissionId: pId },
    });
  }

  const managerPermCodes = [
    'ASSET_VIEW', 'EMPLOYEE_VIEW', 'ASSIGNMENT_CREATE', 'ASSIGNMENT_APPROVE',
    'TRANSFER_CREATE', 'TRANSFER_APPROVE', 'RETURN_CREATE', 'RETURN_APPROVE',
    'MAINTENANCE_CREATE', 'REPORT_VIEW', 'REPORT_EXPORT', 'AUDIT_VIEW'
  ];
  for (const code of managerPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managerRole.id, permissionId: permissions[code].id } },
        update: {},
        create: { roleId: managerRole.id, permissionId: permissions[code].id },
      });
    }
  }

  const itPermCodes = [
    'ASSET_CREATE', 'ASSET_VIEW', 'ASSET_UPDATE', 'EMPLOYEE_VIEW', 'EMPLOYEE_CREATE',
    'ASSIGNMENT_CREATE', 'TRANSFER_CREATE', 'RETURN_CREATE', 'RETURN_APPROVE',
    'MAINTENANCE_CREATE', 'MAINTENANCE_UPDATE', 'REPORT_VIEW', 'REPORT_EXPORT'
  ];
  for (const code of itPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: itRole.id, permissionId: permissions[code].id } },
        update: {},
        create: { roleId: itRole.id, permissionId: permissions[code].id },
      });
    }
  }

  const userPermCodes = ['ASSET_VIEW', 'MAINTENANCE_CREATE', 'RETURN_CREATE'];
  for (const code of userPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: userRole.id, permissionId: permissions[code].id } },
        update: {},
        create: { roleId: userRole.id, permissionId: permissions[code].id },
      });
    }
  }

  // 3. Departments
  const deptIT = await prisma.department.upsert({
    where: { code: 'DEPT-IT' },
    update: {},
    create: { name: 'Information Technology', code: 'DEPT-IT', description: 'IT Infrastructure & Operations' },
  });

  const deptHR = await prisma.department.upsert({
    where: { code: 'DEPT-HR' },
    update: {},
    create: { name: 'Human Resources', code: 'DEPT-HR', description: 'People & Culture Management' },
  });

  const deptENG = await prisma.department.upsert({
    where: { code: 'DEPT-ENG' },
    update: {},
    create: { name: 'Engineering', code: 'DEPT-ENG', description: 'Software & Product Engineering' },
  });

  const deptFIN = await prisma.department.upsert({
    where: { code: 'DEPT-FIN' },
    update: {},
    create: { name: 'Finance & Accounts', code: 'DEPT-FIN', description: 'Financial Planning & Accounting' },
  });

  // 4. Locations
  const locHeadOffice = await prisma.location.upsert({
    where: { code: 'LOC-MUM' },
    update: {},
    create: { name: 'Headquarters', code: 'LOC-MUM', address: 'BKC Financial District, Mumbai, Maharashtra' },
  });

  const locTechPark = await prisma.location.upsert({
    where: { code: 'LOC-BLR' },
    update: {},
    create: { name: 'Tech Park Campus', code: 'LOC-BLR', address: 'Outer Ring Road, Bengaluru, Karnataka' },
  });

  const locHub = await prisma.location.upsert({
    where: { code: 'LOC-PUN' },
    update: {},
    create: { name: 'Innovation Hub', code: 'LOC-PUN', address: 'Hinjewadi Phase 2, Pune, Maharashtra' },
  });

  // 5. Employees
  const empAdmin = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-001' },
    update: {},
    create: {
      employeeCode: 'EMP-001',
      fullName: 'System Administrator',
      email: 'admin@faithautomation.com',
      phone: '+91 98765 00001',
      designation: 'IT Infrastructure Lead',
      departmentId: deptIT.id,
      locationId: locHeadOffice.id,
      joiningDate: new Date('2022-01-15'),
      status: EmployeeStatus.ACTIVE,
    },
  });

  const empManager = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-002' },
    update: {},
    create: {
      employeeCode: 'EMP-002',
      fullName: 'Rajesh Sharma',
      email: 'manager@faithautomation.com',
      phone: '+91 98765 00002',
      designation: 'Engineering Manager',
      departmentId: deptENG.id,
      locationId: locTechPark.id,
      joiningDate: new Date('2022-03-01'),
      status: EmployeeStatus.ACTIVE,
    },
  });

  const empIT = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-003' },
    update: {},
    create: {
      employeeCode: 'EMP-003',
      fullName: 'Priya Patel',
      email: 'it@faithautomation.com',
      phone: '+91 98765 00003',
      designation: 'IT Systems Engineer',
      departmentId: deptIT.id,
      locationId: locHeadOffice.id,
      joiningDate: new Date('2023-05-10'),
      status: EmployeeStatus.ACTIVE,
    },
  });

  const empUser = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-004' },
    update: {},
    create: {
      employeeCode: 'EMP-004',
      fullName: 'Ananya Verma',
      email: 'user@faithautomation.com',
      phone: '+91 98765 00004',
      designation: 'Senior Frontend Developer',
      departmentId: deptENG.id,
      locationId: locTechPark.id,
      joiningDate: new Date('2023-08-01'),
      status: EmployeeStatus.ACTIVE,
    },
  });

  const empUser2 = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-005' },
    update: {},
    create: {
      employeeCode: 'EMP-005',
      fullName: 'Vikram Joshi',
      email: 'vikram.j@faithautomation.com',
      phone: '+91 98765 00005',
      designation: 'HR Executive',
      departmentId: deptHR.id,
      locationId: locHub.id,
      joiningDate: new Date('2024-01-10'),
      status: EmployeeStatus.ACTIVE,
    },
  });

  // 6. Users (with bcrypt hashed passwords)
  const passAdmin = await bcrypt.hash('admin123', 10);
  const passManager = await bcrypt.hash('manager123', 10);
  const passIT = await bcrypt.hash('it123', 10);
  const passUser = await bcrypt.hash('user123', 10);

  const userAdminObj = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: passAdmin,
      employeeId: empAdmin.id,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  const userManagerObj = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      passwordHash: passManager,
      employeeId: empManager.id,
      roleId: managerRole.id,
      isActive: true,
    },
  });

  const userITObj = await prisma.user.upsert({
    where: { username: 'it' },
    update: {},
    create: {
      username: 'it',
      passwordHash: passIT,
      employeeId: empIT.id,
      roleId: itRole.id,
      isActive: true,
    },
  });

  const userUserObj = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      passwordHash: passUser,
      employeeId: empUser.id,
      roleId: userRole.id,
      isActive: true,
    },
  });

  // 7. Assets & Specifications
  const laptop1 = await prisma.asset.upsert({
    where: { assetCode: 'AST-000001' },
    update: {},
    create: {
      assetCode: 'AST-000001',
      assetType: AssetType.LAPTOP,
      laptopNumber: 'LTP-ENG-001',
      serialNumber: 'C02FX123MD6R',
      manufacturer: 'Apple',
      model: 'MacBook Pro 16" (M2 Max)',
      status: AssetStatus.ASSIGNED,
      condition: AssetCondition.EXCELLENT,
      currentHolderId: empUser.id,
      departmentId: deptENG.id,
      locationId: locTechPark.id,
      purchaseDate: new Date('2023-09-01'),
      purchaseCost: 249999.00,
      vendor: 'Apple Authorized Enterprise',
      warrantyStart: new Date('2023-09-01'),
      warrantyEnd: new Date('2026-09-01'),
      notes: 'Assigned to Senior Frontend Developer',
      specifications: {
        create: {
          processor: 'Apple M2 Max (12-core CPU, 38-core GPU)',
          ram: '32 GB Unified Memory',
          storage: '1 TB NVMe SSD',
          storageType: 'SSD',
          gpu: '38-Core Integrated GPU',
          displaySize: '16.2-inch Liquid Retina XDR',
          operatingSystem: 'macOS',
          operatingSystemVersion: 'Sonoma 14.5',
          macAddress: 'F4:D4:88:A1:B2:C3',
          ipAddress: '192.168.1.104',
          batteryHealth: '98%',
        },
      },
    },
  });

  const laptop2 = await prisma.asset.upsert({
    where: { assetCode: 'AST-000002' },
    update: {},
    create: {
      assetCode: 'AST-000002',
      assetType: AssetType.LAPTOP,
      laptopNumber: 'LTP-ENG-002',
      serialNumber: '5CG34512XY',
      manufacturer: 'Lenovo',
      model: 'ThinkPad X1 Carbon Gen 11',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      departmentId: deptENG.id,
      locationId: locTechPark.id,
      purchaseDate: new Date('2023-11-15'),
      purchaseCost: 165000.00,
      vendor: 'Lenovo Commercial Solutions',
      warrantyStart: new Date('2023-11-15'),
      warrantyEnd: new Date('2026-11-15'),
      notes: 'Ready for new engineer assignment',
      specifications: {
        create: {
          processor: 'Intel Core i7-1365U vPro',
          ram: '16 GB LPDDR5',
          storage: '512 GB PCIe Gen4 SSD',
          storageType: 'SSD',
          gpu: 'Intel Iris Xe Graphics',
          displaySize: '14.0-inch WUXGA IPS',
          operatingSystem: 'Windows',
          operatingSystemVersion: 'Windows 11 Pro',
          macAddress: '00:1B:44:11:3A:B7',
          ipAddress: '192.168.1.108',
          batteryHealth: '100%',
        },
      },
    },
  });

  const laptop3 = await prisma.asset.upsert({
    where: { assetCode: 'AST-000003' },
    update: {},
    create: {
      assetCode: 'AST-000003',
      assetType: AssetType.LAPTOP,
      laptopNumber: 'LTP-IT-001',
      serialNumber: '7X88902Q11',
      manufacturer: 'Dell',
      model: 'Latitude 7440',
      status: AssetStatus.UNDER_REPAIR,
      condition: AssetCondition.FAIR,
      departmentId: deptIT.id,
      locationId: locHeadOffice.id,
      purchaseDate: new Date('2022-06-10'),
      purchaseCost: 128000.00,
      vendor: 'Dell Enterprise Direct',
      warrantyStart: new Date('2022-06-10'),
      warrantyEnd: new Date('2025-06-10'),
      notes: 'Keyboard key stickiness reported',
      specifications: {
        create: {
          processor: 'Intel Core i5-1245U',
          ram: '16 GB DDR4',
          storage: '512 GB NVMe SSD',
          storageType: 'SSD',
          gpu: 'Intel Iris Xe',
          displaySize: '14-inch FHD',
          operatingSystem: 'Windows',
          operatingSystemVersion: 'Windows 11 Pro',
          batteryHealth: '85%',
        },
      },
    },
  });

  const monitor1 = await prisma.asset.upsert({
    where: { assetCode: 'AST-000004' },
    update: {},
    create: {
      assetCode: 'AST-000004',
      assetType: AssetType.MONITOR,
      assetNumber: 'MON-ENG-001',
      serialNumber: 'CN-0M3344-74261',
      manufacturer: 'Dell',
      model: 'UltraSharp U2723QE 27" 4K USB-C Hub Monitor',
      status: AssetStatus.ASSIGNED,
      condition: AssetCondition.EXCELLENT,
      currentHolderId: empUser.id,
      departmentId: deptENG.id,
      locationId: locTechPark.id,
      purchaseDate: new Date('2023-10-01'),
      purchaseCost: 54000.00,
      vendor: 'Dell Enterprise Direct',
      warrantyStart: new Date('2023-10-01'),
      warrantyEnd: new Date('2026-10-01'),
    },
  });

  const headset1 = await prisma.asset.upsert({
    where: { assetCode: 'AST-000005' },
    update: {},
    create: {
      assetCode: 'AST-000005',
      assetType: AssetType.HEADSET,
      assetNumber: 'HST-HR-001',
      serialNumber: 'JAB-7599-829',
      manufacturer: 'Jabra',
      model: 'Evolve2 65 Wireless Headset',
      status: AssetStatus.ASSIGNED,
      condition: AssetCondition.GOOD,
      currentHolderId: empUser2.id,
      departmentId: deptHR.id,
      locationId: locHub.id,
      purchaseDate: new Date('2024-01-15'),
      purchaseCost: 18500.00,
      vendor: 'Jabra Partner Solutions',
      warrantyStart: new Date('2024-01-15'),
      warrantyEnd: new Date('2026-01-15'),
    },
  });

  // 8. Assignments
  await prisma.assetAssignment.create({
    data: {
      assetId: laptop1.id,
      employeeId: empUser.id,
      assignedById: userAdminObj.id,
      approvedById: userManagerObj.id,
      assignedAt: new Date('2023-09-02'),
      conditionAtAssignment: AssetCondition.EXCELLENT,
      remarks: 'Primary development workstation assigned upon onboarding.',
      status: WorkflowStatus.ACTIVE,
    },
  });

  // 9. Maintenance Record
  const maint1 = await prisma.maintenanceRecord.create({
    data: {
      assetId: laptop3.id,
      reportedById: userITObj.id,
      issueTitle: 'Keyboard Spacebar Intermittent Failure',
      issueDescription: 'Spacebar key requires firm press. Needs top uppercase key replacement under warranty.',
      reportedAt: new Date('2026-08-20'),
      repairStatus: MaintenanceStatus.IN_PROGRESS,
      technician: 'Suresh Kumar (Dell Onsite Tech)',
      serviceProvider: 'Dell Authorized Service',
      repairStartDate: new Date('2026-08-22'),
      repairCost: 0.00,
      remarks: 'Covered under extended corporate warranty.',
    },
  });

  await prisma.maintenancePart.create({
    data: {
      maintenanceId: maint1.id,
      partName: 'Dell Latitude 7440 US English Backlit Keyboard Module',
      quantity: 1,
      cost: 0.0,
      remarks: 'Warranty replacement component',
    },
  });

  // 10. Status History Records
  await prisma.assetStatusHistory.createMany({
    data: [
      {
        assetId: laptop1.id,
        action: AssetAction.CREATED,
        newStatus: AssetStatus.AVAILABLE,
        performedById: userAdminObj.id,
        remarks: 'Asset registered in system.',
      },
      {
        assetId: laptop1.id,
        action: AssetAction.ASSIGNED,
        previousStatus: AssetStatus.AVAILABLE,
        newStatus: AssetStatus.ASSIGNED,
        newHolderId: empUser.id,
        performedById: userAdminObj.id,
        remarks: 'Assigned to Ananya Verma.',
      },
      {
        assetId: laptop3.id,
        action: AssetAction.MAINTENANCE_STARTED,
        previousStatus: AssetStatus.AVAILABLE,
        newStatus: AssetStatus.UNDER_REPAIR,
        performedById: userITObj.id,
        remarks: 'Sent for keyboard repair.',
      },
    ],
  });

  // 11. System Settings
  const settings = [
    { key: 'ORG_NAME', value: 'Faith Automation & Engineering', category: 'General', description: 'Organization Display Name' },
    { key: 'WARRANTY_ALERT_DAYS', value: '60', category: 'Asset Configuration', description: 'Days before warranty expiry to trigger system notifications' },
    { key: 'OVERDUE_RETURN_DAYS', value: '3', category: 'Return Settings', description: 'Grace period before flagging return as overdue' },
    { key: 'SYSTEM_VERSION', value: 'v1.0.0', category: 'System Information', description: 'Current System Build Version' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // 12. Sample Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: userAdminObj.id,
        type: 'MAINTENANCE_PENDING',
        title: 'Maintenance In Progress',
        message: 'Asset AST-000003 (Dell Latitude 7440) is currently under repair by Dell Authorized Service.',
        entityType: 'Asset',
        entityId: laptop3.id,
        isRead: false,
      },
      {
        userId: userManagerObj.id,
        type: 'ASSIGNMENT_PENDING',
        title: 'Assignment Active',
        message: 'Asset AST-000001 has been assigned to Ananya Verma.',
        entityType: 'Asset',
        entityId: laptop1.id,
        isRead: true,
      },
    ],
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('🔑 Development Test Logins:');
  console.log('   ADMIN   : admin   / admin123');
  console.log('   MANAGER : manager / manager123');
  console.log('   IT      : it      / it123');
  console.log('   USER    : user    / user123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
