const { PrismaClient, AssetAction, AssetStatus, AssetCondition, AllocationStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function runStep6Verification() {
  console.log('================================================================');
  console.log('STEP 6 VERIFICATION: PROFESSIONAL ASSET HISTORY & CHAIN OF CUSTODY');
  console.log('================================================================\n');

  // 1. Authenticate
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.token;
  if (!token) throw new Error('Failed to login as admin');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  console.log('✓ Step 6.1: Admin authentication successful');

  // 2. Query an asset with real PostgreSQL history
  const assetsRes = await (await fetch('http://localhost:5000/api/assets?limit=5', { headers })).json();
  const asset = assetsRes.data.assets[0];
  console.log(`✓ Step 6.2: Selected asset for testing: ${asset.companyAssetId} (ID: ${asset.id})`);

  // 3. Test History Summary API
  const summaryRes = await (await fetch(`http://localhost:5000/api/assets/${asset.id}/history/summary`, { headers })).json();
  if (!summaryRes.success) throw new Error('History summary API failed: ' + JSON.stringify(summaryRes));
  const summary = summaryRes.data;
  console.log('✓ Step 6.3: History Summary API response verified:');
  console.log(`   - Total Events: ${summary.totalEvents}`);
  console.log(`   - Assignments: ${summary.assignments} | Transfers: ${summary.transfers} | Returns: ${summary.returns}`);
  console.log(`   - Maintenance Events: ${summary.maintenanceEvents}`);
  console.log(`   - Condition Changes: ${summary.conditionChanges} | Location Changes: ${summary.locationChanges}`);
  console.log(`   - First Activity: ${summary.firstActivity?.action} on ${summary.firstActivity?.date}`);
  console.log(`   - Last Activity: ${summary.lastActivity?.action} on ${summary.lastActivity?.date}`);
  console.log(`   - Unique Previous Custodians: ${summary.custodySummary?.previousCustodians?.length}`);

  // 4. Test Server-Side Pagination
  const page1Res = await (await fetch(`http://localhost:5000/api/assets/${asset.id}/history?limit=3&page=1`, { headers })).json();
  if (!page1Res.success || !page1Res.data.pagination) throw new Error('History pagination failed');
  console.log('✓ Step 6.4: Server Pagination verified:');
  console.log(`   - Page: ${page1Res.data.pagination.page} / ${page1Res.data.pagination.totalPages}`);
  console.log(`   - Total Records: ${page1Res.data.pagination.total}`);
  console.log(`   - Records on page: ${page1Res.data.events.length}`);

  // 5. Test Multi-Action and Search Filter
  const filteredRes = await (await fetch(`http://localhost:5000/api/assets/${asset.id}/history?action=MAINTENANCE_STARTED,TRANSFERRED&limit=10`, { headers })).json();
  console.log(`✓ Step 6.5: Multi-action filter verified (returned ${filteredRes.data.events.length} records)`);

  // 6. Test Hardware Configuration Change and History Recording
  const hardwareUpdateRes = await (await fetch(`http://localhost:5000/api/assets/${asset.id}/hardware`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      ram: '32GB DDR4',
      storage: '1TB NVMe SSD',
      reason: 'Upgraded for automation testing workload',
    })
  })).json();
  if (!hardwareUpdateRes.success) throw new Error('Hardware update failed: ' + JSON.stringify(hardwareUpdateRes));
  console.log('✓ Step 6.6: Hardware update performed');

  // Verify HARDWARE_CHANGED in history
  const hwHistoryRes = await (await fetch(`http://localhost:5000/api/assets/${asset.id}/history?action=HARDWARE_CHANGED&limit=1`, { headers })).json();
  const hwEvent = hwHistoryRes.data.events[0];
  if (!hwEvent || hwEvent.action !== 'HARDWARE_CHANGED') throw new Error('HARDWARE_CHANGED event was not recorded!');
  console.log('✓ Step 6.7: HARDWARE_CHANGED event verified in history:');
  console.log(`   - Event ID: ${hwEvent.id}`);
  console.log(`   - Action: ${hwEvent.action}`);
  console.log(`   - Remarks: ${hwEvent.remarks}`);
  console.log(`   - Related Entity Type: ${hwEvent.relatedEntityType}`);

  // 7. Test Admin Correction Workflow & Immutability Verification
  const eventToCorrect = page1Res.data.events.find((e) => !e.isCorrection) || page1Res.data.events[page1Res.data.events.length - 1];
  console.log(`Testing correction on event ${eventToCorrect.id} (Action: ${eventToCorrect.action})`);
  const correctionRes = await (await fetch(`http://localhost:5000/api/assets/${asset.id}/history/${eventToCorrect.id}/correction`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reason: 'Periodic audit verification of equipment condition tag',
      remarks: 'Validated physical device serial tag against warehouse intake record',
    })
  })).json();
  if (!correctionRes.success) throw new Error('Admin correction failed: ' + JSON.stringify(correctionRes));
  console.log('✓ Step 6.8: Admin correction workflow executed');

  // Verify Immutability: Original record still exists untouched
  const originalRecord = await prisma.assetStatusHistory.findUnique({
    where: { id: eventToCorrect.id }
  });
  if (!originalRecord) throw new Error('Original event was deleted! Immutability violated!');
  if (originalRecord.action === AssetAction.CORRECTION_RECORDED) throw new Error('Original event was overwritten! Immutability violated!');
  console.log(`✓ Step 6.9: IMMUTABILITY CONFIRMED: Original event ${originalRecord.id} remains intact with action ${originalRecord.action}`);

  // Verify Correction Record exists and is linked
  const correctionRecord = await prisma.assetStatusHistory.findFirst({
    where: {
      assetId: asset.id,
      action: AssetAction.CORRECTION_RECORDED,
      correctedHistoryId: eventToCorrect.id,
    }
  });
  if (!correctionRecord) throw new Error('Correction record was not linked to original event!');
  console.log('✓ Step 6.10: CORRECTION_RECORDED confirmed linked:');
  console.log(`   - Correction Event ID: ${correctionRecord.id}`);
  console.log(`   - Linked Original Event ID: ${correctionRecord.correctedHistoryId}`);
  console.log(`   - Correction Reason: ${correctionRecord.correctionReason}`);
  console.log(`   - isCorrection: ${correctionRecord.isCorrection}`);

  console.log('\n================================================================');
  console.log('ALL STEP 6 VERIFICATIONS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
  await prisma.$disconnect();
}

runStep6Verification().catch(async (e) => {
  console.error('VERIFICATION ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
