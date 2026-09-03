const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKEND_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3000';

function apiRequest({ method = 'GET', path, token, body }) {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL + path);
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

function checkFrontendRoute(path = '/') {
  return new Promise((resolve) => {
    const url = new URL(FRONTEND_URL + path);
    http.get({ hostname: url.hostname, port: url.port, path: url.pathname }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, hasHtml: data.includes('<div id="root">') || data.includes('html') });
      });
    }).on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });
  });
}

async function runSuite6() {
  console.log('============================================================');
  console.log('SUITE 6: WEB APPLICATION & MOBILE APK SYNC VALIDATION');
  console.log('============================================================\n');

  const results = {
    suite: 'Suite 6: Web UI & Mobile APK Sync Validation',
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
    // 1. Web Application Frontend Availability
    console.log('[1/3] Testing Web Application Availability (Port 3000)...');
    const webHome = await checkFrontendRoute('/');
    assertTest('Web Application responds on http://localhost:3000 with HTTP 200 and root mount', webHome.status === 200 && webHome.hasHtml);

    const routesToCheck = ['/assets', '/assignments', '/transfers', '/returns', '/maintenance', '/warranties', '/security-gate', '/reports'];
    for (const r of routesToCheck) {
      const pageRes = await checkFrontendRoute(r);
      assertTest(`SPA Route '${r}' correctly served via Vite fallback (HTTP 200)`, pageRes.status === 200);
    }

    // 2. Authentication across clients
    console.log('\n[2/3] Simulating Web Admin and Mobile Guard Clients...');
    const adminLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'admin', password: 'admin123' },
    });
    const webAdminToken = adminLogin.body?.data?.token;

    const guardLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'guard', password: 'guard123' },
    });
    const mobileGuardToken = guardLogin.body?.data?.token;

    assertTest('Web Admin and Mobile Guard clients authenticated independently', Boolean(webAdminToken && mobileGuardToken));

    // 3. End-to-End Cross-Client State Synchronization
    console.log('\n[3/3] Testing Real-Time Cross-Client State Synchronization...');
    const testGate = await prisma.gate.findFirst();
    const testAsset = await prisma.asset.findFirst({
      where: { gatePresence: 'INSIDE', status: { notIn: ['RETIRED', 'SCRAPPED'] } },
      include: { qrCodes: { where: { status: 'ACTIVE' } } },
    });

    assertTest('Sync test fixtures ready', Boolean(testGate && testAsset));

    // Web Baseline: Get initial KPIs
    const initialKpis = await apiRequest({ path: '/security-gate/kpis', token: webAdminToken });
    const initialOutsideCount = initialKpis.body?.data?.assetsOutside || 0;

    // Mobile Action: Guard scans and performs OUT
    console.log('       [Mobile Action] Guard scans QR and records asset OUT...');
    const mobileOutRes = await apiRequest({
      method: 'POST',
      path: '/security-gate/out',
      token: mobileGuardToken,
      body: {
        assetId: testAsset.id,
        qrCodeId: testAsset.qrCodes[0]?.id || null,
        gateId: testGate.id,
        destination: 'Mobile Sync Validation Lab',
        purpose: 'Cross-client real-time synchronization hard verification',
      },
    });
    assertTest('Mobile Guard OUT request succeeds (HTTP 200)', mobileOutRes.status === 200);

    // Web Immediate Assertion: Does Web Security Gate view see the asset OUTSIDE?
    const webOutsideList = await apiRequest({ path: '/security-gate/current-outside', token: webAdminToken });
    const assetFoundInWebOutside = webOutsideList.body?.data?.rows?.some(r => r.assetId === testAsset.id);
    assertTest('Web Application instantly reflects asset in Currently Outside registry', assetFoundInWebOutside);

    const webKpisAfterOut = await apiRequest({ path: '/security-gate/kpis', token: webAdminToken });
    assertTest('Web KPIs instantly show assetsOutside count incremented by 1', webKpisAfterOut.body?.data?.assetsOutside === initialOutsideCount + 1);

    // Mobile Action: Guard scans and performs IN
    console.log('       [Mobile Action] Guard scans QR and records asset IN...');
    const mobileInRes = await apiRequest({
      method: 'POST',
      path: '/security-gate/in',
      token: mobileGuardToken,
      body: {
        assetId: testAsset.id,
        qrCodeId: testAsset.qrCodes[0]?.id || null,
        gateId: testGate.id,
        remarks: 'Returned from sync validation test',
      },
    });
    assertTest('Mobile Guard IN request succeeds (HTTP 200)', mobileInRes.status === 200);

    // Web Immediate Assertion: Is asset cleared from Web Currently Outside view?
    const webOutsideListAfterIn = await apiRequest({ path: '/security-gate/current-outside', token: webAdminToken });
    const assetStillInWebOutside = webOutsideListAfterIn.body?.data?.rows?.some(r => r.assetId === testAsset.id);
    assertTest('Web Application instantly removes returned asset from Currently Outside registry', !assetStillInWebOutside);

    const webKpisAfterIn = await apiRequest({ path: '/security-gate/kpis', token: webAdminToken });
    assertTest('Web KPIs instantly restore assetsOutside count to baseline', webKpisAfterIn.body?.data?.assetsOutside === initialOutsideCount);

  } catch (err) {
    assertTest('Unhandled error in Suite 6 execution', false, err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`SUITE 6 SUMMARY: ${results.passed}/${results.totalTests} PASSED, ${results.failed} FAILED`);
  console.log('------------------------------------------------------------\n');

  return results;
}

if (require.main === module) {
  runSuite6().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}

module.exports = { runSuite6 };
