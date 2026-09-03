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

async function runSuite2() {
  console.log('============================================================');
  console.log('SUITE 2: AUTHENTICATION, SESSION, RBAC & DATA LEAKAGE TEST');
  console.log('============================================================\n');

  const results = {
    suite: 'Suite 2: Authentication, RBAC & Data Leakage',
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

  try {
    // 1. Valid Authentication across all 5 roles
    console.log('[1/6] Testing Valid Role Authentication...');
    const rolesToTest = [
      { user: 'admin', pass: 'admin123', expectedRole: 'ADMIN' },
      { user: 'manager', pass: 'manager123', expectedRole: 'MANAGER' },
      { user: 'guard', pass: 'guard123', expectedRole: 'SECURITY_GUARD' },
      { user: 'it', pass: 'it123', expectedRole: 'IT' },
      { user: 'user', pass: 'user123', expectedRole: 'USER' },
    ];

    const tokens = {};

    for (const r of rolesToTest) {
      const res = await apiRequest({
        method: 'POST',
        path: '/auth/login',
        body: { username: r.user, password: r.pass },
      });

      const hasToken = res.status === 200 && res.body?.data?.token;
      const roleMatches = res.body?.data?.user?.role?.code === r.expectedRole;
      tokens[r.user] = res.body?.data?.token;

      assertTest(
        `Login as '${r.user}' returns HTTP 200 with JWT and role '${r.expectedRole}'`,
        hasToken && roleMatches,
        `HTTP ${res.status}, role=${res.body?.data?.user?.role?.code}`
      );
    }

    // 2. Authentication Failure Handling
    console.log('\n[2/6] Testing Authentication Failure & Edge Cases...');
    const badPass = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'admin', password: 'wrongpassword' },
    });
    assertTest('Invalid password rejected with HTTP 400 or 401', badPass.status === 400 || badPass.status === 401, `Got HTTP ${badPass.status}`);

    const badUser = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'nonexistent_user', password: 'password123' },
    });
    assertTest('Non-existent user rejected with HTTP 400 or 401', badUser.status === 400 || badUser.status === 401, `Got HTTP ${badUser.status}`);

    const emptyCreds = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: '', password: '' },
    });
    assertTest('Empty credentials rejected with HTTP 400 or 401', emptyCreds.status === 400 || emptyCreds.status === 401, `Got HTTP ${emptyCreds.status}`);

    // 3. Token Verification & Tampering Protection
    console.log('\n[3/6] Testing Session Verification & Token Security...');
    const meAdmin = await apiRequest({ path: '/auth/me', token: tokens['admin'] });
    assertTest('GET /auth/me with valid Admin token returns user session', meAdmin.status === 200 && meAdmin.body?.data?.username === 'admin');

    const noToken = await apiRequest({ path: '/auth/me' });
    assertTest('Protected endpoint without Authorization header returns HTTP 401', noToken.status === 401, `Got HTTP ${noToken.status}`);

    const tamperedToken = tokens['admin'] ? tokens['admin'].slice(0, -5) + 'xxxxx' : 'bad';
    const badTokenRes = await apiRequest({ path: '/auth/me', token: tamperedToken });
    assertTest('Forged/tampered token rejected with HTTP 401', badTokenRes.status === 401, `Got HTTP ${badTokenRes.status}`);

    // 4. Account Switching & Session Isolation Matrix
    console.log('\n[4/6] Testing Account Switching & Session Isolation Matrix...');
    const switchMatrix = [
      ['admin', 'manager'],
      ['manager', 'guard'],
      ['guard', 'admin'],
      ['admin', 'guard'],
      ['guard', 'manager'],
    ];

    let switchPassed = true;
    for (const [fromUser, toUser] of switchMatrix) {
      const fromRes = await apiRequest({ path: '/auth/me', token: tokens[fromUser] });
      const toRes = await apiRequest({ path: '/auth/me', token: tokens[toUser] });

      const fromRole = fromRes.body?.data?.role?.code || fromRes.body?.data?.roleCode;
      const toRole = toRes.body?.data?.role?.code || toRes.body?.data?.roleCode;

      if (fromRole === toRole || toRes.body?.data?.username !== toUser) {
        switchPassed = false;
        console.error(`       Switch error ${fromUser} -> ${toUser}: role bleed or wrong user returned`);
      }
    }
    assertTest('Account switching matrix executes with zero role/permission bleed', switchPassed);

    // 5. RBAC Hard Enforcement
    console.log('\n[5/6] Testing RBAC Hard Enforcement on Endpoints...');
    const guardToken = tokens['guard'];
    const managerToken = tokens['manager'];

    // Guard calling Admin-only endpoints
    const guardAssetCreate = await apiRequest({
      method: 'POST',
      path: '/assets',
      token: guardToken,
      body: { assetName: 'Unauthorized Asset', assetType: 'LAPTOP' },
    });
    assertTest('Security Guard cannot create assets (POST /assets -> 403)', guardAssetCreate.status === 403, `Got HTTP ${guardAssetCreate.status}`);

    const guardUsersList = await apiRequest({
      path: '/users',
      token: guardToken,
    });
    assertTest('Security Guard cannot view users (GET /users -> 403)', guardUsersList.status === 403, `Got HTTP ${guardUsersList.status}`);

    const guardAssignment = await apiRequest({
      method: 'POST',
      path: '/assignments',
      token: guardToken,
      body: {},
    });
    assertTest('Security Guard cannot assign assets (POST /assignments -> 403)', guardAssignment.status === 403, `Got HTTP ${guardAssignment.status}`);

    const guardMaintenance = await apiRequest({
      method: 'POST',
      path: '/maintenance',
      token: guardToken,
      body: {},
    });
    assertTest('Security Guard cannot create maintenance tickets (POST /maintenance -> 403)', guardMaintenance.status === 403, `Got HTTP ${guardMaintenance.status}`);

    // Manager calling Admin-only endpoints
    const managerUsersList = await apiRequest({
      path: '/users',
      token: managerToken,
    });
    assertTest('Manager cannot access user management (GET /users -> 403)', managerUsersList.status === 403, `Got HTTP ${managerUsersList.status}`);

    // 6. Security Guard Data Leakage Audit
    console.log('\n[6/6] Auditing Data Leakage on Security Gate Scan Endpoint (POST /security-gate/scan)...');
    const activeQr = await prisma.assetQrCode.findFirst({
      where: { status: 'ACTIVE' },
      include: { asset: { include: { specifications: true } } },
    });

    if (!activeQr) {
      assertTest('Active QR code available for data leakage test', false, 'No active QR found');
    } else {
      console.log(`       Testing scan token for Asset ${activeQr.asset.assetCode} (${activeQr.asset.assetName})...`);

      // 6a: Guard scan response inspection
      const guardScanRes = await apiRequest({
        method: 'POST',
        path: '/security-gate/scan',
        token: guardToken,
        body: { token: activeQr.token },
      });

      assertTest(
        'Security Guard scan returns HTTP 200 with basic asset profile',
        guardScanRes.status === 200 && guardScanRes.body?.data,
        `Got HTTP ${guardScanRes.status}: ${JSON.stringify(guardScanRes.body)}`
      );

      const guardData = guardScanRes.body?.data || {};

      // Guard MUST have essential gate fields:
      const hasEssential = guardData.assetId && guardData.assetCode && guardData.assetName && guardData.gatePresence;
      assertTest('Guard scan payload contains essential gate verification fields', Boolean(hasEssential));

      // Guard MUST NOT receive sensitive technical/hardware fields:
      const leaksLanIp = guardData.lanIp || guardData.specifications?.lanIp;
      const leaksMac = guardData.macAddress || guardData.specifications?.lanMacAddress;
      const leaksCpu = guardData.cpu || guardData.specifications?.cpu;
      const leaksRam = guardData.ram || guardData.specifications?.ram;
      const leaksStorage = guardData.storage || guardData.specifications?.storage;
      const leaksFullDetails = Boolean(guardData.fullDetails);

      const leaksSensitive = leaksLanIp || leaksMac || leaksCpu || leaksRam || leaksStorage || leaksFullDetails;
      assertTest(
        'Guard scan payload strictly omits sensitive hardware/network specs (IP, MAC, CPU, RAM)',
        !leaksSensitive,
        `Leaked fields: ${JSON.stringify({ leaksLanIp, leaksMac, leaksCpu, leaksRam, leaksFullDetails })}`
      );

      // 6b: Admin scan response inspection (Admin MUST have full details)
      const adminScanRes = await apiRequest({
        method: 'POST',
        path: '/security-gate/scan',
        token: tokens['admin'],
        body: { token: activeQr.token },
      });

      assertTest('Admin scan returns HTTP 200', adminScanRes.status === 200, `Got HTTP ${adminScanRes.status}`);
      const adminData = adminScanRes.body?.data || {};
      const adminHasFull = Boolean(adminData.fullDetails || adminData.specifications);
      assertTest('Admin scan payload includes authorized full technical details', adminHasFull);
    }

  } catch (err) {
    assertTest('Unhandled error in Suite 2 execution', false, err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`SUITE 2 SUMMARY: ${results.passed}/${results.totalTests} PASSED, ${results.failed} FAILED`);
  console.log('------------------------------------------------------------\n');

  return results;
}

if (require.main === module) {
  runSuite2().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}

module.exports = { runSuite2 };
