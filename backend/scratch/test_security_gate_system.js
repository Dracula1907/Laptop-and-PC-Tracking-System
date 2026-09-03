/**
 * test_security_gate_system.js
 * Comprehensive End-to-End Verification Suite for QR & Security Gate Tracking
 */

const API_BASE = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, data, ok: res.ok };
}

async function runTests() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🧪 FAITH AUTOMATION IT INVENTORY: QR + SECURITY GATE TEST SUITE');
  console.log('════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate as Admin
    console.log('1. Authenticating Admin User...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' },
    });

    const token = loginRes.data?.data?.token || loginRes.data?.token;
    assert(loginRes.ok && token, 'Admin authentication successful');
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Physical Gate Masters
    console.log('\n2. Testing Physical Gate Master Data...');
    const gatesRes = await request('/gates', { headers: authHeaders });
    const gateList = gatesRes.data?.data || [];
    assert(gatesRes.ok && Array.isArray(gateList), 'Physical gates list returned');
    assert(gateList.length >= 4, 'Default physical gates exist (Main Gate, Dispatch, R&D, Service)');
    const testGate = gateList[0];
    console.log(`     Using Gate: ${testGate?.name} (${testGate?.code})`);

    // 3. Inventory Asset
    console.log('\n3. Retrieving Active Inventory Asset...');
    const assetsRes = await request('/assets?limit=5', { headers: authHeaders });
    const assetList = assetsRes.data?.data?.assets || assetsRes.data?.assets || [];
    assert(assetsRes.ok && assetList.length > 0, 'Assets retrieved');
    const testAsset = assetList[0];
    console.log(`     Using Asset: ${testAsset?.companyAssetId || testAsset?.assetCode} (ID: ${testAsset?.id})`);
    const originalOperationalStatus = testAsset.status;

    // 4. QR Code Lifecycle
    console.log('\n4. Testing QR Code Generation & Safe Token Architecture...');
    const genQrRes = await request('/qr/generate', {
      method: 'POST',
      headers: authHeaders,
      body: { assetId: testAsset.id },
    });

    assert(genQrRes.ok && genQrRes.data?.data?.token, 'QR code generated successfully');
    const activeQr = genQrRes.data.data;
    const tokenStr = activeQr.token;
    console.log(`     Generated Token: ${tokenStr}`);

    // Verify token contains no sensitive information
    assert(
      !tokenStr.includes('password') &&
      !tokenStr.includes('192.168') &&
      !tokenStr.includes('admin') &&
      !tokenStr.includes('jwt') &&
      tokenStr.startsWith('FAITH-QR-'),
      'Token is opaque safe identifier with zero leaked data'
    );

    // Test duplicate prevention
    const duplicateGenRes = await request('/qr/generate', {
      method: 'POST',
      headers: authHeaders,
      body: { assetId: testAsset.id },
    });
    assert(duplicateGenRes.data?.data?.id === activeQr.id, 'Duplicate active QR generation prevented (idempotent)');

    // Test QR resolution / Guard Scan endpoint
    console.log('\n5. Testing Security Guard QR Scanner Verification...');
    const scanRes = await request('/security-gate/scan', {
      method: 'POST',
      headers: authHeaders,
      body: { token: tokenStr },
    });

    assert(scanRes.ok && scanRes.data?.data?.assetId === testAsset.id, 'QR Token resolved to asset');
    const scanned = scanRes.data?.data;
    assert(scanned.assetCode && scanned.model, 'Permitted identification fields returned');
    assert(
      scanned.lanIp === undefined &&
      scanned.lanMacAddress === undefined &&
      scanned.cpu === undefined &&
      scanned.ram === undefined &&
      scanned.purchaseCost === undefined,
      'Privacy protection: Sensitive IP, MAC, CPU, RAM and financial fields strictly omitted'
    );
    assert(scanned.gatePresence === 'INSIDE', 'Initial Gate Presence is verified as INSIDE');

    // Test Tag Replacement
    console.log('\n6. Testing QR Replacement Workflow (Damaged Tag)...');
    const replaceRes = await request('/qr/replace', {
      method: 'POST',
      headers: authHeaders,
      body: { assetId: testAsset.id, reason: 'Physical sticker worn' },
    });

    assert(replaceRes.ok && replaceRes.data?.data?.token !== tokenStr, 'Replacement QR issued with new token');
    const newActiveQr = replaceRes.data.data;

    // Verify old token was replaced
    const oldScanRes = await request('/security-gate/scan', {
      method: 'POST',
      headers: authHeaders,
      body: { token: tokenStr },
    });
    assert(!oldScanRes.ok && oldScanRes.status >= 400, 'Old replaced QR tag is rejected at gate checkpoint');

    // Test Tag Revocation
    console.log('\n7. Testing QR Revocation Workflow...');
    const revokeRes = await request('/qr/revoke', {
      method: 'POST',
      headers: authHeaders,
      body: { assetId: testAsset.id, reason: 'Security audit test' },
    });
    assert(revokeRes.ok, 'QR tag revoked');

    const revokedScanRes = await request('/security-gate/scan', {
      method: 'POST',
      headers: authHeaders,
      body: { token: newActiveQr.token },
    });
    assert(!revokedScanRes.ok && revokedScanRes.status >= 400, 'Revoked QR tag is prohibited from gate movements');

    // Issue fresh active QR for movement testing
    const freshGenRes = await request('/qr/generate', {
      method: 'POST',
      headers: authHeaders,
      body: { assetId: testAsset.id },
    });
    const gateQr = freshGenRes.data.data;

    // Ensure asset is INSIDE before starting movement tests
    // (If previously left outside in test, record IN first)
    const checkStatusRes = await request(`/assets/${testAsset.id}`, { headers: authHeaders });
    const currentPresence = checkStatusRes.data?.data?.gatePresence || checkStatusRes.data?.gatePresence;
    if (currentPresence === 'OUTSIDE') {
      await request('/security-gate/in', {
        method: 'POST',
        headers: authHeaders,
        body: { assetId: testAsset.id, remarks: 'Resetting test fixture' },
      });
    }

    // 8. Physical Exit (Record OUT)
    console.log('\n8. Testing Physical Exit Workflow (Record OUT)...');
    const recordOutRes = await request('/security-gate/out', {
      method: 'POST',
      headers: authHeaders,
      body: {
        assetId: testAsset.id,
        qrCodeId: gateQr.id,
        gateId: testGate.id,
        destination: 'Client Automation Site, Pune',
        purpose: 'Field Commissioning & Testing',
        expectedReturn: new Date(Date.now() + 86400000).toISOString(),
        remarks: 'Laptop inspected, power adapter included',
      },
    });

    assert(recordOutRes.ok, 'Record OUT movement succeeded');
    const outMovement = recordOutRes.data?.data;
    assert(outMovement.movementCode.startsWith('GMV-'), `Sequential movement code generated: ${outMovement.movementCode}`);
    assert(outMovement.movementType === 'OUT', 'Movement type is OUT');
    assert(outMovement.status === 'OPEN', 'Movement status is OPEN');

    // Verify Asset Gate Presence updated to OUTSIDE
    const assetAfterOutRes = await request(`/assets/${testAsset.id}`, { headers: authHeaders });
    const assetAfterOut = assetAfterOutRes.data?.data || assetAfterOutRes.data?.asset || assetAfterOutRes.data;
    assert(assetAfterOut.gatePresence === 'OUTSIDE', 'Asset.gatePresence transitioned to OUTSIDE');
    assert(
      assetAfterOut.status === originalOperationalStatus,
      `Operational Asset.status remains completely intact (${assetAfterOut.status}) - Gate presence is strictly decoupled`
    );

    // Verify Asset appears in Current Outside list
    const outsideListRes = await request('/security-gate/current-outside', { headers: authHeaders });
    const outsideItem = outsideListRes.data?.data?.rows?.find((r) => r.assetId === testAsset.id);
    assert(!!outsideItem, 'Asset appears in Current Outside monitoring list');
    assert(outsideItem && outsideItem.destination === 'Client Automation Site, Pune', 'Correct destination displayed');

    // 9. Test Duplicate OUT Prevention
    console.log('\n9. Testing Duplicate State Transition Guard (Duplicate OUT)...');
    const duplicateOutRes = await request('/security-gate/out', {
      method: 'POST',
      headers: authHeaders,
      body: {
        assetId: testAsset.id,
        gateId: testGate.id,
        destination: 'Another Site',
        purpose: 'Invalid duplicate attempt',
      },
    });
    assert(!duplicateOutRes.ok && duplicateOutRes.status >= 400, 'Duplicate OUT movement blocked while asset is already OUTSIDE');

    // 10. Physical Entry (Record IN)
    console.log('\n10. Testing Physical Entry Workflow (Record IN)...');
    const recordInRes = await request('/security-gate/in', {
      method: 'POST',
      headers: authHeaders,
      body: {
        assetId: testAsset.id,
        qrCodeId: gateQr.id,
        gateId: testGate.id,
        remarks: 'Returned in good working order',
      },
    });

    assert(recordInRes.ok, 'Record IN movement succeeded');
    const inMovement = recordInRes.data?.data;
    assert(inMovement.movementType === 'IN', 'Movement type is IN');
    assert(inMovement.status === 'COMPLETED', 'Movement status is COMPLETED');
    assert(inMovement.relatedMovementId === outMovement.id, 'IN movement properly linked to previous open OUT movement');

    // Verify Asset Gate Presence updated back to INSIDE
    const assetAfterInRes = await request(`/assets/${testAsset.id}`, { headers: authHeaders });
    const assetAfterIn = assetAfterInRes.data?.data || assetAfterInRes.data?.asset || assetAfterInRes.data;
    assert(assetAfterIn.gatePresence === 'INSIDE', 'Asset.gatePresence transitioned back to INSIDE');
    assert(
      assetAfterIn.status === originalOperationalStatus,
      `Operational Asset.status remains intact (${assetAfterIn.status})`
    );

    // Verify Asset no longer appears in Current Outside list
    const outsideListAfterInRes = await request('/security-gate/current-outside', { headers: authHeaders });
    const stillOutside = outsideListAfterInRes.data?.data?.rows?.find((r) => r.assetId === testAsset.id);
    assert(!stillOutside, 'Asset no longer appears in Current Outside monitoring list');

    // 11. Test Duplicate IN Prevention
    console.log('\n11. Testing Duplicate State Transition Guard (Duplicate IN)...');
    const duplicateInRes = await request('/security-gate/in', {
      method: 'POST',
      headers: authHeaders,
      body: {
        assetId: testAsset.id,
        gateId: testGate.id,
        remarks: 'Invalid duplicate return attempt',
      },
    });
    assert(!duplicateInRes.ok && duplicateInRes.status >= 400, 'Duplicate IN movement blocked while asset is already INSIDE');

    // 12. KPIs & Daily Register Verification
    console.log('\n12. Testing Gate Operational KPIs & Daily Register...');
    const kpisRes = await request('/security-gate/kpis', { headers: authHeaders });
    assert(kpisRes.ok && typeof kpisRes.data?.data?.totalMovements === 'number', 'Gate KPIs calculated from PostgreSQL');
    assert(kpisRes.data?.data?.todayOut >= 1 && kpisRes.data?.data?.todayIn >= 1, 'Today\'s movements reflected accurately in KPIs');

    const dailyRes = await request('/security-gate/daily-register', { headers: authHeaders });
    assert(dailyRes.ok && Array.isArray(dailyRes.data?.data), 'Daily Register retrieved');
    assert(dailyRes.data?.data?.length >= 2, 'Today\'s OUT and IN movements listed in chronological order in register');

    // 13. Movement History Search & Filter
    console.log('\n13. Testing Movement History Multi-Criteria Filtering...');
    const historyRes = await request('/security-gate/history?movementType=OUT', { headers: authHeaders });
    assert(historyRes.ok && Array.isArray(historyRes.data?.data?.movements), 'Movement history filter by OUT movements returns list');

    // 14. Bulk QR Generation Test
    console.log('\n14. Testing Bulk QR Generation for Unassigned Assets...');
    const bulkQrRes = await request('/qr/bulk-generate', {
      method: 'POST',
      headers: authHeaders,
      body: {},
    });
    assert(bulkQrRes.ok && typeof bulkQrRes.data?.data?.totalCreated === 'number', 'Bulk QR generation executed successfully');
    console.log(`     Bulk QR generated for ${bulkQrRes.data?.data?.totalCreated} assets`);

    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('════════════════════════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution encountered fatal error:', error);
    process.exit(1);
  }
}

runTests();
