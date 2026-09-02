const http = require('http');

const API_PORT = 5000;
let AUTH_TOKEN = '';

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('STEP 9: PROFESSIONAL WARRANTY & CONTRACT TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Authenticate Admin
  console.log('1. Authentication & System User Verification:');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { username: 'admin', password: 'admin123' }
  );

  assert(loginRes.status === 200 && loginRes.body.success, 'Admin authenticated successfully');
  AUTH_TOKEN = loginRes.body.data.token;

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AUTH_TOKEN}`,
  };

  // 2. Fetch Assets for test fixtures
  console.log('\n2. Retrieving Asset Fixtures for Warranty Testing:');
  const assetsRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: '/api/assets?limit=10',
    method: 'GET',
    headers: authHeaders,
  });
  const assets = assetsRes.body.data?.assets || [];
  assert(assets.length > 0, `Found ${assets.length} existing assets for warranty tests`);
  const testAsset = assets[0];
  const secondAsset = assets.length > 1 ? assets[1] : assets[0];

  // 3. Telemetry Counts & Backfill check
  console.log('\n3. Real-Time Telemetry Counts & Auto-Sync:');
  const countsRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: '/api/warranties/counts',
    method: 'GET',
    headers: authHeaders,
  });
  assert(countsRes.status === 200 && countsRes.body.success, 'GET /api/warranties/counts succeeded');
  const initialCounts = countsRes.body.data;
  assert(typeof initialCounts.total === 'number', `Total warranties reported: ${initialCounts.total}`);
  assert(typeof initialCounts.active === 'number', `Active warranties reported: ${initialCounts.active}`);
  assert(typeof initialCounts.expiringIn30Days === 'number', `Expiring in 30d reported: ${initialCounts.expiringIn30Days}`);

  // 4. Date Validation Integrity
  console.log('\n4. Date Validation & Logical Safeguards:');
  const invalidDateRes = await request(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/warranties',
      method: 'POST',
      headers: authHeaders,
    },
    {
      assetId: testAsset.id,
      warrantyType: 'STANDARD',
      provider: 'Dell Technologies',
      startDate: '2026-12-31',
      endDate: '2026-01-01', // Earlier than start date!
    }
  );
  assert(
    invalidDateRes.status >= 400 || !invalidDateRes.body.success,
    'Rejected warranty when End Date < Start Date'
  );

  const invalidPurchaseRes = await request(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/warranties',
      method: 'POST',
      headers: authHeaders,
    },
    {
      assetId: testAsset.id,
      warrantyType: 'STANDARD',
      provider: 'Dell Technologies',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      purchaseDate: '2026-06-01', // Purchase date after warranty start!
    }
  );
  assert(
    invalidPurchaseRes.status >= 400 || !invalidPurchaseRes.body.success,
    'Rejected warranty when Purchase Date > Start Date'
  );

  // 5. Positive Warranty Creation
  console.log('\n5. Creating Enterprise Warranty Contract:');
  const validWarrantyRes = await request(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/warranties',
      method: 'POST',
      headers: authHeaders,
    },
    {
      assetId: testAsset.id,
      warrantyType: 'STANDARD',
      provider: 'Dell Premier Care',
      policyNumber: 'POL-DELL-2026-X1',
      coverageDescription: 'Next business day onsite hardware coverage with accidental damage protection.',
      startDate: '2026-01-01',
      endDate: '2027-06-30',
      purchaseDate: '2025-12-15',
      purchaseReference: 'PO-FAITH-9982',
      warrantyCost: 22500,
      claimContact: 'Dell Enterprise Helpdesk',
      contactEmail: 'enterprise.support@dell.com',
      contactPhone: '1800-425-0088',
      coverageNotes: 'Full battery & screen coverage included.',
    }
  );

  if (!validWarrantyRes.body.success) {
    console.error('validWarrantyRes status:', validWarrantyRes.status, 'body:', JSON.stringify(validWarrantyRes.body));
  }
  assert(validWarrantyRes.status === 201 && validWarrantyRes.body.success, 'Warranty created successfully');
  const createdWarranty = validWarrantyRes.body.data;
  assert(Boolean(createdWarranty.warrantyCode.match(/^WRN-\d{6}$/)), `Sequential code generated: ${createdWarranty.warrantyCode}`);
  assert(createdWarranty.provider === 'Dell Premier Care', 'Provider persisted correctly');

  // 6. Dynamic Expiry & Status Engine Validation
  console.log('\n6. Dynamic Expiry Engine & SLA Threshold Calculation:');
  const detailRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: `/api/warranties/${createdWarranty.id}`,
    method: 'GET',
    headers: authHeaders,
  });
  const detail = detailRes.body.data;
  assert(detail.computedStatus === 'ACTIVE', `Computed status is ACTIVE (validity through 2027)`);
  assert(detail.daysRemaining > 90, `Days remaining calculated: ${detail.daysRemaining} days`);
  assert(detail.expiryCategory === 'ACTIVE', `Expiry category classified as ACTIVE`);

  // Create an expired warranty to verify dynamic EXPIRED calculation
  const expiredWarrantyRes = await request(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/warranties',
      method: 'POST',
      headers: authHeaders,
    },
    {
      assetId: secondAsset.id,
      warrantyType: 'STANDARD',
      provider: 'HP Enterprise Care',
      policyNumber: 'POL-HP-EXP-01',
      coverageDescription: 'Legacy hardware coverage',
      startDate: '2024-01-01',
      endDate: '2025-01-01', // In the past!
      warrantyCost: 12000,
    }
  );
  const expiredWarranty = expiredWarrantyRes.body.data;
  const expiredDetailRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: `/api/warranties/${expiredWarranty.id}`,
    method: 'GET',
    headers: authHeaders,
  });
  const expiredDetail = expiredDetailRes.body.data;
  assert(expiredDetail.computedStatus === 'EXPIRED', `Expired warranty dynamically calculated as EXPIRED`);
  assert(expiredDetail.daysSinceExpiry > 0, `Days since expiry calculated: ${expiredDetail.daysSinceExpiry} days ago`);

  // 7. Multi-Search & Filter Engine
  console.log('\n7. Multi-Search Across 8 Fields & Filter Verification:');
  const searchByCodeRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: `/api/warranties?search=${createdWarranty.warrantyCode}`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(searchByCodeRes.body.data?.warranties?.length > 0, `Search by warrantyCode found contract`);

  const searchByPolicyRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: `/api/warranties?search=POL-DELL-2026-X1`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(searchByPolicyRes.body.data?.warranties?.length > 0, `Search by policyNumber found contract`);

  const filterTypeRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: `/api/warranties?warrantyType=STANDARD`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(filterTypeRes.body.data?.warranties?.length > 0, `Filter by warrantyType=STANDARD succeeded`);

  // 8. Controlled Warranty Extension Workflow
  console.log('\n8. Controlled Warranty Extension Workflow (Lineage Preservation):');
  const extendRes = await request(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/warranties/${createdWarranty.id}/extend`,
      method: 'POST',
      headers: authHeaders,
    },
    {
      newEndDate: '2028-06-30',
      extensionReason: 'Mission-critical engineering CAD workstation extension',
      warrantyCost: 15000,
    }
  );

  assert(extendRes.status === 200 && extendRes.body.success, 'Warranty extension granted successfully');
  const extensionRecord = extendRes.body.data;
  assert(extensionRecord.previousWarrantyId === createdWarranty.id, 'Extension linked to previous warranty ID');
  assert(extensionRecord.warrantyType === 'EXTENDED', 'Extension warranty type is EXTENDED');

  // Verify previous warranty has isExtended: true
  const originalCheckRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: `/api/warranties/${createdWarranty.id}`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(originalCheckRes.body.data.isExtended === true, 'Original warranty marked isExtended: true');

  // 9. Warranty Claims Lifecycle & Cost Split
  console.log('\n9. Warranty Claims Registry & Lifecycle Workflow:');
  const createClaimRes = await request(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/warranties/claims',
      method: 'POST',
      headers: authHeaders,
    },
    {
      warrantyId: createdWarranty.id,
      assetId: testAsset.id,
      issue: 'Motherboard Display Adapter Failure',
      description: 'System fails to output video to internal display panel after power surge.',
      provider: 'Dell Premier Care',
      claimCost: 18500,
      coveredAmount: 18500,
      outOfPocketAmount: 0,
      warrantyCovered: true,
      remarks: 'Technician dispatched under Dell Premier SLA.',
    }
  );

  assert(createClaimRes.status === 201 && createClaimRes.body.success, 'Claim filed successfully');
  const claim = createClaimRes.body.data;
  assert(Boolean(claim.claimNumber.match(/^CLM-\d{6}$/)), `Sequential claim number: ${claim.claimNumber}`);
  assert(claim.status === 'SUBMITTED', 'Initial claim status is SUBMITTED');

  // Transition Claim to RESOLVED
  const resolveClaimRes = await request(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/warranties/claims/${claim.id}`,
      method: 'PUT',
      headers: authHeaders,
    },
    {
      status: 'RESOLVED',
      resolution: 'Motherboard replaced onsite by certified Dell technician. Diagnostic passed.',
    }
  );

  assert(resolveClaimRes.status === 200 && resolveClaimRes.body.success, 'Claim transitioned to RESOLVED');
  assert(resolveClaimRes.body.data.status === 'RESOLVED', 'Claim status is RESOLVED');
  assert(Boolean(resolveClaimRes.body.data.resolvedDate), 'Resolved date recorded');

  // 10. Financial Summary & Asset Integration
  console.log('\n10. Financial Audit & Asset Detail Integration:');
  const assetWarrantyRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: `/api/warranties/asset/${testAsset.id}`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(assetWarrantyRes.status === 200 && assetWarrantyRes.body.success, 'GET /api/warranties/asset/:assetId succeeded');
  assert(assetWarrantyRes.body.data.length >= 2, `Retrieved ${assetWarrantyRes.body.data.length} warranties for asset (original + extension)`);

  const refreshedDetailRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: `/api/warranties/${createdWarranty.id}`,
    method: 'GET',
    headers: authHeaders,
  });
  const refreshedDetail = refreshedDetailRes.body.data;
  assert(refreshedDetail.financials.totalCoveredAmount === 18500, `Financial audit verified covered claim amount: INR ${refreshedDetail.financials.totalCoveredAmount}`);

  // 11. Soft Contract Cancellation
  console.log('\n11. Non-Destructive Contract Cancellation:');
  const cancelRes = await request(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/warranties/${createdWarranty.id}/cancel`,
      method: 'POST',
      headers: authHeaders,
    },
    {
      cancellationReason: 'Equipment decommissioned for corporate asset refresh',
    }
  );
  assert(cancelRes.status === 200 && cancelRes.body.success, 'Warranty cancelled softly');
  assert(cancelRes.body.data.status === 'CANCELLED', 'Warranty status updated to CANCELLED');

  // Verify claims remain intact
  const finalDetailRes = await request({
    hostname: 'localhost',
    port: API_PORT,
    path: `/api/warranties/${createdWarranty.id}`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(finalDetailRes.body.data.claims.length > 0, 'Claims remain preserved after warranty cancellation');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
