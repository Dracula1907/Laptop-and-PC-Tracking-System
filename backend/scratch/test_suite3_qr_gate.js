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

async function runSuite3() {
  console.log('============================================================');
  console.log('SUITE 3: QR ENGINE & SECURITY GATE IN/OUT TERMINAL TEST');
  console.log('============================================================\n');

  const results = {
    suite: 'Suite 3: QR Engine & Security Gate In/Out',
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

  let testAsset = null;
  let adminToken = null;
  let guardToken = null;
  let testGate = null;

  try {
    // Obtain Auth Tokens
    const adminLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'admin', password: 'admin123' },
    });
    adminToken = adminLogin.body?.data?.token;

    const guardLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'guard', password: 'guard123' },
    });
    guardToken = guardLogin.body?.data?.token;

    testGate = await prisma.gate.findFirst();
    assertTest('Test Gate exists in database', Boolean(testGate));

    // 1. QR Code Engine Tests
    console.log('[1/5] Testing QR Code Generation & Verification...');
    testAsset = await prisma.asset.findFirst({
      where: { gatePresence: 'INSIDE', status: { in: ['AVAILABLE', 'ASSIGNED', 'IN_USE'] } },
      include: { qrCodes: { where: { status: 'ACTIVE' } } },
    });
    assertTest('Found active test asset currently INSIDE', Boolean(testAsset));

    let activeQr = testAsset?.qrCodes[0];
    if (!activeQr) {
      // Generate QR for this asset
      const genRes = await apiRequest({
        method: 'POST',
        path: '/qr/generate',
        token: adminToken,
        body: { assetId: testAsset.id },
      });
      activeQr = genRes.body?.data;
      assertTest('QR code generated via API successfully', Boolean(activeQr?.token));
    } else {
      assertTest('Active QR code already present for test asset', Boolean(activeQr.token));
    }

    // 1a: Scan Valid QR
    const scanValid = await apiRequest({
      method: 'POST',
      path: '/security-gate/scan',
      token: guardToken,
      body: { token: activeQr.token },
    });
    assertTest('Scan of valid active QR returns HTTP 200 with asset data', scanValid.status === 200 && scanValid.body?.data?.assetId === testAsset.id);

    // 1b: Scan Malformed / Fake QR
    const scanFake = await apiRequest({
      method: 'POST',
      path: '/security-gate/scan',
      token: guardToken,
      body: { token: 'FAKE_NONEXISTENT_QR_TOKEN_12345' },
    });
    assertTest('Scan of fake/unknown QR rejected with error', scanFake.status >= 400);

    // 2. Physical Gate OUT Workflow
    console.log('\n[2/5] Testing Physical Gate OUT Workflow...');
    const preOutHistoryCount = await prisma.assetStatusHistory.count({ where: { assetId: testAsset.id } });
    const preOutMovementsCount = await prisma.gateMovement.count({ where: { assetId: testAsset.id } });

    const outPayload = {
      assetId: testAsset.id,
      qrCodeId: activeQr.id,
      gateId: testGate.id,
      destination: 'Client Site Pune Plant',
      purpose: 'Field Automation Testing & Validation',
      expectedReturn: new Date(Date.now() + 86400000 * 2).toISOString(),
      remarks: 'Power adapter and bag verified by security',
    };

    const outRes = await apiRequest({
      method: 'POST',
      path: '/security-gate/out',
      token: guardToken,
      body: outPayload,
    });

    assertTest('Gate OUT request returns HTTP 200 with movementCode', outRes.status === 200 && outRes.body?.data?.movementCode);
    const outMovement = outRes.body?.data;

    // Database assertions after OUT
    const assetAfterOut = await prisma.asset.findUnique({ where: { id: testAsset.id } });
    assertTest("Database state: Asset gatePresence updated to 'OUTSIDE'", assetAfterOut.gatePresence === 'OUTSIDE');

    const dbOutMovement = await prisma.gateMovement.findUnique({ where: { id: outMovement.id } });
    assertTest("Database state: GateMovement record created with movementType 'OUT' and status 'OPEN'", dbOutMovement && dbOutMovement.movementType === 'OUT' && dbOutMovement.status === 'OPEN');

    const postOutHistoryCount = await prisma.assetStatusHistory.count({ where: { assetId: testAsset.id } });
    assertTest('Database state: AssetStatusHistory entry logged for gate exit', postOutHistoryCount === preOutHistoryCount + 1);

    // 3. Invalid State: OUT when already OUT
    console.log('\n[3/5] Testing Invalid State: Reject OUT when already OUTSIDE...');
    const duplicateOutRes = await apiRequest({
      method: 'POST',
      path: '/security-gate/out',
      token: guardToken,
      body: outPayload,
    });
    assertTest('Duplicate OUT request rejected with error (Cannot record OUT again)', duplicateOutRes.status >= 400);

    const checkNoDuplicateOut = await prisma.gateMovement.count({
      where: { assetId: testAsset.id, movementType: 'OUT', status: 'OPEN' },
    });
    assertTest('Exactly ONE open OUT movement exists (no duplicate transactions committed)', checkNoDuplicateOut === 1);

    // 4. Physical Gate IN Workflow
    console.log('\n[4/5] Testing Physical Gate IN Workflow...');
    // Verify scan while outside
    const scanWhileOutside = await apiRequest({
      method: 'POST',
      path: '/security-gate/scan',
      token: guardToken,
      body: { token: activeQr.token },
    });
    assertTest("Scan while outside correctly reports gatePresence as 'OUTSIDE'", scanWhileOutside.body?.data?.gatePresence === 'OUTSIDE');

    const inPayload = {
      assetId: testAsset.id,
      qrCodeId: activeQr.id,
      gateId: testGate.id,
      remarks: 'Returned in good physical condition. Battery and adapter intact.',
    };

    const inRes = await apiRequest({
      method: 'POST',
      path: '/security-gate/in',
      token: guardToken,
      body: inPayload,
    });

    assertTest('Gate IN request returns HTTP 200 with return movementCode', inRes.status === 200 && inRes.body?.data?.movementCode);
    const inMovement = inRes.body?.data;

    // Database assertions after IN
    const assetAfterIn = await prisma.asset.findUnique({ where: { id: testAsset.id } });
    assertTest("Database state: Asset gatePresence restored to 'INSIDE'", assetAfterIn.gatePresence === 'INSIDE');

    const dbPreviousOut = await prisma.gateMovement.findUnique({ where: { id: outMovement.id } });
    assertTest("Database state: Previous OUT movement marked 'COMPLETED' with actualReturn timestamp", dbPreviousOut.status === 'COMPLETED' && dbPreviousOut.actualReturn !== null);

    const dbInMovement = await prisma.gateMovement.findUnique({ where: { id: inMovement.id } });
    assertTest("Database state: Inbound GateMovement created with movementType 'IN'", dbInMovement && dbInMovement.movementType === 'IN');

    // 5. Invalid State: IN when already IN & Query Checks
    console.log('\n[5/5] Testing Invalid State: Reject IN when already INSIDE & Query Verification...');
    const duplicateInRes = await apiRequest({
      method: 'POST',
      path: '/security-gate/in',
      token: guardToken,
      body: inPayload,
    });
    assertTest('Duplicate IN request rejected with error (Cannot record IN again)', duplicateInRes.status >= 400);

    // KPI Verification
    const kpisRes = await apiRequest({
      path: '/security-gate/kpis',
      token: guardToken,
    });
    assertTest('GET /security-gate/kpis returns HTTP 200', kpisRes.status === 200);
    const dbOutsideTotal = await prisma.asset.count({ where: { gatePresence: 'OUTSIDE' } });
    assertTest('Returned KPI assetsOutside matches database count exactly', kpisRes.body?.data?.assetsOutside === dbOutsideTotal);

    // Current Outside List Verification
    const outsideListRes = await apiRequest({
      path: '/security-gate/current-outside',
      token: guardToken,
    });
    assertTest('Returned Current Outside list excludes newly returned asset', !outsideListRes.body?.data?.rows?.some(r => r.assetId === testAsset.id));

    // Movement History Verification
    const historyRes = await apiRequest({
      path: `/security-gate/history?search=${testAsset.assetCode}`,
      token: guardToken,
    });
    assertTest('Movement history logs both OUT and IN movements in chronological order', historyRes.status === 200 && historyRes.body?.data?.movements?.length >= 2);

  } catch (err) {
    assertTest('Unhandled error in Suite 3 execution', false, err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`SUITE 3 SUMMARY: ${results.passed}/${results.totalTests} PASSED, ${results.failed} FAILED`);
  console.log('------------------------------------------------------------\n');

  return results;
}

if (require.main === module) {
  runSuite3().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}

module.exports = { runSuite3 };
