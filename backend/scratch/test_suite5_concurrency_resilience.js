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

async function runSuite5() {
  console.log('============================================================');
  console.log('SUITE 5: CONCURRENCY, DOUBLE-TAP & ERROR RESILIENCE TEST');
  console.log('============================================================\n');

  const results = {
    suite: 'Suite 5: Concurrency, Double-Tap & Error Resilience',
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

  let guardToken = null;
  let adminToken = null;
  let testAsset = null;
  let testGate = null;

  try {
    // Auth Tokens
    const guardLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'guard', password: 'guard123' },
    });
    guardToken = guardLogin.body?.data?.token;

    const adminLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'admin', password: 'admin123' },
    });
    adminToken = adminLogin.body?.data?.token;

    testGate = await prisma.gate.findFirst();
    testAsset = await prisma.asset.findFirst({
      where: { gatePresence: 'INSIDE', status: { notIn: ['RETIRED', 'SCRAPPED'] } },
      include: { qrCodes: { where: { status: 'ACTIVE' } } },
    });

    assertTest('Test fixtures loaded (Guard Token, Asset INSIDE, Gate)', Boolean(guardToken && testAsset && testGate));

    const outPayload = {
      assetId: testAsset.id,
      qrCodeId: testAsset.qrCodes[0]?.id || null,
      gateId: testGate.id,
      destination: 'Concurrent Stress Test Facility',
      purpose: 'High Concurrency Validation',
      expectedReturn: new Date(Date.now() + 86400000).toISOString(),
      remarks: 'Simultaneous requests test',
    };

    // 1. Simultaneous Concurrency Race Condition (2 requests at exact same millisecond)
    console.log('\n[1/4] Testing Simultaneous Concurrency (2 parallel OUT requests via Promise.all)...');
    const [raceRes1, raceRes2] = await Promise.all([
      apiRequest({ method: 'POST', path: '/security-gate/out', token: guardToken, body: outPayload }),
      apiRequest({ method: 'POST', path: '/security-gate/out', token: guardToken, body: outPayload }),
    ]);

    const successCount = (raceRes1.status === 200 ? 1 : 0) + (raceRes2.status === 200 ? 1 : 0);
    const failureCount = (raceRes1.status >= 400 ? 1 : 0) + (raceRes2.status >= 400 ? 1 : 0);

    assertTest(
      'Concurrency Race Condition: Exactly ONE parallel request succeeds and the other fails',
      successCount === 1 && failureCount === 1,
      `Status 1: ${raceRes1.status}, Status 2: ${raceRes2.status}`
    );

    const openOutMovements = await prisma.gateMovement.count({
      where: { assetId: testAsset.id, movementType: 'OUT', status: 'OPEN' },
    });
    assertTest('PostgreSQL state: Exactly ONE open movement created in DB (0 duplicate writes)', openOutMovements === 1);

    // 2. Double-Tap / Rapid Burst Protection (5 rapid calls)
    console.log('\n[2/4] Testing Double-Tap / Rapid Burst Protection (5 rapid calls while outside)...');
    const burstPromises = Array.from({ length: 5 }, () =>
      apiRequest({ method: 'POST', path: '/security-gate/out', token: guardToken, body: outPayload })
    );
    const burstResults = await Promise.all(burstPromises);
    const burstAllRejected = burstResults.every(r => r.status >= 400);
    assertTest('Double-Tap Protection: All 5 rapid subsequent OUT requests rejected with error', burstAllRejected);

    // Return the asset back to restore baseline
    const inPayload = {
      assetId: testAsset.id,
      qrCodeId: testAsset.qrCodes[0]?.id || null,
      gateId: testGate.id,
      remarks: 'Restoring asset to INSIDE state',
    };
    const returnRes = await apiRequest({
      method: 'POST',
      path: '/security-gate/in',
      token: guardToken,
      body: inPayload,
    });
    assertTest('Asset successfully restored to INSIDE state after concurrency test', returnRes.status === 200);

    // 3. Transaction Rollback Integrity
    console.log('\n[3/4] Testing Transaction Rollback Integrity under Fault Injection...');
    const preRollbackMovements = await prisma.gateMovement.count();
    const preRollbackHistory = await prisma.assetStatusHistory.count();

    // Send an invalid request where assetId is invalid
    const invalidOutRes = await apiRequest({
      method: 'POST',
      path: '/security-gate/out',
      token: guardToken,
      body: {
        assetId: '00000000-0000-0000-0000-000000000000',
        gateId: testGate.id,
        destination: 'Nowhere',
        purpose: 'Fault Injection',
      },
    });
    assertTest('Fault injection request cleanly rejected with HTTP 400/404/500', invalidOutRes.status >= 400);

    const postRollbackMovements = await prisma.gateMovement.count();
    const postRollbackHistory = await prisma.assetStatusHistory.count();

    assertTest('Zero orphan movements committed after transaction failure', postRollbackMovements === preRollbackMovements);
    assertTest('Zero orphan history events committed after transaction failure', postRollbackHistory === preRollbackHistory);

    // 4. HTTP Status Code Standards & Error Sanitization
    console.log('\n[4/4] Testing HTTP Status Standards & Information Disclosure...');
    // 401 Unauthorized
    const res401 = await apiRequest({ path: '/auth/me', token: 'invalid.jwt.token' });
    assertTest('Invalid token returns HTTP 401 Unauthorized', res401.status === 401);

    // 403 Forbidden
    const res403 = await apiRequest({ path: '/users', token: guardToken });
    assertTest('RBAC violation returns HTTP 403 Forbidden', res403.status === 403);

    // 404 Not Found
    const res404 = await apiRequest({ path: '/assets/00000000-0000-0000-0000-000000000000', token: adminToken });
    assertTest('Non-existent resource returns HTTP 404 Not Found', res404.status === 404);

    // In-when-in returns error
    const resConflict = await apiRequest({
      method: 'POST',
      path: '/security-gate/in',
      token: guardToken,
      body: inPayload,
    });
    assertTest('Illegal state transition returns error (already recorded as INSIDE)', resConflict.status >= 400);

    // Error response format check
    assertTest('Error responses follow structured format { success: false, message: ... }', res401.body?.success === false && typeof res401.body?.message === 'string');

  } catch (err) {
    assertTest('Unhandled error in Suite 5 execution', false, err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`SUITE 5 SUMMARY: ${results.passed}/${results.totalTests} PASSED, ${results.failed} FAILED`);
  console.log('------------------------------------------------------------\n');

  return results;
}

if (require.main === module) {
  runSuite5().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}

module.exports = { runSuite5 };
