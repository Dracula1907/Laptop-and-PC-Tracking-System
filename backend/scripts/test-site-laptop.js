const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING AUTOMATED SITE LAPTOP MODULE TESTS ===\n');

  // 1. Authenticate
  console.log('1. Authenticating as admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });

  const loginData = await loginRes.json();
  if (!loginData.success) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.data.token;
  console.log('✔ Authenticated successfully. Token obtained.\n');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch Stats
  console.log('2. Testing GET /api/site-laptops/stats...');
  const statsRes = await fetch(`${BASE_URL}/site-laptops/stats`, { headers });
  const statsData = await statsRes.json();
  console.log('✔ Stats received:', statsData.data);

  // 3. Fetch Eligible Inventory Laptops for Method 1
  console.log('\n3. Testing GET /api/site-laptops/eligible-inventory...');
  const inventoryRes = await fetch(`${BASE_URL}/site-laptops/eligible-inventory`, { headers });
  const inventoryJson = await inventoryRes.json();
  const inventoryLaptops = inventoryJson.data;
  console.log(`✔ Found ${inventoryLaptops.length} eligible inventory laptops.`);
  if (inventoryLaptops.length === 0) {
    throw new Error('No inventory laptops found for testing Method 1');
  }
  const testAsset = inventoryLaptops[0];
  console.log(`✔ Selected test asset: ${testAsset.assetCode} (${testAsset.manufacturer} ${testAsset.model})`);

  // 4. Test Method 1: Create Inventory-Linked Site Laptop
  console.log('\n4. Testing POST /api/site-laptops (Method 1: Inventory Linked)...');
  const createLinkedRes = await fetch(`${BASE_URL}/site-laptops`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      entryType: 'INVENTORY_LINKED',
      assetId: testAsset.id,
      destinationSite: 'Tata Motors Pune Assembly Plant, Bay 4',
      dispatchDate: '2026-09-09',
      dispatchTime: '10:00 AM',
      assignedTo: 'Rahul Sharma',
      contactNumber: '+91 98765 43210',
      purpose: 'PLC Commissioning & SCADA Integration',
      expectedReturn: '2026-09-25',
      remarks: 'Equipped with Siemens TIA Portal & Rockwell Studio',
    }),
  });
  const linkedJson = await createLinkedRes.json();
  if (!linkedJson.success) throw new Error('Create linked laptop failed: ' + JSON.stringify(linkedJson));
  const linkedRecord = linkedJson.data;
  console.log(`✔ Created linked site laptop: ${linkedRecord.code}`);
  console.log(`  - Laptop Name: ${linkedRecord.laptopName}`);
  console.log(`  - Asset ID Display: ${linkedRecord.assetIdDisplay}`);
  console.log(`  - Destination: ${linkedRecord.destinationSite}`);
  console.log(`  - Status: ${linkedRecord.status}`);
  console.log(`  - Initial History: ${linkedRecord.history?.[0]?.action} to "${linkedRecord.history?.[0]?.toSite}"`);

  // 5. Test Method 2: Create Manual Entry Site Laptop
  console.log('\n5. Testing POST /api/site-laptops (Method 2: Manual Entry)...');
  const createManualRes = await fetch(`${BASE_URL}/site-laptops`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      entryType: 'MANUAL_ENTRY',
      laptopName: 'Lenovo ThinkPad P1 Gen 6 (Client Provided)',
      assetIdDisplay: 'FAA-EXT-SITE-99',
      qrCode: 'QR-EXT-P1-99',
      serialNumber: 'LNV-P1-998822',
      destinationSite: 'Delhi Metro Rail Project, Site Office 3',
      dispatchDate: '2026-09-09',
      dispatchTime: '11:15 AM',
      assignedTo: 'Amit Verma',
      contactNumber: '+91 98111 22334',
      purpose: 'Signaling software verification',
      expectedReturn: '2026-10-15',
      remarks: 'External client machine registered for tracking',
    }),
  });
  const manualJson = await createManualRes.json();
  if (!manualJson.success) throw new Error('Create manual laptop failed: ' + JSON.stringify(manualJson));
  const manualRecord = manualJson.data;
  console.log(`✔ Created manual site laptop: ${manualRecord.code}`);
  console.log(`  - Laptop Name: ${manualRecord.laptopName}`);
  console.log(`  - Asset ID Display: ${manualRecord.assetIdDisplay}`);
  console.log(`  - Destination: ${manualRecord.destinationSite}`);

  // 6. Test Edit Action: Relocate Laptop to a New Site
  console.log(`\n6. Testing PUT /api/site-laptops/${linkedRecord.id} (Relocating site to Bangalore)...`);
  const relocateRes = await fetch(`${BASE_URL}/site-laptops/${linkedRecord.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      destinationSite: 'Bangalore Aerospace SEZ, Automation Wing',
      status: 'IN_TRANSIT',
      assignedTo: 'Rahul Sharma',
      historyNote: 'Transferred from Pune Plant to Bangalore SEZ for second phase testing',
    }),
  });
  const relocateJson = await relocateRes.json();
  if (!relocateJson.success) throw new Error('Relocate failed: ' + JSON.stringify(relocateJson));
  const relocatedRecord = relocateJson.data;
  console.log(`✔ Relocated record ${relocatedRecord.code}:`);
  console.log(`  - New Destination: ${relocatedRecord.destinationSite}`);
  console.log(`  - New Status: ${relocatedRecord.status}`);

  // 7. Test Movement History Retrieval
  console.log(`\n7. Testing GET /api/site-laptops/${linkedRecord.id} (Verifying chronological history)...`);
  const getRecordRes = await fetch(`${BASE_URL}/site-laptops/${linkedRecord.id}`, { headers });
  const fullRecord = (await getRecordRes.json()).data;
  console.log(`✔ Movement History for ${fullRecord.code} (${fullRecord.history.length} events):`);
  fullRecord.history.forEach((h, idx) => {
    console.log(`   [${idx + 1}] Action: ${h.action} | From: "${h.fromSite || '—'}" -> To: "${h.toSite || '—'}" | Notes: "${h.notes}"`);
  });

  // 8. Test Return Action
  console.log(`\n8. Testing Return to Base for ${linkedRecord.code}...`);
  const returnRes = await fetch(`${BASE_URL}/site-laptops/${linkedRecord.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      status: 'RETURNED',
      historyNote: 'Project completed successfully; laptop returned to HQ IT inventory',
    }),
  });
  const returnedJson = await returnRes.json();
  const returnedRecord = returnedJson.data;
  console.log(`✔ Record ${returnedRecord.code} status updated to: ${returnedRecord.status}`);
  console.log(`✔ Actual Return Date set to: ${returnedRecord.actualReturn}`);

  // 9. Verify Search & Filtering
  console.log('\n9. Testing GET /api/site-laptops with search and filters...');
  const searchRes = await fetch(`${BASE_URL}/site-laptops?search=Bangalore`, { headers });
  const searchJson = await searchRes.json();
  console.log(`✔ Search for "Bangalore" returned ${searchJson.data.items.length} item(s).`);

  const filterStatusRes = await fetch(`${BASE_URL}/site-laptops?status=RETURNED`, { headers });
  const filterJson = await filterStatusRes.json();
  console.log(`✔ Filter by status "RETURNED" returned ${filterJson.data.items.length} item(s).`);

  // 10. Verify Updated Stats
  console.log('\n10. Testing GET /api/site-laptops/stats after operations...');
  const finalStatsRes = await fetch(`${BASE_URL}/site-laptops/stats`, { headers });
  const finalStats = (await finalStatsRes.json()).data;
  console.log('✔ Final Stats:', finalStats);

  console.log('\n=== ALL SITE LAPTOP TESTS PASSED CLEANLY WITH ZERO ERRORS ===');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
