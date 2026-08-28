import path from 'path';
import fs from 'fs';
import { ExcelImportService } from '../src/services/import.service';
import prisma from '../src/config/prisma';

async function runCliImport() {
  const args = process.argv.slice(2);
  let filePath = path.join(__dirname, '..', '..', 'data', 'company_assets.xlsx');
  let onDuplicate: 'SKIP' | 'UPDATE' = 'SKIP';

  for (const arg of args) {
    if (arg.startsWith('--file=')) {
      filePath = path.resolve(process.cwd(), arg.split('=')[1]);
    } else if (arg === '--update') {
      onDuplicate = 'UPDATE';
    }
  }

  console.log('====================================================');
  console.log('📊 ITAM Real Company IT Asset Excel Import CLI');
  console.log('====================================================');
  console.log(`📁 Source file: ${filePath}`);
  console.log(`⚙️ Duplicate mode: ${onDuplicate}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Source file not found at: ${filePath}`);
    process.exit(1);
  }

  console.log('\n🔍 Step 1: Parsing and validating workbook...');
  const preview = ExcelImportService.parseWorkbook(filePath, path.basename(filePath));

  console.log(`   Total Rows: ${preview.totalRows}`);
  console.log(`   Valid Rows: ${preview.validRows}`);
  console.log(`   Warning Rows: ${preview.warningRows}`);
  console.log(`   Error Rows: ${preview.errorRows}`);
  console.log(`   Duplicate Rows: ${preview.duplicateRows}`);

  if (preview.errorRows > 0) {
    console.warn(`⚠️ Found ${preview.errorRows} error rows. They will be logged to ImportRowLog.`);
  }

  console.log('\n🚀 Step 2: Executing import into PostgreSQL database...');
  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
  
  const result = await ExcelImportService.executeImport(preview, {
    fileName: path.basename(filePath),
    uploadedById: adminUser?.id,
    onDuplicate,
  });

  console.log('\n====================================================');
  console.log('✅ IMPORT REPORT');
  console.log('====================================================');
  console.log(`Batch ID:      ${result.importBatchId}`);
  console.log(`Total rows:    ${result.totalRows}`);
  console.log(`Imported:      ${result.importedRows}`);
  console.log(`Updated:       ${result.updatedRows}`);
  console.log(`Skipped:       ${result.skippedRows}`);
  console.log(`Warnings:      ${result.warningRows}`);
  console.log(`Errors:        ${result.errorRows}`);
  console.log('====================================================\n');

  // Verify counts in PostgreSQL directly
  const totalAssets = await prisma.asset.count();
  const laptops = await prisma.asset.count({ where: { assetType: 'LAPTOP' } });
  const officePcs = await prisma.asset.count({ where: { assetType: 'DESKTOP' } });
  const workstations = await prisma.asset.count({ where: { assetType: 'WORKSTATION' } });
  const activeAssets = await prisma.asset.count({ where: { sourceAssetStatus: 'Active' } });
  const inactiveAssets = await prisma.asset.count({ where: { sourceAssetStatus: 'Inactive' } });
  const allocated = await prisma.asset.count({ where: { allocationStatus: 'ALLOCATED' } });
  const notAllocated = await prisma.asset.count({ where: { allocationStatus: 'NOT_ALLOCATED' } });

  console.log('📈 POSTGRESQL VERIFICATION COUNTS:');
  console.log(`   Total Company Assets in DB: ${totalAssets}`);
  console.log(`   Asset Types: Laptop=${laptops}, Office PC=${officePcs}, Work Station=${workstations}`);
  console.log(`   Asset Statuses: Active=${activeAssets}, Inactive=${inactiveAssets}`);
  console.log(`   Allocation: Allocated=${allocated}, Not Allocated=${notAllocated}`);

  await prisma.$disconnect();
}

runCliImport().catch(async (err) => {
  console.error('❌ Import failed with error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
