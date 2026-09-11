const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('EXECUTING OFFICIAL ASSET LIST IMPORT INTO POSTGRESQL');
  console.log('====================================================\n');

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
  if (!excelPath) {
    console.error(`ERROR: Official file ASSET LIST.xls not found in candidate paths.`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(excelPath);
  const fileSize = fs.statSync(excelPath).size;

  const { ExcelImportService } = require('../dist/services/import.service');
  const { QrService } = require('../dist/services/qr.service');

  console.log(`1. Reading & analyzing ${excelPath} (${(fileSize / 1024).toFixed(1)} KB)...`);
  const preview = ExcelImportService.previewImport(fileBuffer, 'ASSET LIST.xls', fileSize);

  console.log(`   - Format Detected: ${preview.formatType}`);
  console.log(`   - Header Valid: ${preview.headerValid}`);
  console.log(`   - Total Rows in File: ${preview.totalRows}`);
  console.log(`   - Valid Rows (with Asset ID): ${preview.validRows}`);
  console.log(`   - Flagged Rows (Missing Asset ID): ${preview.errorRows}`);
  console.log(`   - Rows with Warnings: ${preview.warningRows}`);

  if (!preview.headerValid) {
    console.error(`Header validation failed:`, preview.headerErrors);
    process.exit(1);
  }

  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
  const uploadedById = adminUser ? adminUser.id : null;

  console.log('\n2. Executing database import with blank-cell preservation and Asset ID matching...');
  const result = await ExcelImportService.executeImport(preview, {
    fileName: 'ASSET LIST.xls',
    fileSize,
    uploadedById,
    onDuplicate: 'UPDATE',
  });

  console.log(`   ✓ Import batch registered: ID ${result.importBatchId}`);
  console.log(`   ✓ Inserted New Assets: ${result.insertedRows}`);
  console.log(`   ✓ Updated Existing Assets: ${result.updatedRows}`);
  console.log(`   ✓ Skipped (Missing Asset IDs): ${result.skippedRows}`);

  console.log('\n3. Generating active QR codes for any newly inserted assets...');
  const assetsWithoutQr = await prisma.asset.findMany({
    where: {
      qrCodes: {
        none: {
          status: 'ACTIVE',
        },
      },
    },
  });

  let qrGenerated = 0;
  for (const asset of assetsWithoutQr) {
    try {
      await QrService.generateAssetQr(asset.id, uploadedById);
      qrGenerated++;
    } catch (qrErr) {
      console.warn(`   Warning: QR generation skipped for asset ${asset.companyAssetId}:`, qrErr.message);
    }
  }
  console.log(`   ✓ Active QR codes generated: ${qrGenerated}`);

  console.log('\n4. Verifying overall database health...');
  const finalTotalAssets = await prisma.asset.count();
  const finalActiveAssets = await prisma.asset.count({ where: { sourceAssetStatus: 'Active' } });
  const finalAllocatedAssets = await prisma.asset.count({ where: { allocationStatus: 'ALLOCATED' } });
  const finalQrCount = await prisma.assetQrCode.count({ where: { status: 'ACTIVE' } });
  const finalAssignmentCount = await prisma.assetAssignment.count();
  const finalMaintenanceCount = await prisma.maintenanceRecord.count();
  const finalGateMovementCount = await prisma.gateMovement.count();

  console.log(`   - Total Assets in Database: ${finalTotalAssets}`);
  console.log(`   - Active Assets: ${finalActiveAssets}`);
  console.log(`   - Allocated Assets: ${finalAllocatedAssets}`);
  console.log(`   - Active QR Codes: ${finalQrCount}`);
  console.log(`   - Assignment Records: ${finalAssignmentCount}`);
  console.log(`   - Maintenance Records: ${finalMaintenanceCount}`);
  console.log(`   - Gate Movements: ${finalGateMovementCount}`);

  console.log('\n====================================================');
  console.log('OFFICIAL IMPORT COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

main()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Import execution failed:', err);
    prisma.$disconnect();
    process.exit(1);
  });
