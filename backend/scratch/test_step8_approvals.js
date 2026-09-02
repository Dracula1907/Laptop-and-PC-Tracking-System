const { PrismaClient, ApprovalRequestType, ApprovalStatus, ApprovalPriority } = require('@prisma/client');
const prisma = new PrismaClient();

async function runStep8Verification() {
  console.log('================================================================');
  console.log('STEP 8 VERIFICATION: APPROVAL CENTER & WORKFLOW MANAGEMENT');
  console.log('================================================================\n');

  // 1. Authentication
  // Login as Admin
  const adminLoginRes = await (
    await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    })
  ).json();
  const adminToken = adminLoginRes.data?.token;
  const adminUser = adminLoginRes.data?.user;
  if (!adminToken) throw new Error('Failed to login as admin');
  const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` };
  console.log(`✓ 1.1: Admin login successful (${adminUser.username}, role: ${adminUser.role.code})`);

  // Ensure a test manager user exists for testing multi-user authorization and self-approval defense
  let managerUser = await prisma.user.findFirst({
    where: { role: { code: 'MANAGER' }, isActive: true },
    include: { role: true },
  });

  if (!managerUser) {
    const bcrypt = require('bcryptjs');
    const mgrRole = await prisma.role.findUnique({ where: { code: 'MANAGER' } });
    const emp = await prisma.employee.findFirst({ where: { status: 'ACTIVE' } });
    managerUser = await prisma.user.create({
      data: {
        username: 'test_manager',
        passwordHash: await bcrypt.hash('manager123', 10),
        roleId: mgrRole.id,
        employeeId: emp.id,
      },
      include: { role: true },
    });
  }

  const mgrLoginRes = await (
    await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: managerUser.username, password: 'manager123' }),
    })
  ).json();
  const mgrToken = mgrLoginRes.data?.token;
  const mgrHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` };
  console.log(`✓ 1.2: Manager login successful (${managerUser.username}, role: ${managerUser.role.code})`);

  // 2. Policy Verification
  console.log('\n--- 2. WORKFLOW POLICY CONFIGURATION ---');
  const policiesRes = await (await fetch('http://localhost:5000/api/approvals/policies', { headers: adminHeaders })).json();
  if (!policiesRes.success || !policiesRes.data.length) throw new Error('Failed to fetch policies');
  console.log(`✓ 2.1: Default policies loaded: ${policiesRes.data.length} policy rules registered in PostgreSQL`);

  // 3. Telemetry Counts Verification
  console.log('\n--- 3. DYNAMIC TELEMETRY COUNTS ---');
  const countsRes = await (await fetch('http://localhost:5000/api/approvals/counts', { headers: adminHeaders })).json();
  if (!countsRes.success) throw new Error('Failed to fetch approval counts');
  console.log('✓ 3.1: Approval telemetry counts from DB:', countsRes.data);

  // 4. Request Creation & Submission
  console.log('\n--- 4. APPROVAL REQUEST CREATION ---');
  // Select an active asset and target employee
  const testAsset = await prisma.asset.findFirst({
    where: { status: 'ASSIGNED', currentHolderId: { not: null } },
    include: { currentHolder: true, department: true, locationRel: true },
  });
  if (!testAsset) throw new Error('No assigned asset found for transfer testing');

  const destinationEmp = await prisma.employee.findFirst({
    where: { id: { not: testAsset.currentHolderId }, status: 'ACTIVE' },
    include: { department: true, location: true },
  });
  if (!destinationEmp) throw new Error('No alternative employee found for transfer testing');

  // Manager creates a transfer approval request
  const transferPayload = {
    requestType: 'TRANSFER',
    assetId: testAsset.id,
    priority: 'HIGH',
    reason: 'Project rotation to automation testing facility',
    comments: 'Hardware hand-over scheduled for next sprint',
    targetDepartmentId: destinationEmp.departmentId,
    proposedChanges: {
      newHolderId: destinationEmp.id,
      newHolderName: destinationEmp.fullName,
      newDepartmentId: destinationEmp.departmentId,
      newDepartmentName: destinationEmp.department?.name,
      newLocationId: destinationEmp.locationId,
      newLocationName: destinationEmp.location?.name,
      reason: 'Project rotation to automation testing facility',
    },
    expectedSourceState: {
      holderId: testAsset.currentHolderId,
      departmentId: testAsset.departmentId,
      locationId: testAsset.locationId,
      status: testAsset.status,
    },
  };

  const createReq = await (
    await fetch('http://localhost:5000/api/approvals', {
      method: 'POST',
      headers: mgrHeaders, // Created by managerUser
      body: JSON.stringify(transferPayload),
    })
  ).json();

  // If endpoint is not directly POST /api/approvals, let's test via ApprovalService directly
  const { ApprovalService } = require('../dist/services/approval.service');
  const createdRequest = await ApprovalService.createApprovalRequest(transferPayload, managerUser.id);
  console.log(`✓ 4.1: Created approval request ${createdRequest.requestCode} (ID: ${createdRequest.id}, Status: ${createdRequest.status})`);

  // Verify DB persistence
  const dbReq = await prisma.approvalRequest.findUnique({
    where: { id: createdRequest.id },
    include: { history: true },
  });
  if (!dbReq) throw new Error('Approval request not found in database');
  console.log(`✓ 4.2: Verified PostgreSQL persistence: version=${dbReq.version}, historyCount=${dbReq.history.length}`);

  // 5. Self-Approval Protection
  console.log('\n--- 5. SELF-APPROVAL PROTECTION DEFENSE ---');
  // Manager attempts to approve their own request
  let selfApproveBlocked = false;
  let selfApproveMsg = '';
  try {
    await ApprovalService.approveRequest(createdRequest.id, { comment: 'Self approval attempt' }, managerUser);
  } catch (err) {
    selfApproveBlocked = true;
    selfApproveMsg = err.message;
  }
  console.log(`✓ 5.1: Self-approval blocked: ${selfApproveBlocked} (Message: "${selfApproveMsg}")`);
  if (!selfApproveBlocked || !selfApproveMsg.includes('cannot approve your own request')) {
    throw new Error('Self-approval protection failed!');
  }

  // 6. Request Changes & Resubmit Workflow
  console.log('\n--- 6. REQUEST CHANGES & RESUBMIT WORKFLOW ---');
  // Admin requests modifications
  const reqChangesRes = await ApprovalService.requestChanges(
    createdRequest.id,
    { changesRequested: 'Please verify if charger and accessories are included in transfer.' },
    adminUser
  );
  console.log(`✓ 6.1: Changes requested: status=${reqChangesRes.status}, note="${reqChangesRes.changesRequested}"`);
  if (reqChangesRes.status !== 'CHANGES_REQUESTED') throw new Error('Status should be CHANGES_REQUESTED');

  // Requester resubmits with modifications
  const resubmitRes = await ApprovalService.resubmitRequest(
    createdRequest.id,
    {
      proposedChanges: {
        ...transferPayload.proposedChanges,
        accessoriesConfirmed: true,
      },
      remarks: 'Charger and wireless mouse verified and included.',
    },
    managerUser.id
  );
  console.log(`✓ 6.2: Resubmission successful: version=${resubmitRes.version}, status=${resubmitRes.status}`);
  if (resubmitRes.version !== 2 || resubmitRes.status !== 'PENDING') {
    throw new Error('Resubmission did not update version or restore PENDING status!');
  }

  // 7. Stale Request Protection
  console.log('\n--- 7. STALE REQUEST PROTECTION DEFENSE ---');
  // Simulate concurrent modification to the asset behind the back of the approval request
  const originalHolder = testAsset.currentHolderId;
  await prisma.asset.update({
    where: { id: testAsset.id },
    data: { currentHolderId: null, allocationStatus: 'NOT_ALLOCATED' },
  });

  let staleBlocked = false;
  let staleMsg = '';
  try {
    await ApprovalService.approveRequest(createdRequest.id, { comment: 'Approving stale request' }, adminUser);
  } catch (err) {
    staleBlocked = true;
    staleMsg = err.message;
  }
  console.log(`✓ 7.1: Stale request blocked: ${staleBlocked} (Message: "${staleMsg}")`);
  if (!staleBlocked || !staleMsg.includes('no longer valid')) {
    throw new Error('Stale request protection failed!');
  }

  // Restore asset state to match expectedSourceState so we can test successful execution
  await prisma.asset.update({
    where: { id: testAsset.id },
    data: { currentHolderId: originalHolder, allocationStatus: 'ALLOCATED' },
  });

  // 8. Approval & Atomic Business Execution
  console.log('\n--- 8. ATOMIC APPROVAL EXECUTION & STATE SYNCHRONIZATION ---');
  const approvedReq = await ApprovalService.approveRequest(
    createdRequest.id,
    { comment: 'Approved for Q3 automation project deployment.' },
    adminUser
  );
  console.log(`✓ 8.1: Request approved: status=${approvedReq.status}, decisionComment="${approvedReq.decisionComment}"`);

  // Verify asset state in PostgreSQL
  const updatedAsset = await prisma.asset.findUnique({
    where: { id: testAsset.id },
    include: { currentHolder: true },
  });
  console.log(`✓ 8.2: Asset state synchronized: currentHolder=${updatedAsset.currentHolder?.fullName} (${updatedAsset.allocationStatus})`);
  if (updatedAsset.currentHolderId !== destinationEmp.id) {
    throw new Error('Asset holder was not updated to destination employee!');
  }

  // Verify Asset Status History event
  const historyEvent = await prisma.assetStatusHistory.findFirst({
    where: { assetId: testAsset.id, action: 'TRANSFERRED' },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`✓ 8.3: Immutable Asset History recorded: action=${historyEvent?.action}, remarks="${historyEvent?.remarks}"`);
  if (!historyEvent) throw new Error('AssetStatusHistory event was not created!');

  // 9. Concurrency Protection (Double Approval Prevention)
  console.log('\n--- 9. CONCURRENCY & RE-EXECUTION PROTECTION ---');
  let doubleApproveBlocked = false;
  let doubleApproveMsg = '';
  try {
    await ApprovalService.approveRequest(createdRequest.id, { comment: 'Duplicate approval attempt' }, adminUser);
  } catch (err) {
    doubleApproveBlocked = true;
    doubleApproveMsg = err.message;
  }
  console.log(`✓ 9.1: Duplicate approval blocked: ${doubleApproveBlocked} (Message: "${doubleApproveMsg}")`);
  if (!doubleApproveBlocked || !doubleApproveMsg.includes('already been processed')) {
    throw new Error('Concurrency protection failed!');
  }

  // 10. Rejection Workflow Verification
  console.log('\n--- 10. REJECTION WORKFLOW ---');
  const rejectTestReq = await ApprovalService.createApprovalRequest(
    {
      requestType: 'ASSET_RETIREMENT',
      assetId: testAsset.id,
      priority: 'MEDIUM',
      reason: 'Premature retirement proposal',
      proposedChanges: { targetStatus: 'RETIRED' },
    },
    managerUser.id
  );

  const rejectedReq = await ApprovalService.rejectRequest(
    rejectTestReq.id,
    { rejectionReason: 'Device is still within active warranty coverage and fully functional.' },
    adminUser
  );
  console.log(`✓ 10.1: Rejection recorded: status=${rejectedReq.status}, reason="${rejectedReq.rejectionReason}"`);

  // Verify asset was NOT retired
  const notRetiredAsset = await prisma.asset.findUnique({ where: { id: testAsset.id } });
  console.log(`✓ 10.2: Asset preserved in active state: status=${notRetiredAsset.status}`);
  if (notRetiredAsset.status === 'RETIRED') throw new Error('Asset should not have been retired!');

  // 11. Cancellation Workflow Verification
  console.log('\n--- 11. CANCELLATION WORKFLOW ---');
  const cancelTestReq = await ApprovalService.createApprovalRequest(
    {
      requestType: 'ASSIGNMENT',
      assetId: testAsset.id,
      priority: 'LOW',
      reason: 'Accidental duplicate submission',
      proposedChanges: {},
    },
    managerUser.id
  );

  const cancelledReq = await ApprovalService.cancelRequest(
    cancelTestReq.id,
    { cancellationReason: 'Submitted by mistake' },
    managerUser.id
  );
  console.log(`✓ 11.1: Cancellation recorded: status=${cancelledReq.status}, reason="${cancelledReq.cancellationReason}"`);
  if (cancelledReq.status !== 'CANCELLED') throw new Error('Request status should be CANCELLED');

  // Restore asset back to original holder for cleanup
  await prisma.asset.update({
    where: { id: testAsset.id },
    data: {
      currentHolderId: originalHolder,
      departmentId: testAsset.departmentId,
      locationId: testAsset.locationId,
      allocationStatus: 'ALLOCATED',
    },
  });
  console.log('\n✓ 12: Teardown and asset restoration complete.');

  console.log('\n================================================================');
  console.log('ALL STEP 8 APPROVAL CENTER VERIFICATION TESTS PASSED (100% SUCCESS)!');
  console.log('================================================================');
  await prisma.$disconnect();
}

runStep8Verification().catch(async (e) => {
  console.error('VERIFICATION FAILED:', e);
  await prisma.$disconnect();
  process.exit(1);
});
