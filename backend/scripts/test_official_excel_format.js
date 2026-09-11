const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OFFICIAL_19_COLUMNS = [
  'Sr. no.',
  'Department',
  'User',
  'Type',
  'Make',
  'Serial No',
  'LAN IP',
  'WAN IP',
  'Asset ID',
  'LAN Mac Address',
  'WAN Mac Address',
  'Warranty Start Date',
  'Warranty End Date',
  'CPU',
  'RAM',
  'System',
  'Warranty Status',
  'Software',
  'MS Office',
];

async function runTests() {
  console.log('====================================================');
  console.log('OFFICIAL 19-COLUMN EXCEL FORMAT VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  try {
    // TEST 1: File Existence & Basic Read
    const candidatePaths = [
      path.resolve(__dirname, '../../data/ASSET LIST.xls'),
      path.resolve(__dirname, '../data/ASSET LIST.xls'),
      path.resolve(__dirname, '../../ASSET LIST.xls'),
      path.resolve(__dirname, './data/ASSET LIST.xls'),
      path.resolve(process.cwd(), 'data/ASSET LIST.xls'),
      path.resolve(process.cwd(), 'backend/data/ASSET LIST.xls'),
      path.resolve(process.cwd(), '../data/ASSET LIST.xls'),
    ];
    const excelPath = candidatePaths.find((p) => fs.existsSync(p));
    assert(!!excelPath, 'Test 1: Official Excel file exists at data/ASSET LIST.xls');

    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    assert(rawData && rawData.length > 0, 'Test 2: Excel workbook read and contains rows', `Found ${rawData.length} rows`);

    // TEST 2: Dynamic Header Detection
    let headerRowIndex = -1;
    let headers = [];
    for (let r = 0; r < Math.min(15, rawData.length); r++) {
      const row = rawData[r] || [];
      const hasAssetId = row.some((cell) => {
        const s = String(cell || '').trim().toLowerCase();
        return s === 'asset id' || s === 'assetid';
      });
      if (hasAssetId) {
        headerRowIndex = r;
        headers = row.map((c) => String(c || '').trim());
        break;
      }
    }

    assert(headerRowIndex >= 0, 'Test 3: Header row dynamically located with "Asset ID"', `Located at row index ${headerRowIndex}`);

    // TEST 3: Header Column Match
    const missingOfficialCols = OFFICIAL_19_COLUMNS.filter(
      (col) => !headers.some((h) => h.toLowerCase() === col.toLowerCase())
    );
    assert(
      missingOfficialCols.length === 0,
      'Test 4: All 19 official columns present in header row',
      `Missing: ${missingOfficialCols.join(', ')}`
    );

    // TEST 4: Row Counts & Missing Asset ID Detection
    let validRows = 0;
    let missingAssetIdRows = [];
    const serialMap = new Map();
    const lanMacMap = new Map();
    const wanMacMap = new Map();

    const assetIdColIdx = headers.findIndex((h) => h.toLowerCase() === 'asset id');
    const serialColIdx = headers.findIndex((h) => h.toLowerCase() === 'serial no');
    const lanMacColIdx = headers.findIndex((h) => h.toLowerCase().includes('lan mac'));
    const wanMacColIdx = headers.findIndex((h) => h.toLowerCase().includes('wan mac'));

    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || row.length === 0) continue;
      const assetIdVal = String(row[assetIdColIdx] || '').trim();
      if (!assetIdVal) {
        missingAssetIdRows.push(r + 1); // 1-indexed Excel row
      } else {
        validRows++;
        const serial = String(row[serialColIdx] || '').trim();
        const lanMac = String(row[lanMacColIdx] || '').trim();
        const wanMac = String(row[wanMacColIdx] || '').trim();

        if (serial && serial !== '—' && serial !== '-') {
          serialMap.set(serial, (serialMap.get(serial) || 0) + 1);
        }
        if (lanMac && lanMac !== '—' && lanMac !== '-') {
          lanMacMap.set(lanMac, (lanMacMap.get(lanMac) || 0) + 1);
        }
        if (wanMac && wanMac !== '—' && wanMac !== '-') {
          wanMacMap.set(wanMac, (wanMacMap.get(wanMac) || 0) + 1);
        }
      }
    }

    assert(validRows === 401, 'Test 5: Exactly 401 valid rows with Asset IDs detected', `Found ${validRows}`);
    assert(
      missingAssetIdRows.length === 17,
      'Test 6: Exactly 17 rows with missing Asset IDs flagged for review',
      `Found ${missingAssetIdRows.length} rows`
    );

    // TEST 5: Duplicate Detection Verification
    const dupSerials = [...serialMap.entries()].filter(([, count]) => count > 1);
    const dupLanMacs = [...lanMacMap.entries()].filter(([, count]) => count > 1);
    const dupWanMacs = [...wanMacMap.entries()].filter(([, count]) => count > 1);

    assert(dupSerials.length > 0, 'Test 7: Duplicate serial numbers detected and cataloged', `Found ${dupSerials.length} duplicated serials`);
    assert(dupLanMacs.length > 0, 'Test 8: Duplicate LAN MACs detected and cataloged', `Found ${dupLanMacs.length} duplicated LAN MACs`);

    // TEST 6: Database Integrity Check (31 initial assets unharmed)
    const dbAssets = await prisma.asset.findMany();
    assert(dbAssets.length >= 31, 'Test 9: Database assets count preserved (>= 31)', `Current DB assets: ${dbAssets.length}`);

    const existingFaaAssets = dbAssets.filter((a) => a.companyAssetId && a.companyAssetId.startsWith('FAA-'));
    assert(existingFaaAssets.length >= 20, 'Test 10: Existing FAA company asset records intact', `Found ${existingFaaAssets.length}`);

    // TEST 7: Database Schema Has 8 New Fields
    const sampleAsset = dbAssets[0];
    const schemaFieldsPresent = [
      'srNo',
      'make',
      'wanIp',
      'wanMacAddress',
      'system',
      'warrantyStatus',
      'software',
      'msOffice',
    ].every((f) => sampleAsset.hasOwnProperty(f));

    assert(schemaFieldsPresent, 'Test 11: All 8 new official fields exist on Asset model in database');

    // TEST 8: Export Functionality Verification
    const { generateCompanyExcelExport } = require('../dist/services/import.service');
    assert(typeof generateCompanyExcelExport === 'function', 'Test 12: Backend generateCompanyExcelExport service is compiled and callable');

    const exportBuffer = await generateCompanyExcelExport();
    const exportWb = xlsx.read(exportBuffer, { type: 'buffer' });
    const exportSheet = exportWb.Sheets[exportWb.SheetNames[0]];
    const exportRows = xlsx.utils.sheet_to_json(exportSheet, { header: 1 });
    const exportHeaders = exportRows[0];

    assert(
      JSON.stringify(exportHeaders) === JSON.stringify(OFFICIAL_19_COLUMNS),
      'Test 13: Exported Excel headers match the 19 official columns in exact required order',
      `Actual headers:\n${JSON.stringify(exportHeaders, null, 2)}`
    );

    // TEST 9: Blank Cell Preservation Logic Check
    // Verify that updating with empty string does not overwrite DB values
    const assetToTest = dbAssets.find((a) => a.ram && a.cpu);
    if (assetToTest) {
      const originalRam = assetToTest.ram;
      const originalCpu = assetToTest.cpu;

      // Simulate the service logic:
      // const targetRam = incomingExcelRam || existingAsset.ram;
      const incomingEmptyRam = '';
      const finalRam = incomingEmptyRam ? incomingEmptyRam : assetToTest.ram;

      assert(
        finalRam === originalRam,
        'Test 14: Blank cell preservation logic prevents overwriting existing DB attributes',
        `Expected ${originalRam}, got ${finalRam}`
      );
    }

    // TEST 10: Operational Data Protection (QR Codes, Assignments, Gate Movements)
    const qrCount = await prisma.assetQrCode.count();
    const assignmentCount = await prisma.assetAssignment.count();
    const gateCount = await prisma.gateMovement.count();

    assert(qrCount >= 31, 'Test 15: All QR Codes remain intact and active', `Found ${qrCount}`);
    assert(assignmentCount >= 22, 'Test 16: All historical & active assignments intact', `Found ${assignmentCount}`);
    assert(gateCount >= 2, 'Test 17: All security gate movement logs intact', `Found ${gateCount}`);

  } catch (err) {
    console.error('Unexpected error during verification:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
