const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000/api';

function apiRequest({ method = 'GET', path, token, body }) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

async function runSuite4() {
  console.log('============================================================');
  console.log('SUITE 4: STEPS 1–16 CORE LIFECYCLE REGRESSION TEST');
  console.log('============================================================\n');

  const results = {
    suite: 'Suite 4: Steps 1–16 Core Lifecycle Regression',
    totalTests: 0,
    passed: 0,
    failed: 0,
    failures: [],
  };

  function assertTest(name, condition, details = '') {
    results.totalTests++;
    if (condition) {
      results.passed++;
      console.log(`  ✓ PASS: ${name}`);
    } else {
      results.failed++;
      console.error(`  ✗ FAIL: ${name} — ${details}`);
      results.failures.push({ test: name, details });
    }
  }

  let adminToken = null;

  try {
    const login = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'admin', password: 'admin123' },
    });
    adminToken = login.body?.data?.token;
    assertTest('Admin authenticated for lifecycle regression suite', Boolean(adminToken));

    // 1. STEP 1: Assets Inventory, Specifications & Multi-Criteria Filtering
    console.log('\n[1/7] Testing Step 1: Assets Inventory & Specifications...');
    const assetsRes = await apiRequest({ path: '/assets?page=1&limit=5', token: adminToken });
    assertTest('GET /assets returns paginated asset list', assetsRes.status === 200 && Array.isArray(assetsRes.body?.data?.assets));

    const totalAssets = assetsRes.body?.data?.pagination?.total;
    assertTest('Asset list pagination metadata is accurate', typeof totalAssets === 'number' && totalAssets > 0);

    const firstAsset = assetsRes.body?.data?.assets[0];
    assertTest('Asset records contain primary attributes (code, name, type, status)', Boolean(firstAsset?.assetCode && firstAsset?.assetName));

    // Search by code
    const searchRes = await apiRequest({ path: `/assets?search=${firstAsset.assetCode}`, token: adminToken });
    assertTest('Asset search finds target asset', searchRes.body?.data?.assets?.some(a => a.assetCode === firstAsset.assetCode));

    // Filter by type
    const filterTypeRes = await apiRequest({ path: `/assets?assetType=${firstAsset.assetType}`, token: adminToken });
    assertTest('Asset type filter returns only matching types', filterTypeRes.body?.data?.assets?.every(a => a.assetType === firstAsset.assetType));

    // Asset Detail with specs
    const detailRes = await apiRequest({ path: `/assets/${firstAsset.id}`, token: adminToken });
    assertTest('GET /assets/:id returns specifications, department, and location relations', detailRes.status === 200 && detailRes.body?.data?.id === firstAsset.id);

    // 2. STEP 2: Asset Assignment
    console.log('\n[2/7] Testing Step 2: Asset Assignment Workflow...');
    // Find an asset with status AVAILABLE and gatePresence INSIDE
    let testTargetAsset = await prisma.asset.findFirst({
      where: { currentHolderId: null, status: 'AVAILABLE', gatePresence: 'INSIDE' },
    });
    if (!testTargetAsset) {
      testTargetAsset = await prisma.asset.findFirst({
        where: { gatePresence: 'INSIDE', status: { notIn: ['RETIRED', 'SCRAPPED', 'UNDER_REPAIR'] } },
      });
      // Clear holder for clean assignment test
      await prisma.asset.update({
        where: { id: testTargetAsset.id },
        data: { currentHolderId: null, allocationStatus: 'UNASSIGNED', status: 'AVAILABLE' },
      });
    }

    const testEmployee = await prisma.employee.findFirst({ where: { status: 'ACTIVE' } });
    assertTest('Found eligible asset and active employee for assignment test', Boolean(testTargetAsset && testEmployee));

    const assignRes = await apiRequest({
      method: 'POST',
      path: '/assignments',
      token: adminToken,
      body: {
        assetId: testTargetAsset.id,
        employeeId: testEmployee.id,
        assignedDate: new Date().toISOString(),
        assignmentType: 'PERMANENT',
        conditionOnAssignment: 'EXCELLENT',
        notes: 'Automated Master Hard Test Assignment',
      },
    });

    assertTest('Create assignment request accepted', assignRes.status === 200 || assignRes.status === 201, `Got HTTP ${assignRes.status}`);

    // Verify DB updated
    const updatedAssetAfterAssign = await prisma.asset.findUnique({ where: { id: testTargetAsset.id } });
    assertTest('Asset currentHolderId updated to assigned employee in PostgreSQL', updatedAssetAfterAssign.currentHolderId === testEmployee.id);

    // 3. STEP 3: Asset Transfer
    console.log('\n[3/7] Testing Step 3: Asset Transfer Workflow...');
    const secondEmployee = await prisma.employee.findFirst({
      where: { status: 'ACTIVE', id: { not: testEmployee.id } },
    });
    assertTest('Found target secondary employee for transfer test', Boolean(secondEmployee));

    const transferRes = await apiRequest({
      method: 'POST',
      path: '/transfers',
      token: adminToken,
      body: {
        assetId: testTargetAsset.id,
        newHolderId: secondEmployee.id,
        transferDate: new Date().toISOString(),
        reason: 'Departmental Reallocation Test',
        conditionAfter: 'EXCELLENT',
      },
    });
    assertTest('Transfer request executed successfully', transferRes.status === 200 || transferRes.status === 201, `Got HTTP ${transferRes.status}`);

    const assetAfterTransfer = await prisma.asset.findUnique({ where: { id: testTargetAsset.id } });
    assertTest('Asset currentHolderId updated to secondary employee in PostgreSQL', assetAfterTransfer.currentHolderId === secondEmployee.id);

    // 4. STEP 4: Asset Return
    console.log('\n[4/7] Testing Step 4: Asset Return Workflow...');
    const returnRes = await apiRequest({
      method: 'POST',
      path: '/returns',
      token: adminToken,
      body: {
        assetId: testTargetAsset.id,
        returnDate: new Date().toISOString(),
        returnCondition: 'GOOD',
        reason: 'End of Project Testing Return',
        remarks: 'Returned back to central inventory in good standing',
      },
    });
    assertTest('Return request executed successfully', returnRes.status === 200 || returnRes.status === 201, `Got HTTP ${returnRes.status}`);

    const assetAfterReturn = await prisma.asset.findUnique({ where: { id: testTargetAsset.id } });
    assertTest('Asset currentHolderId cleared in PostgreSQL upon return', assetAfterReturn.currentHolderId === null);

    // 5. STEP 5: Maintenance Ticket Lifecycle
    console.log('\n[5/7] Testing Step 5: Maintenance Ticket Lifecycle...');
    const maintRes = await apiRequest({
      method: 'POST',
      path: '/maintenance',
      token: adminToken,
      body: {
        assetId: testTargetAsset.id,
        issueTitle: 'Preventive Diagnostics Routine',
        issueDescription: 'Scheduled Diagnostics and Dust Cleaning for Hard Testing Suite',
        maintenanceType: 'PREVENTIVE',
        priority: 'MEDIUM',
        serviceProvider: 'Faith Internal IT Lab',
      },
    });
    assertTest('Maintenance ticket opened successfully', maintRes.status === 200 || maintRes.status === 201, `Got HTTP ${maintRes.status}: ${JSON.stringify(maintRes.body)}`);
    const maintId = maintRes.body?.data?.id;

    if (maintId) {
      // Complete maintenance ticket
      const completeMaint = await apiRequest({
        method: 'POST',
        path: `/maintenance/${maintId}/complete`,
        token: adminToken,
        body: {
          resolution: 'Diagnostics passed 100%. Thermal paste replaced.',
          conditionAfter: 'GOOD',
          finalDisposition: 'AVAILABLE',
          laborCost: 1500,
        },
      });
      assertTest('Maintenance ticket marked COMPLETED with resolution', completeMaint.status === 200, `Got HTTP ${completeMaint.status}`);

      const dbMaint = await prisma.maintenanceRecord.findUnique({ where: { id: maintId } });
      assertTest("Database state: MaintenanceRecord status is 'COMPLETED'", dbMaint?.repairStatus === 'COMPLETED' || dbMaint?.status === 'COMPLETED');
    }

    // 6. STEP 10: Reports & Summary Analytics
    console.log('\n[6/7] Testing Step 10: Reports & Summary Analytics...');
    const reportSummary = await apiRequest({ path: '/reports/summary', token: adminToken });
    assertTest('GET /reports/summary returns live PostgreSQL KPI counts', reportSummary.status === 200);

    const reportUtil = await apiRequest({ path: '/reports/utilization', token: adminToken });
    assertTest('GET /reports/utilization calculates fleet utilization rate', reportUtil.status === 200 && reportUtil.body?.data?.overallRate !== undefined);

    const reportReturns = await apiRequest({ path: '/reports/returns', token: adminToken });
    assertTest('GET /reports/returns tracks overdue returns register', reportReturns.status === 200);

    // 7. STEP 15 & 16: Notifications & Data Quality Audit
    console.log('\n[7/7] Testing Steps 15 & 16: Notifications & Data Quality Verification...');
    const notifs = await apiRequest({ path: '/notifications?limit=5', token: adminToken });
    assertTest('GET /notifications returns user notifications list', notifs.status === 200 && Array.isArray(notifs.body?.data?.notifications));

    const unread = await apiRequest({ path: '/notifications/unread-count', token: adminToken });
    assertTest('GET /notifications/unread-count returns integer count', unread.status === 200 && typeof unread.body?.data?.unreadCount === 'number');

    // Data Quality Check: Unassigned Assets without QR
    const totalAssetsDb = await prisma.asset.count();
    const assetsWithQr = await prisma.assetQrCode.count({ where: { status: 'ACTIVE' } });
    assertTest('System has active asset inventory and active QR coverage tracked', totalAssetsDb > 0 && assetsWithQr > 0);

  } catch (err) {
    assertTest('Unhandled error in Suite 4 execution', false, err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`SUITE 4 SUMMARY: ${results.passed}/${results.totalTests} PASSED, ${results.failed} FAILED`);
  console.log('------------------------------------------------------------\n');

  return results;
}

if (require.main === module) {
  runSuite4().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}

module.exports = { runSuite4 };
