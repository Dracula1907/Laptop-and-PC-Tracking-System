import xlsx from 'xlsx';
import prisma from '../config/prisma';
import {
  AssetStatus,
  AssetType,
  AllocationStatus,
  AssetAction,
  ImportStatus,
  NotificationCategory,
  NotificationPriority,
} from '@prisma/client';
import { AssetService } from './asset.service';
import { NotificationService } from './notification.service';
import { logger } from '../utils/logger';

export class BulkImportService {
  /**
   * 1. Bulk Update Multiple Assets Safely
   */
  static async bulkUpdateAssets(
    assetIds: string[],
    updates: {
      status?: AssetStatus;
      departmentId?: string;
      locationId?: string;
      criticality?: string;
    },
    userId: string
  ) {
    if (!assetIds || assetIds.length === 0) {
      throw new Error('No assets selected for bulk operation.');
    }

    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
      include: { department: true, locationRel: true },
    });

    if (assets.length === 0) {
      throw new Error('None of the selected assets were found.');
    }

    const results = await prisma.$transaction(async (tx) => {
      const updatedList = [];

      for (const asset of assets) {
        const dataToUpdate: any = {};
        if (updates.status !== undefined) {
          dataToUpdate.status = updates.status;
        }
        if (updates.departmentId !== undefined) {
          dataToUpdate.departmentId = updates.departmentId;
        }
        if (updates.locationId !== undefined) {
          dataToUpdate.locationId = updates.locationId;
        }
        if (updates.criticality !== undefined) {
          dataToUpdate.criticality = updates.criticality;
        }


        if (Object.keys(dataToUpdate).length > 0) {
          const updated = await tx.asset.update({
            where: { id: asset.id },
            data: dataToUpdate,
          });

          // Log Asset Status History
          await tx.assetStatusHistory.create({
            data: {
              assetId: asset.id,
              action: AssetAction.STATUS_CHANGED,
              previousStatus: asset.status,
              newStatus: dataToUpdate.status || asset.status,
              previousDepartmentId: asset.departmentId,
              newDepartmentId: dataToUpdate.departmentId || asset.departmentId,
              previousLocationId: asset.locationId,
              newLocationId: dataToUpdate.locationId || asset.locationId,
              performedById: userId,
              reason: 'Bulk Asset Update',
              remarks: `Bulk updated fields: ${Object.keys(dataToUpdate).join(', ')}`,
            },
          });

          updatedList.push(updated);
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'BULK_OPERATION_COMPLETED',
          entityType: 'Asset',
          newValue: JSON.stringify({ count: updatedList.length, updates }),
        },
      });

      return updatedList;
    });

    // Notify user
    await NotificationService.createNotification({
      userId,
      category: NotificationCategory.BULK_OPERATION,
      type: 'BULK_OPERATION_COMPLETED',
      priority: NotificationPriority.NORMAL,
      title: 'Bulk Asset Update Completed',
      message: `Successfully updated ${results.length} asset(s).`,
      actionRoute: `/assets`,
    });

    return { updatedCount: results.length };
  }

  /**
   * 2. Stage Excel Import (.xlsx only) with validation, change detection & conflict checks
   */
  static async stageImport(
    fileBuffer: Buffer,
    fileName: string,
    entityType: string = 'ASSET',
    mode: string = 'CREATE_AND_UPDATE',
    userId: string
  ) {
    if (!fileName.endsWith('.xlsx')) {
      throw new Error('Only Excel (.xlsx) workbooks are supported. CSV files are prohibited.');
    }

    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Excel workbook contains no sheets.');

    const rawRows: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
    if (rawRows.length === 0) throw new Error('The uploaded Excel sheet contains no data rows.');

    const stagedRows: any[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    // Prefetch all master data for quick relationship validation
    const [departments, locations, employees, existingAssets] = await Promise.all([
      prisma.department.findMany({ select: { id: true, code: true, name: true } }),
      prisma.location.findMany({ select: { id: true, code: true, name: true } }),
      prisma.employee.findMany({ select: { id: true, employeeCode: true, fullName: true } }),
      prisma.asset.findMany({
        select: {
          id: true,
          assetCode: true,
          companyAssetId: true,
          model: true,
          status: true,
          allocationStatus: true,
          departmentId: true,
          locationId: true,
          currentHolderId: true,
          criticality: true,
        },
      }),
    ]);

    const assetMap = new Map(existingAssets.map((a) => [a.assetCode.toUpperCase(), a]));
    const companyAssetMap = new Map(
      existingAssets.filter((a) => a.companyAssetId).map((a) => [a.companyAssetId!.toUpperCase(), a])
    );
    const deptMap = new Map(departments.map((d) => [d.name.toLowerCase(), d]));
    const locMap = new Map(locations.map((l) => [l.name.toLowerCase(), l]));
    const empMap = new Map(employees.map((e) => [e.employeeCode.toUpperCase(), e]));

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2; // header is row 1
      const errors: string[] = [];
      const warnings: string[] = [];
      const changes: Record<string, { oldVal: any; newVal: any }> = {};

      // Match key: Asset ID / Asset Code
      const assetCodeRaw = row['Asset ID'] || row['assetCode'] || row['companyAssetId'];
      if (!assetCodeRaw) {
        errors.push('Row missing required Asset ID / Asset Code.');
      }

      const assetCode = assetCodeRaw ? String(assetCodeRaw).trim().toUpperCase() : '';
      const existing = assetMap.get(assetCode) || (assetCode ? companyAssetMap.get(assetCode) : null);

      if (existing) {
        // Update detection
        if (mode === 'CREATE_ONLY') {
          errors.push(`Asset ${assetCode} already exists but mode is CREATE_ONLY.`);
        } else {
          // Compare fields (Blank Cell Rule: if uploaded cell is blank/null, KEEP existing value)
          const newStatus = row['Asset Status'] || row['status'];
          if (newStatus && newStatus !== existing.status) {
            changes.status = { oldVal: existing.status, newVal: newStatus };
          }

          const newCriticality = row['Criticality'] || row['criticality'];
          if (newCriticality && newCriticality !== existing.criticality) {
            changes.criticality = { oldVal: existing.criticality, newVal: newCriticality };
          }

          if (Object.keys(changes).length > 0) {
            updatedCount++;
          } else {
            unchangedCount++;
          }
        }
      } else {
        // New asset creation
        if (mode === 'UPDATE_ONLY') {
          errors.push(`Asset ${assetCode} does not exist but mode is UPDATE_ONLY.`);
        } else {
          newCount++;
        }
      }

      // Foreign Key Validations
      const deptName = row['Department / Area'] || row['department'];
      if (deptName && !deptMap.has(String(deptName).toLowerCase())) {
        warnings.push(`Department "${deptName}" was not recognized in master data.`);
      }

      const locName = row['Location'] || row['location'];
      if (locName && !locMap.has(String(locName).toLowerCase())) {
        warnings.push(`Location "${locName}" was not recognized in master data.`);
      }

      const isError = errors.length > 0;
      if (isError) errorCount++;
      else if (warnings.length > 0) warningCount++;
      else validCount++;

      stagedRows.push({
        rowNumber: rowNum,
        assetCode,
        isNew: !existing,
        existingId: existing?.id || null,
        status: isError ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'VALID',
        errors,
        warnings,
        changes,
        rawData: row,
      });
    }

    // Save ImportBatch
    const batch = await prisma.importBatch.create({
      data: {
        fileName,
        entityType,
        mode,
        uploadedById: userId,
        totalRows: rawRows.length,
        validRows: validCount,
        warningRows: warningCount,
        errorRows: errorCount,
        importedRows: 0,
        skippedRows: errorCount,
        status: errorCount > 0 ? ImportStatus.READY : ImportStatus.READY,
        stagedData: JSON.stringify(stagedRows),
        changeSummary: JSON.stringify({ newCount, updatedCount, unchangedCount }),
      },
    });

    return {
      batchId: batch.id,
      fileName,
      totalRows: rawRows.length,
      validRows: validCount,
      warningRows: warningCount,
      errorRows: errorCount,
      newCount,
      updatedCount,
      unchangedCount,
      preview: stagedRows.slice(0, 50),
    };
  }

  /**
   * 3. Commit Staged Import Transaction
   */
  static async commitImport(batchId: string, userId: string) {
    const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('Import batch not found');
    if (batch.status === ImportStatus.IMPORTED) throw new Error('Batch has already been imported');

    const stagedRows: any[] = batch.stagedData ? JSON.parse(batch.stagedData) : [];
    const validRows = stagedRows.filter((r) => r.status !== 'ERROR');

    let committedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        if (row.existingId) {
          // Apply changes
          const updateData: any = {};
          if (row.changes?.status?.newVal) {
            updateData.status = row.changes.status.newVal as AssetStatus;
          }
          if (row.changes?.criticality?.newVal) {
            updateData.criticality = row.changes.criticality.newVal;
          }

          if (Object.keys(updateData).length > 0) {
            await tx.asset.update({
              where: { id: row.existingId },
              data: updateData,
            });

            await tx.assetStatusHistory.create({
              data: {
                assetId: row.existingId,
                action: AssetAction.ASSET_IMPORTED,
                newStatus: updateData.status,
                performedById: userId,
                reason: 'Excel Import Commit',
                remarks: `Updated via import batch ${batch.id}`,
              },
            });
          }
          committedCount++;
        }
      }

      await tx.importBatch.update({
        where: { id: batchId },
        data: {
          status: ImportStatus.IMPORTED,
          importedRows: committedCount,
          rollbackStatus: 'CAN_ROLLBACK',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'IMPORT_COMPLETED',
          entityType: 'ImportBatch',
          entityId: batchId,
          newValue: JSON.stringify({ committedCount }),
        },
      });
    });

    // Notify user
    await NotificationService.createNotification({
      userId,
      category: NotificationCategory.BULK_OPERATION,
      type: 'IMPORT_COMPLETED',
      priority: NotificationPriority.NORMAL,
      title: 'Excel Import Completed',
      message: `Import batch ${batch.fileName} completed. ${committedCount} record(s) processed.`,
      actionRoute: `/imports`,
    });

    return { success: true, committedCount };
  }

  /**
   * 4. Rollback Import
   */
  static async rollbackImport(batchId: string, userId: string) {
    const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('Import batch not found');
    if (batch.status !== ImportStatus.IMPORTED) throw new Error('Only imported batches can be rolled back.');
    if (batch.rollbackStatus === 'ROLLED_BACK') throw new Error('Batch has already been rolled back.');

    const stagedRows: any[] = batch.stagedData ? JSON.parse(batch.stagedData) : [];

    await prisma.$transaction(async (tx) => {
      for (const row of stagedRows) {
        if (row.existingId && row.changes) {
          const revertData: any = {};
          if (row.changes.status?.oldVal) {
            revertData.status = row.changes.status.oldVal as AssetStatus;
          }
          if (row.changes.criticality?.oldVal) {
            revertData.criticality = row.changes.criticality.oldVal;
          }

          if (Object.keys(revertData).length > 0) {
            await tx.asset.update({
              where: { id: row.existingId },
              data: revertData,
            });
          }
        }
      }

      await tx.importBatch.update({
        where: { id: batchId },
        data: {
          rollbackStatus: 'ROLLED_BACK',
          rollbackLog: `Rolled back by user ${userId} at ${new Date().toISOString()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'IMPORT_ROLLBACK',
          entityType: 'ImportBatch',
          entityId: batchId,
        },
      });
    });

    return { success: true, message: 'Import successfully rolled back.' };
  }

  /**
   * 5. Query Import History
   */
  static async getImportHistory(query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      prisma.importBatch.findMany({
        include: {
          uploadedBy: { select: { username: true } },
        },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.importBatch.count(),
    ]);

    return { batches, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getImportBatch(id: string) {
    return prisma.importBatch.findUnique({
      where: { id },
      include: { uploadedBy: { select: { username: true } } },
    });
  }
}
