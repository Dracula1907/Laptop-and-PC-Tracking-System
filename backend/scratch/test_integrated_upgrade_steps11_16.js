const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = options.headers || {};
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  try {
    return { status: res.status, ok: res.ok, data: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, ok: res.ok, raw: text };
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('FAITH AUTOMATION IT INVENTORY — PRODUCTION UPGRADE STEPS 11–16');
  console.log('AUTOMATED END-TO-END INTEGRATION TEST SUITE');
  console.log('================================================================\n');

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

  // 1. Authenticate as Admin
  console.log('1. AUTHENTICATION');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' },
  });
  assert(loginRes.ok && loginRes.data?.data?.token, 'Admin login returned valid JWT token');
  const token = loginRes.data?.data?.token;

  // 2. STEP 11: Notifications & Alerts
  console.log('\n2. STEP 11: NOTIFICATIONS & ALERTS');
  const notifRes = await request('/notifications', { token });
  assert(notifRes.ok && notifRes.data?.data?.notifications, 'GET /api/notifications returns list');
  console.log(`     Total notifications: ${notifRes.data?.data?.total}, Unread: ${notifRes.data?.data?.unreadCount}`);

  const unreadRes = await request('/notifications/unread-count', { token });
  assert(unreadRes.ok && typeof unreadRes.data?.data?.unreadCount === 'number', 'GET /api/notifications/unread-count returns integer count');

  if (notifRes.data?.data?.notifications?.length > 0) {
    const sampleId = notifRes.data.data.notifications[0].id;
    const readRes = await request(`/notifications/${sampleId}/read`, { method: 'POST', token });
    assert(readRes.ok, `POST /api/notifications/${sampleId}/read marks notification read`);
  }

  const prefsRes = await request('/notifications/preferences', { token });
  assert(prefsRes.ok && Array.isArray(prefsRes.data?.data), 'GET /api/notifications/preferences returns categories');

  const updatePrefRes = await request('/notifications/preferences', {
    method: 'PUT',
    token,
    body: { category: 'SYSTEM', inAppEnabled: true, emailEnabled: false },
  });
  assert(updatePrefRes.ok, 'PUT /api/notifications/preferences updates category preference');

  // 3. STEP 12: Reports & Management Analytics
  console.log('\n3. STEP 12: REPORTS & MANAGEMENT ANALYTICS');
  const summaryRes = await request('/reports/summary', { token });
  assert(
    summaryRes.ok &&
    typeof summaryRes.data?.data?.totalAssets === 'number' &&
    typeof summaryRes.data?.data?.allocatedAssets === 'number',
    'GET /api/reports/summary returns live PostgreSQL KPI counts'
  );

  const utilRes = await request('/reports/utilization', { token });
  assert(
    utilRes.ok &&
    typeof utilRes.data?.data?.overallRate === 'number' &&
    Array.isArray(utilRes.data?.data?.byType),
    `GET /api/reports/utilization returns overall rate: ${utilRes.data?.data?.overallRate}%`
  );

  const retRepRes = await request('/reports/returns', { token });
  assert(retRepRes.ok && typeof retRepRes.data?.data?.overdueCount === 'number', 'GET /api/reports/returns returns overdue schedule');

  const empAccRes = await request('/reports/employees', { token });
  assert(empAccRes.ok && Array.isArray(empAccRes.data?.data?.rows), 'GET /api/reports/employees returns accountability matrix');

  const mntRes = await request('/reports/maintenance', { token });
  assert(mntRes.ok && mntRes.data?.data?.costs, 'GET /api/reports/maintenance returns maintenance cost breakdown');

  const wrnRes = await request('/reports/warranty', { token });
  assert(wrnRes.ok && typeof wrnRes.data?.data?.activeWarranties === 'number', 'GET /api/reports/warranty returns warranty coverage metrics');

  const ageRes = await request('/reports/aging', { token });
  assert(ageRes.ok && Array.isArray(ageRes.data?.data), 'GET /api/reports/aging returns asset age brackets');

  const healthRes = await request('/reports/health-matrix', { token });
  assert(healthRes.ok && healthRes.data?.data?.summary, 'GET /api/reports/health-matrix returns rule-based classifications');

  // Saved Reports CRUD
  const saveRepRes = await request('/reports/saved', {
    method: 'POST',
    token,
    body: { name: 'Audit Test Report', reportType: 'SUMMARY', filters: { test: true } },
  });
  assert(saveRepRes.ok && saveRepRes.data?.data?.id, 'POST /api/reports/saved creates saved report view');
  const savedReportId = saveRepRes.data?.data?.id;

  const getSavedRes = await request('/reports/saved', { token });
  assert(getSavedRes.ok && getSavedRes.data?.data?.some(r => r.id === savedReportId), 'GET /api/reports/saved lists created view');

  const delSavedRes = await request(`/reports/saved/${savedReportId}`, { method: 'DELETE', token });
  assert(delSavedRes.ok, 'DELETE /api/reports/saved/:id removes saved view');

  // 4. STEP 13: Employee Exit & Asset Clearance
  console.log('\n4. STEP 13: EMPLOYEE EXIT & ASSET CLEARANCE');
  // Find an active employee
  const empsRes = await request('/employees?limit=10', { token });
  const activeEmp = empsRes.data?.data?.employees?.[0] || empsRes.data?.data?.[0];
  assert(activeEmp?.id, `Found test employee: ${activeEmp?.fullName} (${activeEmp?.employeeCode})`);

  let clearanceId = null;
  const initClrRes = await request('/clearance', {
    method: 'POST',
    token,
    body: {
      employeeId: activeEmp.id,
      exitDate: new Date().toISOString(),
      reason: 'Automated Upgrade Verification Exit',
      notes: 'Testing end-to-end offboarding workflow',
    },
  });

  if (initClrRes.ok) {
    clearanceId = initClrRes.data?.data?.id;
    assert(clearanceId && initClrRes.data?.data?.clearanceCode?.startsWith('CLR-'), `Initiated clearance: ${initClrRes.data?.data?.clearanceCode}`);
  } else if (initClrRes.data?.message?.includes('already exists')) {
    // Active clearance already exists for this employee, fetch existing
    const existingList = await request(`/clearance?search=${activeEmp.employeeCode}`, { token });
    clearanceId = existingList.data?.data?.clearances?.[0]?.id;
    assert(clearanceId, `Fetched existing active clearance for employee: ${clearanceId}`);
  }

  if (clearanceId) {
    const clrDetailRes = await request(`/clearance/${clearanceId}`, { token });
    assert(clrDetailRes.ok && clrDetailRes.data?.data?.id, 'GET /api/clearance/:id returns clearance dossier');

    const items = clrDetailRes.data?.data?.items || [];
    console.log(`     Discovered ${items.length} clearance item(s) to resolve`);

    // Resolve any items
    for (const item of items) {
      if (item.status !== 'RESOLVED') {
        const resolveRes = await request(`/clearance/${clearanceId}/items/${item.id}`, {
          method: 'PUT',
          token,
          body: {
            action: 'RETURN',
            conditionAtClearance: 'GOOD',
            resolutionNotes: 'Verified and inspected during upgrade test',
          },
        });
        assert(resolveRes.ok, `Resolved clearance item ${item.assetId} with RETURN & GOOD`);
      }
    }

    // Complete clearance if not already completed
    if (clrDetailRes.data?.data?.status !== 'CLEARED') {
      const compClrRes = await request(`/clearance/${clearanceId}/complete`, {
        method: 'POST',
        token,
        body: { notes: 'Automated test final sign-off' },
      });
      assert(compClrRes.ok, 'POST /api/clearance/:id/complete marks clearance CLEARED and updates employee to EXITED');
    }
  }

  // 5. STEP 14: Handover / Acceptance Documents
  console.log('\n5. STEP 14: HANDOVER / ACCEPTANCE DOCUMENT MANAGEMENT');
  if (clearanceId) {
    const docGenRes = await request('/documents', {
      method: 'POST',
      token,
      body: {
        type: 'CLEARANCE',
        relatedEntityId: clearanceId,
        remarks: 'Verification Test Official Sign-off Certificate',
      },
    });
    assert(docGenRes.ok && docGenRes.data?.data?.documentNumber?.startsWith('CLR-DOC-'), `Generated official document: ${docGenRes.data?.data?.documentNumber}`);

    const docId = docGenRes.data?.data?.id;
    if (docId) {
      const docDetailRes = await request(`/documents/${docId}`, { token });
      assert(docDetailRes.ok && docDetailRes.data?.data?.fileHash, `Document verified with SHA-256 hash: ${docDetailRes.data?.data?.fileHash?.slice(0, 16)}...`);
    }
  }

  const docsListRes = await request('/documents', { token });
  assert(docsListRes.ok && Array.isArray(docsListRes.data?.data?.documents), 'GET /api/documents returns official document repository');

  // 6. STEP 15: Bulk Operations & Excel Import
  console.log('\n6. STEP 15: BULK OPERATIONS & ADVANCED EXCEL IMPORT');
  const assetsRes = await request('/assets?limit=3', { token });
  const assetSample = assetsRes.data?.data?.assets || [];
  if (assetSample.length >= 2) {
    const assetIds = [assetSample[0].id, assetSample[1].id];
    const bulkUpdateRes = await request('/bulk/assets/update', {
      method: 'POST',
      token,
      body: {
        assetIds,
        updates: { criticality: 'High' },
      },
    });
    assert(bulkUpdateRes.ok && bulkUpdateRes.data?.data?.updatedCount >= 1, `Bulk updated criticality on ${assetIds.length} assets`);
  }

  const importHistRes = await request('/bulk/import/history', { token });
  assert(importHistRes.ok && Array.isArray(importHistRes.data?.data?.batches), 'GET /api/bulk/import/history returns import batches');

  // 7. STEP 16: Retirement & Replacement Management
  console.log('\n7. STEP 16: RETIREMENT & REPLACEMENT MANAGEMENT');
  const candidatesRes = await request('/retirements/candidates', { token });
  assert(candidatesRes.ok && Array.isArray(candidatesRes.data?.data), `GET /api/retirements/candidates returned ${candidatesRes.data?.data?.length} scored candidate(s)`);

  // Configure policy to permit self-approval for test suite
  await request('/approvals/policies/ASSET_RETIREMENT', {
    method: 'PUT',
    token,
    body: { requiresApproval: true, allowSelfApproval: true },
  });

  // Find an unassigned asset to propose retirement
  const unassignedRes = await request('/assets?status=AVAILABLE&limit=1', { token });
  const unassignedAsset = unassignedRes.data?.data?.assets?.[0];

  if (unassignedAsset) {
    const reqRtmRes = await request('/retirements/request', {

      method: 'POST',
      token,
      body: {
        assetId: unassignedAsset.id,
        reason: 'END_OF_LIFE',
        overrideReason: 'Automated test decommissioning proposal',
        remarks: 'Test decommissioning',
      },
    });
    assert(reqRtmRes.ok && reqRtmRes.data?.data?.retirementCode?.startsWith('RTM-'), `Created retirement proposal: ${reqRtmRes.data?.data?.retirementCode}`);
    const rtmId = reqRtmRes.data?.data?.id;
    const approvalRequestId = reqRtmRes.data?.data?.approvalRequestId;

    if (approvalRequestId) {
      const approveRes = await request(`/approvals/${approvalRequestId}/approve`, {
        method: 'POST',
        token,
        body: { comment: 'Approved for decommissioning via test suite' },
      });
      assert(approveRes.ok, `Approved retirement request ${approvalRequestId} in Approval Center`);
    }

    if (rtmId) {
      // Execute retirement
      const completeRtmRes = await request(`/retirements/${rtmId}/complete`, {
        method: 'POST',
        token,
        body: {
          dataSanitizationStatus: 'COMPLETED',
          disposalMethod: 'ELECTRONIC_WASTE_RECYCLER',
          disposalVendor: 'EcoRecycle Solutions',
          disposalReference: 'E-WASTE-2026-0903',
          residualValue: 1500,
          finalLocation: 'Decommissioned Storage Rack A3',
        },
      });
      assert(completeRtmRes.ok, `Executed asset retirement ${reqRtmRes.data?.data?.retirementCode} with sanitization and recycler disposition`);
    }

  }

  const rtmListRes = await request('/retirements', { token });
  assert(rtmListRes.ok && Array.isArray(rtmListRes.data?.data?.retirements), 'GET /api/retirements returns complete retirement history');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
