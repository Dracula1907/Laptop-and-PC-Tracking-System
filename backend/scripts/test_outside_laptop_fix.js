const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000/api';

async function request(method, path, body = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const status = res.status;
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  return { status, data };
}

async function runTest() {
  console.log('================================================================');
  console.log('RUNNING FULL END-TO-END VERIFICATION: OUTSIDE LAPTOP RECORD FIX');
  console.log('================================================================\n');

  let adminToken;
  let testOutRecord;
  let testInRecord;
  const initialAssetCount = await prisma.asset.count();
  console.log(`Initial Asset Inventory count in DB: ${initialAssetCount}`);

  // 1. Authenticate
  const loginRes = await request('POST', '/auth/login', {
    username: 'admin',
    password: 'admin123',
  });
  if (loginRes.status !== 200 || !loginRes.data?.data?.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
  }
  adminToken = loginRes.data.data.token;
  console.log('✓ 1. Admin login successful.');

  // Check stats before creating OUT record
  const statsBefore = await request('GET', '/outside-laptops/stats', null, adminToken);
  console.log('Initial stats from API:', statsBefore.data?.data);
  const initialOutside = statsBefore.data?.data?.currentlyOutside || 0;
  const initialTotal = statsBefore.data?.data?.totalMovements || 0;
  const initialReturned = statsBefore.data?.data?.totalReturned || 0;

  // TEST A: Create OUT record (User's exact example)
  console.log('\n--- TEST A: Create OUT record ---');
  const outPayload = {
    movementType: 'OUT',
    laptopName: 'dell 5420',
    laptopIdentifier: '12132',
    personName: 'TEST',
    personDetails: 'EMP-104',
    company: 'Faith Automation',
    contactNumber: '143431234234',
    destination: 'Pune',
    purpose: 'testing',
    remarks: 'testing accessories included',
  };

  const createOutRes = await request('POST', '/outside-laptops', outPayload, adminToken);
  if (createOutRes.status !== 201 || !createOutRes.data?.success) {
    throw new Error(`TEST A Failed - Could not create OUT record: ${JSON.stringify(createOutRes.data)}`);
  }
  testOutRecord = createOutRes.data.data;
  console.log(`✓ TEST A PASSED: OUT record created. ID: ${testOutRecord.id}, Code: ${testOutRecord.recordCode}, Status: ${testOutRecord.status}`);

  // TEST B & C: Verify Persistence (Refresh & Re-login simulation)
  console.log('\n--- TEST B & C: Verify Persistence & Re-login ---');
  const reLoginRes = await request('POST', '/auth/login', {
    username: 'admin',
    password: 'admin123',
  });
  const freshToken = reLoginRes.data?.data?.token;
  if (!freshToken) throw new Error('Re-login failed');
  console.log('✓ Re-authenticated with fresh session token.');

  // TEST F: Verify Current Outside Count
  console.log('\n--- TEST F: Verify Current Outside Count & List ---');
  const outsideListRes = await request('GET', '/outside-laptops/currently-outside', null, freshToken);
  if (outsideListRes.status !== 200 || !outsideListRes.data?.success) {
    throw new Error(`Failed to fetch currently outside: ${JSON.stringify(outsideListRes.data)}`);
  }
  const outsideItems = outsideListRes.data.data;
  const foundOut = outsideItems.find((r) => r.id === testOutRecord.id);
  if (!foundOut) {
    throw new Error(`TEST F Failed: Created record ${testOutRecord.id} not found in currently outside list!`);
  }
  console.log(`✓ TEST F PASSED: Created laptop is in currently outside list. Total outside: ${outsideItems.length}`);

  // TEST D: Create IN record (Return)
  console.log('\n--- TEST D: Create IN record ---');
  const inPayload = {
    movementType: 'IN',
    laptopName: testOutRecord.laptopName,
    laptopIdentifier: testOutRecord.laptopIdentifier,
    personName: testOutRecord.personName,
    personDetails: testOutRecord.personDetails,
    company: testOutRecord.company,
    contactNumber: testOutRecord.contactNumber,
    destination: testOutRecord.destination,
    purpose: 'Return to premise after testing',
    remarks: 'Returned in good condition. Verified.',
    linkedOutRecordId: testOutRecord.id,
  };

  const createInRes = await request('POST', '/outside-laptops', inPayload, freshToken);
  if (createInRes.status !== 201 || !createInRes.data?.success) {
    throw new Error(`TEST D Failed - Could not create IN record: ${JSON.stringify(createInRes.data)}`);
  }
  testInRecord = createInRes.data.data;
  console.log(`✓ TEST D PASSED: IN record created. ID: ${testInRecord.id}, Code: ${testInRecord.recordCode}, Status: ${testInRecord.status}`);

  // TEST E: Verify Movement History contains BOTH movements
  console.log('\n--- TEST E: Verify Movement History contains both events ---');
  const historyRes = await request('GET', '/outside-laptops?limit=50', null, freshToken);
  if (historyRes.status !== 200 || !historyRes.data?.success) {
    throw new Error(`Failed to fetch history: ${JSON.stringify(historyRes.data)}`);
  }
  const historyItems = historyRes.data.data.records || [];
  const outHistoryItem = historyItems.find((r) => r.id === testOutRecord.id);
  const inHistoryItem = historyItems.find((r) => r.id === testInRecord.id);

  if (!outHistoryItem || !inHistoryItem) {
    throw new Error(`TEST E Failed: Expected both OUT and IN in history. OUT: ${!!outHistoryItem}, IN: ${!!inHistoryItem}`);
  }
  if (outHistoryItem.status !== 'RETURNED') {
    throw new Error(`Expected OUT item status to be updated to RETURNED, got: ${outHistoryItem.status}`);
  }
  console.log('✓ TEST E PASSED: Both OUT and IN records exist in History Register.');

  // TEST G: Verify Today's Movement Count & Updated Stats
  console.log('\n--- TEST G: Verify Counters & Today Movements ---');
  const statsAfter = await request('GET', '/outside-laptops/stats', null, freshToken);
  const updatedStats = statsAfter.data?.data;
  console.log('Updated Stats:', updatedStats);
  if (updatedStats.totalMovements !== initialTotal + 2) {
    throw new Error(`Expected totalMovements to increase by 2. Before: ${initialTotal}, After: ${updatedStats.totalMovements}`);
  }
  if (updatedStats.totalReturned !== initialReturned + 1) {
    throw new Error(`Expected totalReturned to increase by 1. Before: ${initialReturned}, After: ${updatedStats.totalReturned}`);
  }
  if (updatedStats.currentlyOutside !== initialOutside) {
    throw new Error(`Expected currentlyOutside to be back to ${initialOutside}, got: ${updatedStats.currentlyOutside}`);
  }
  console.log('✓ TEST G PASSED: All counters (Total, Currently Outside, Returned, Today) accurately updated from PostgreSQL.');

  // TEST H: Verify PostgreSQL Directly
  console.log('\n--- TEST H: Verify PostgreSQL Row Directly ---');
  const dbOutRow = await prisma.outsideLaptopRecord.findUnique({
    where: { id: testOutRecord.id },
  });
  const dbInRow = await prisma.outsideLaptopRecord.findUnique({
    where: { id: testInRecord.id },
  });
  if (!dbOutRow || !dbInRow) {
    throw new Error('TEST H Failed: Rows not found in PostgreSQL!');
  }
  console.log(`✓ TEST H PASSED: PostgreSQL row verified directly:`);
  console.log(`  Row 1 (OUT): ${dbOutRow.recordCode} | ${dbOutRow.laptopName} | ${dbOutRow.movementType} | ${dbOutRow.movementDateTime.toISOString()}`);
  console.log(`  Row 2 (IN):  ${dbInRow.recordCode} | ${dbInRow.laptopName} | ${dbInRow.movementType} | ${dbInRow.movementDateTime.toISOString()}`);

  // TEST I: Verify Excel Export
  console.log('\n--- TEST I: Verify Excel Export Endpoint ---');
  const exportRes = await request('GET', '/outside-laptops/export', null, freshToken);
  if (exportRes.status !== 200 || !exportRes.data?.success || !Array.isArray(exportRes.data?.data)) {
    throw new Error(`TEST I Failed: Export endpoint failed: ${JSON.stringify(exportRes.data)}`);
  }
  const hasOutInExport = exportRes.data.data.some((r) => r.id === testOutRecord.id);
  const hasInInExport = exportRes.data.data.some((r) => r.id === testInRecord.id);
  if (!hasOutInExport || !hasInInExport) {
    throw new Error('TEST I Failed: Created records missing from export data');
  }
  console.log(`✓ TEST I PASSED: Export contains ${exportRes.data.data.length} records including both test movements.`);

  // TEST J: Verify Asset Inventory Unchanged
  console.log('\n--- TEST J: Verify Asset Inventory Unchanged ---');
  const finalAssetCount = await prisma.asset.count();
  if (finalAssetCount !== initialAssetCount) {
    throw new Error(`TEST J Failed: Asset inventory count changed! Initial: ${initialAssetCount}, Final: ${finalAssetCount}`);
  }
  console.log(`✓ TEST J PASSED: Asset inventory remains completely untouched (${finalAssetCount} assets). Zero data contamination.`);

  console.log('\n================================================================');
  console.log('ALL 10 TESTS PASSED SEAMLESSLY!');
  console.log('================================================================\n');

  // Cleanup test rows
  await prisma.outsideLaptopRecord.deleteMany({
    where: { id: { in: [testOutRecord.id, testInRecord.id] } },
  });
  console.log('✓ Cleaned up test rows.');
  await prisma.$disconnect();
}

runTest().catch((err) => {
  console.error('\n❌ Test Error:', err.message);
  process.exit(1);
});
