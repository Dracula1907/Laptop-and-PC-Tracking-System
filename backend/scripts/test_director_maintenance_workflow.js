const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = require('../dist/app').default;

const TEST_PORT = 5999;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function request(method, path, body = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const status = res.status;
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  return { status, data };
}

let server;
let adminToken;
let directorToken;
let managerToken;

async function runTests() {
  console.log('====================================================');
  console.log('STARTING DIRECTOR & MAINTENANCE APPROVAL TEST SUITE');
  console.log('====================================================\n');

  // Start HTTP test server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✓ Test HTTP server listening on port ${TEST_PORT}`);

  let testAsset;
  let createdMaintenance1;
  let createdApprovalReq1;
  let createdMaintenance2;
  let createdApprovalReq2;

  try {
    // ----------------------------------------------------
    // TEST 1: Admin Retains Full System Control
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Admin Retains System Control ---');
    const adminLogin = await request('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    if (adminLogin.status !== 200 || !adminLogin.data?.data?.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    }
    adminToken = adminLogin.data.data.token;
    console.log('✓ Admin login successful');

    const usersRes = await request('GET', '/users', null, adminToken);
    if (usersRes.status !== 200) {
      throw new Error(`Admin /users access failed with status ${usersRes.status}`);
    }
    console.log(`✓ Admin successfully accessed /api/users (${usersRes.data?.data?.length || 0} users found)`);

    const rolesRes = await request('GET', '/users/roles', null, adminToken);
    if (rolesRes.status !== 200) {
      throw new Error(`Admin /users/roles access failed with status ${rolesRes.status}`);
    }
    console.log(`✓ Admin successfully accessed /api/users/roles (${rolesRes.data?.data?.length || 0} roles found)`);

    // ----------------------------------------------------
    // TEST 2: Director Login & Operational Scope
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Director Login & Scope Verification ---');
    const directorLogin = await request('POST', '/auth/login', {
      username: 'director',
      password: 'director123',
    });
    if (directorLogin.status !== 200 || !directorLogin.data?.data?.token) {
      throw new Error(`Director login failed: ${JSON.stringify(directorLogin.data)}`);
    }
    directorToken = directorLogin.data.data.token;
    const directorUser = directorLogin.data.data.user;
    if (directorUser.role?.code !== 'DIRECTOR') {
      throw new Error(`Expected role DIRECTOR, got ${directorUser.role?.code}`);
    }
    console.log(`✓ Director login successful. Role: ${directorUser.role.code}`);

    // Verify Director cannot access admin-only user management
    const directorUserAccess = await request('GET', '/users', null, directorToken);
    if (directorUserAccess.status !== 403) {
      throw new Error(`Director should be forbidden (403) from /api/users, got ${directorUserAccess.status}`);
    }
    console.log('✓ Director correctly forbidden (403) from Admin User Management (/api/users)');

    // Verify Director can access operational Approval Center
    const directorApprovals = await request('GET', '/approvals', null, directorToken);
    if (directorApprovals.status !== 200) {
      throw new Error(`Director should have access to /api/approvals, got ${directorApprovals.status}`);
    }
    console.log('✓ Director successfully accessed Approval Center (/api/approvals)');

    // ----------------------------------------------------
    // TEST 3: Manager Maintenance Submission with Cost
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Manager Maintenance Request Submission ---');
    const managerLogin = await request('POST', '/auth/login', {
      username: 'manager',
      password: 'manager123',
    });
    if (managerLogin.status !== 200 || !managerLogin.data?.data?.token) {
      throw new Error(`Manager login failed: ${JSON.stringify(managerLogin.data)}`);
    }
    managerToken = managerLogin.data.data.token;
    console.log('✓ Manager login successful');

    // Find an active asset to use for testing
    testAsset = await prisma.asset.findFirst({
      where: { status: { notIn: ['RETIRED', 'SCRAPPED'] } },
    });
    if (!testAsset) throw new Error('No test asset found in database');
    console.log(`✓ Selected test asset: ${testAsset.assetCode} (${testAsset.companyAssetId || 'No Company ID'})`);

    const maint1Res = await request(
      'POST',
      '/maintenance',
      {
        assetId: testAsset.id,
        maintenanceType: 'CORRECTIVE',
        issueTitle: 'Display flicker and keyboard backlight failure',
        issueDescription: 'Laptop screen exhibits random horizontal tearing. Requires panel inspection and OEM servicing.',
        priority: 'HIGH',
        serviceProvider: 'Dell Authorized Service',
        technician: 'External Certified Tech',
        estimatedCost: 12500,
      },
      managerToken
    );

    if (maint1Res.status !== 201 && maint1Res.status !== 200) {
      throw new Error(`Failed to create maintenance ticket: ${JSON.stringify(maint1Res.data)}`);
    }

    createdMaintenance1 = maint1Res.data.data;
    if (createdMaintenance1.approvalStatus !== 'PENDING') {
      throw new Error(`Expected maintenance approvalStatus PENDING, got ${createdMaintenance1.approvalStatus}`);
    }
    console.log(`✓ Maintenance ticket 1 created: ${createdMaintenance1.maintenanceCode} (approvalStatus: ${createdMaintenance1.approvalStatus}, Cost: ₹12,500)`);

    // Verify ApprovalRequest was created with targetRole DIRECTOR
    createdApprovalReq1 = await prisma.approvalRequest.findFirst({
      where: {
        relatedEntityType: 'MaintenanceRecord',
        relatedEntityId: createdMaintenance1.id,
      },
    });

    if (!createdApprovalReq1) {
      throw new Error('ApprovalRequest was not created for the maintenance ticket');
    }
    if (createdApprovalReq1.targetRole !== 'DIRECTOR') {
      throw new Error(`Expected targetRole DIRECTOR, got ${createdApprovalReq1.targetRole}`);
    }
    if (createdApprovalReq1.status !== 'PENDING') {
      throw new Error(`Expected status PENDING, got ${createdApprovalReq1.status}`);
    }
    console.log(`✓ ApprovalRequest created: ${createdApprovalReq1.requestCode} (targetRole: ${createdApprovalReq1.targetRole}, status: ${createdApprovalReq1.status})`);

    // ----------------------------------------------------
    // TEST 4: Unauthorized Approval Protection (Manager blocked)
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Unauthorized Approval Protection ---');
    const managerApproveAttempt = await request(
      'POST',
      `/approvals/${createdApprovalReq1.id}/approve`,
      { comment: 'Manager trying to approve' },
      managerToken
    );

    if (managerApproveAttempt.status !== 403 && managerApproveAttempt.status !== 400 && managerApproveAttempt.status !== 500) {
      throw new Error(`Expected Manager approval attempt to be blocked, but got status ${managerApproveAttempt.status}`);
    }
    console.log(`✓ Manager approval attempt blocked as expected. Message: "${managerApproveAttempt.data?.message}"`);

    // ----------------------------------------------------
    // TEST 5: Director Approves Maintenance Request
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Director Approval Execution ---');
    const directorApproveRes = await request(
      'POST',
      `/approvals/${createdApprovalReq1.id}/approve`,
      { comment: 'Approved for external authorized service dispatch.' },
      directorToken
    );

    if (directorApproveRes.status !== 200) {
      throw new Error(`Director approval failed: ${JSON.stringify(directorApproveRes.data)}`);
    }
    console.log('✓ Director successfully executed approval transaction');

    // Verify DB states after approval
    const updatedApproval1 = await prisma.approvalRequest.findUnique({
      where: { id: createdApprovalReq1.id },
    });
    const updatedMaint1 = await prisma.maintenanceRecord.findUnique({
      where: { id: createdMaintenance1.id },
    });

    if (updatedApproval1.status !== 'APPROVED') {
      throw new Error(`Expected ApprovalRequest status APPROVED, got ${updatedApproval1.status}`);
    }
    if (updatedMaint1.approvalStatus !== 'APPROVED') {
      throw new Error(`Expected MaintenanceRecord approvalStatus APPROVED, got ${updatedMaint1.approvalStatus}`);
    }
    if (!updatedMaint1.approvedById) {
      throw new Error('Expected MaintenanceRecord approvedById to be set');
    }
    console.log(`✓ PostgreSQL DB state verified: ApprovalRequest is APPROVED, MaintenanceRecord is APPROVED, approvedById is recorded.`);

    // ----------------------------------------------------
    // TEST 6: Duplicate Approval Protection
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Duplicate Approval Protection ---');
    const duplicateApprove = await request(
      'POST',
      `/approvals/${createdApprovalReq1.id}/approve`,
      { comment: 'Second approve attempt' },
      directorToken
    );

    if (duplicateApprove.status === 200) {
      throw new Error('Duplicate approval should have been rejected!');
    }
    console.log(`✓ Duplicate approval correctly rejected. Message: "${duplicateApprove.data?.message}"`);

    // ----------------------------------------------------
    // TEST 7: Director Rejection Workflow & Reason Persistence
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Director Rejection Workflow ---');
    const maint2Res = await request(
      'POST',
      '/maintenance',
      {
        assetId: testAsset.id,
        maintenanceType: 'UPGRADE',
        issueTitle: 'Motherboard replacement proposal',
        issueDescription: 'Proposed complete motherboard swap on aging device.',
        priority: 'MEDIUM',
        estimatedCost: 8000,
      },
      managerToken
    );

    createdMaintenance2 = maint2Res.data.data;
    createdApprovalReq2 = await prisma.approvalRequest.findFirst({
      where: {
        relatedEntityType: 'MaintenanceRecord',
        relatedEntityId: createdMaintenance2.id,
      },
    });

    console.log(`✓ Maintenance ticket 2 created: ${createdMaintenance2.maintenanceCode} (Cost: ₹8,000)`);

    const rejectionReason = 'Cost exceeds budget for this older unit. Recommend retirement instead.';
    const directorRejectRes = await request(
      'POST',
      `/approvals/${createdApprovalReq2.id}/reject`,
      { rejectionReason },
      directorToken
    );

    if (directorRejectRes.status !== 200) {
      throw new Error(`Director rejection failed: ${JSON.stringify(directorRejectRes.data)}`);
    }
    console.log('✓ Director successfully executed rejection transaction');

    const updatedMaint2 = await prisma.maintenanceRecord.findUnique({
      where: { id: createdMaintenance2.id },
    });
    const updatedApproval2 = await prisma.approvalRequest.findUnique({
      where: { id: createdApprovalReq2.id },
    });

    if (updatedApproval2.status !== 'REJECTED') {
      throw new Error(`Expected ApprovalRequest status REJECTED, got ${updatedApproval2.status}`);
    }
    if (updatedMaint2.approvalStatus !== 'REJECTED') {
      throw new Error(`Expected MaintenanceRecord approvalStatus REJECTED, got ${updatedMaint2.approvalStatus}`);
    }
    if (updatedMaint2.rejectionReason !== rejectionReason) {
      throw new Error(`Expected rejectionReason to match, got "${updatedMaint2.rejectionReason}"`);
    }
    console.log(`✓ PostgreSQL DB state verified: MaintenanceRecord approvalStatus is REJECTED, rejectionReason: "${updatedMaint2.rejectionReason}"`);

    // ----------------------------------------------------
    // TEST 8: Progression Block on Rejected / Unapproved Tickets
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Progression Block on Rejected Tickets ---');
    const assignAttemptOnRejected = await request(
      'POST',
      `/maintenance/${createdMaintenance2.id}/assign`,
      {
        technician: 'Tech A',
        serviceProvider: 'Internal IT',
      },
      adminToken
    );

    if (assignAttemptOnRejected.status === 200) {
      throw new Error('Technician assignment on rejected maintenance ticket should have been blocked!');
    }
    console.log(`✓ Technician assignment on rejected ticket blocked as expected. Message: "${assignAttemptOnRejected.data?.message}"`);

    const completeAttemptOnRejected = await request(
      'POST',
      `/maintenance/${createdMaintenance2.id}/complete`,
      {
        resolution: 'Fixed anyway',
        conditionAfter: 'GOOD',
      },
      adminToken
    );

    if (completeAttemptOnRejected.status === 200) {
      throw new Error('Completion of rejected maintenance ticket should have been blocked!');
    }
    console.log(`✓ Completion of rejected ticket blocked as expected. Message: "${completeAttemptOnRejected.data?.message}"`);

    console.log('\n====================================================');
    console.log('ALL 8 DIRECTOR & MAINTENANCE WORKFLOW TESTS PASSED! ');
    console.log('====================================================\n');
  } finally {
    // Clean up test maintenance records and approval requests
    try {
      if (createdApprovalReq1) {
        await prisma.approvalHistory.deleteMany({ where: { approvalRequestId: createdApprovalReq1.id } });
        await prisma.approvalRequest.deleteMany({ where: { id: createdApprovalReq1.id } });
      }
      if (createdApprovalReq2) {
        await prisma.approvalHistory.deleteMany({ where: { approvalRequestId: createdApprovalReq2.id } });
        await prisma.approvalRequest.deleteMany({ where: { id: createdApprovalReq2.id } });
      }
      if (createdMaintenance1) {
        await prisma.maintenanceRecord.deleteMany({ where: { id: createdMaintenance1.id } });
      }
      if (createdMaintenance2) {
        await prisma.maintenanceRecord.deleteMany({ where: { id: createdMaintenance2.id } });
      }
      if (testAsset) {
        await prisma.asset.update({
          where: { id: testAsset.id },
          data: { status: testAsset.status },
        });
      }
      console.log('✓ Cleaned up ephemeral test records.');
    } catch (cleanupErr) {
      console.error('Cleanup notice:', cleanupErr.message);
    }

    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
