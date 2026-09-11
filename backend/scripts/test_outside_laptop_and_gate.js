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

async function runTests() {
  console.log('================================================================');
  console.log('STARTING TEST SUITE: OUTSIDE LAPTOP & GATE-01 RESTRICTION');
  console.log('================================================================\n');

  let adminToken;
  let testOutRecordId;
  let testInRecordId;
  let initialAssetCount = 0;

  try {
    // ----------------------------------------------------
    // STEP 0: Authentication
    // ----------------------------------------------------
    console.log('--- Step 0: Authentication ---');
    const loginRes = await request('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    if (loginRes.status !== 200 || !loginRes.data?.data?.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.data)}`);
    }
    adminToken = loginRes.data.data.token;
    console.log('✓ Admin authenticated successfully.');

    // Count existing assets in database before tests
    initialAssetCount = await prisma.asset.count();
    console.log(`✓ Initial Asset Inventory count in DB: ${initialAssetCount}`);

    // ----------------------------------------------------
    // TEST 1: Record Outside Laptop OUT (Premises Exit)
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Record Outside Laptop OUT Movement ---');
    const outPayload = {
      movementType: 'OUT',
      laptopName: 'ThinkPad T14 Gen 3',
      laptopIdentifier: 'OUT-TEST-LAP-01',
      personName: 'Rohan Patil',
      personDetails: 'EMP-902 / Automation Dept',
      company: 'Faith Automation',
      contactNumber: '+91 9876543210',
      destination: 'Pune Commissioning Site',
      purpose: 'PLC Commissioning and Support',
      remarks: 'Charger and wireless mouse included',
    };

    const outRes = await request('POST', '/outside-laptops', outPayload, adminToken);
    if (outRes.status !== 201 || !outRes.data?.success || !outRes.data?.data) {
      throw new Error(`Failed to record OUT movement: ${JSON.stringify(outRes.data)}`);
    }

    const outRecord = outRes.data.data;
    testOutRecordId = outRecord.id;
    console.log(`✓ OUT movement recorded. Code: ${outRecord.recordCode}, Status: ${outRecord.status}`);
    if (!outRecord.recordCode.startsWith('OL-')) {
      throw new Error(`Expected recordCode to start with OL-, got ${outRecord.recordCode}`);
    }
    if (outRecord.status !== 'OUTSIDE') {
      throw new Error(`Expected status to be OUTSIDE, got ${outRecord.status}`);
    }
    if (!outRecord.movementDateTime) {
      throw new Error('Expected authoritative movementDateTime to be present');
    }

    // ----------------------------------------------------
    // TEST 2: Verify Appears in Currently Outside
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Query Currently Outside Laptops ---');
    const currentlyOutsideRes = await request('GET', '/outside-laptops/currently-outside', null, adminToken);
    if (currentlyOutsideRes.status !== 200 || !currentlyOutsideRes.data?.success) {
      throw new Error(`Failed to query currently outside: ${JSON.stringify(currentlyOutsideRes.data)}`);
    }

    const outsideList = currentlyOutsideRes.data.data;
    const foundInOutside = outsideList.find((r) => r.id === testOutRecordId);
    if (!foundInOutside) {
      throw new Error(`Newly created OUT record ${testOutRecordId} not found in Currently Outside list!`);
    }
    console.log(`✓ Successfully verified ${outRecord.laptopIdentifier} in Currently Outside list (${outsideList.length} currently outside).`);

    // ----------------------------------------------------
    // TEST 3: Edit Outside Laptop Record
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Edit Outside Laptop Record ---');
    const editPayload = {
      destination: 'Pune Client Plant - Line 4',
      remarks: 'Charger, wireless mouse, and safety bag included',
    };
    const editRes = await request('PUT', `/outside-laptops/${testOutRecordId}`, editPayload, adminToken);
    if (editRes.status !== 200 || !editRes.data?.success) {
      throw new Error(`Failed to edit record: ${JSON.stringify(editRes.data)}`);
    }
    if (editRes.data.data.destination !== 'Pune Client Plant - Line 4') {
      throw new Error(`Destination not updated: ${editRes.data.data.destination}`);
    }
    console.log(`✓ Record updated successfully. Destination: ${editRes.data.data.destination}`);

    // ----------------------------------------------------
    // TEST 4: Record Return (IN Movement)
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Record Laptop Return (IN Movement) ---');
    const inPayload = {
      movementType: 'IN',
      laptopName: outRecord.laptopName,
      laptopIdentifier: outRecord.laptopIdentifier,
      personName: outRecord.personName,
      destination: outRecord.destination,
      purpose: 'Return from site work',
      remarks: 'Returned in good physical condition. Verified by guard.',
      linkedOutRecordId: testOutRecordId,
    };

    const inRes = await request('POST', '/outside-laptops', inPayload, adminToken);
    if (inRes.status !== 201 || !inRes.data?.success) {
      throw new Error(`Failed to record IN movement: ${JSON.stringify(inRes.data)}`);
    }
    const inRecord = inRes.data.data;
    testInRecordId = inRecord.id;
    console.log(`✓ IN movement recorded. Code: ${inRecord.recordCode}, Status: ${inRecord.status}`);
    if (inRecord.status !== 'RETURNED') {
      throw new Error(`Expected IN status to be RETURNED, got ${inRecord.status}`);
    }

    // Verify previous OUT record is now marked RETURNED
    const updatedOutRecord = await prisma.outsideLaptopRecord.findUnique({
      where: { id: testOutRecordId },
    });
    if (updatedOutRecord.status !== 'RETURNED') {
      throw new Error(`Expected linked OUT record to be marked RETURNED, but got: ${updatedOutRecord.status}`);
    }
    console.log('✓ Verified previous OUT record was automatically marked RETURNED.');

    // ----------------------------------------------------
    // TEST 5: Verify Removed from Currently Outside
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Verify Laptop No Longer in Currently Outside ---');
    const outsideAfterReturnRes = await request('GET', '/outside-laptops/currently-outside', null, adminToken);
    const outsideAfterReturnList = outsideAfterReturnRes.data?.data || [];
    const stillOutside = outsideAfterReturnList.find((r) => r.id === testOutRecordId);
    if (stillOutside) {
      throw new Error('Returned laptop still appears in currently outside list!');
    }
    console.log('✓ Verified laptop is no longer in Currently Outside list.');

    // ----------------------------------------------------
    // TEST 6: Verify BOTH Movements Exist in History
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Verify Both Movements in History Register ---');
    const historyRes = await request('GET', '/outside-laptops?limit=50', null, adminToken);
    const historyRecords = historyRes.data?.data?.records || [];
    const hasOut = historyRecords.some((r) => r.id === testOutRecordId && r.movementType === 'OUT');
    const hasIn = historyRecords.some((r) => r.id === testInRecordId && r.movementType === 'IN');
    if (!hasOut || !hasIn) {
      throw new Error(`Expected both OUT and IN records in history. Found OUT: ${hasOut}, Found IN: ${hasIn}`);
    }
    console.log('✓ Both OUT and IN records exist in History with authoritative server timestamps.');

    // ----------------------------------------------------
    // TEST 7: Outside Laptop Excel Export
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Query Outside Laptop Export Data ---');
    const exportRes = await request('GET', '/outside-laptops/export', null, adminToken);
    if (exportRes.status !== 200 || !exportRes.data?.success || !Array.isArray(exportRes.data?.data)) {
      throw new Error(`Failed to query export data: ${JSON.stringify(exportRes.data)}`);
    }
    console.log(`✓ Export endpoint returned ${exportRes.data.data.length} records.`);

    // ----------------------------------------------------
    // TEST 8: CRITICAL DATA ISOLATION VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Critical Asset Inventory Data Separation Check ---');
    const finalAssetCount = await prisma.asset.count();
    if (finalAssetCount !== initialAssetCount) {
      throw new Error(
        `VIOLATION: Asset Inventory count changed! Was: ${initialAssetCount}, Now: ${finalAssetCount}`
      );
    }
    console.log(`✓ Asset Inventory count UNCHANGED (${finalAssetCount} assets). Complete data separation confirmed!`);

    // ----------------------------------------------------
    // TEST 9: GATE RESTRICTION (Only GATE-01 Active)
    // ----------------------------------------------------
    console.log('\n--- TEST 9: QR & Security Gate - Only GATE-01 Active ---');
    const gatesRes = await request('GET', '/gates', null, adminToken);
    if (gatesRes.status !== 200 || !gatesRes.data?.success) {
      throw new Error(`Failed to query /api/gates: ${JSON.stringify(gatesRes.data)}`);
    }
    const activeGates = gatesRes.data.data;
    if (activeGates.length !== 1) {
      throw new Error(`Expected exactly 1 active gate (GATE-01), but received ${activeGates.length}`);
    }
    if (activeGates[0].code !== 'GATE-01') {
      throw new Error(`Expected active gate to be GATE-01, got ${activeGates[0].code}`);
    }
    console.log(`✓ Active gate is strictly restricted to: ${activeGates[0].name} (${activeGates[0].code})`);

    // Verify other gates preserved in DB as INACTIVE for historical audit safety
    const totalDbGates = await prisma.gate.findMany();
    const inactiveGates = totalDbGates.filter((g) => g.status === 'INACTIVE');
    if (inactiveGates.length < 3) {
      throw new Error(`Expected at least 3 inactive historical gates in DB, found ${inactiveGates.length}`);
    }
    console.log(`✓ Historical gates safely preserved in PostgreSQL (${inactiveGates.length} inactive gates).`);

    console.log('\n================================================================');
    console.log('ALL 9 TESTS FOR OUTSIDE LAPTOP & GATE RESTRICTION PASSED!');
    console.log('================================================================\n');
  } finally {
    // Clean up test records
    if (testOutRecordId || testInRecordId) {
      await prisma.outsideLaptopRecord.deleteMany({
        where: {
          id: { in: [testOutRecordId, testInRecordId].filter(Boolean) },
        },
      });
      console.log('✓ Cleaned up ephemeral test records.');
    }
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err.message);
  process.exit(1);
});
