import { Request, Response } from 'express';
import { ExcelImportService } from '../services/import.service';
import prisma from '../config/prisma';
import { logger } from '../utils/logger';

export class ImportController {
  /**
   * Preview uploaded Excel file
   */
  public static async previewFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No Excel file uploaded.' });
      }

      const fileName = req.file.originalname || 'uploaded.xlsx';
      const preview = ExcelImportService.previewImport(req.file.buffer, fileName, req.file.size);

      return res.json({
        success: true,
        data: preview,
      });
    } catch (err: any) {
      logger.error('[IMPORT ERROR] Error previewing file:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Confirm and commit import to PostgreSQL (two-step workflow)
   */
  public static async confirmImport(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No Excel file provided for import.' });
      }

      const onDuplicate = req.body.onDuplicate === 'SKIP' ? 'SKIP' : 'UPDATE';
      const fileName = req.file.originalname || 'company_assets.xlsx';
      const preview = ExcelImportService.previewImport(req.file.buffer, fileName, req.file.size);

      if (!preview.headerValid) {
        return res.status(400).json({
          success: false,
          message: `Excel format validation failed: ${preview.headerErrors.join('; ')}`,
        });
      }

      const result = await ExcelImportService.executeImport(preview, {
        fileName,
        fileSize: req.file.size,
        uploadedById: (req as any).user?.id,
        onDuplicate,
      });

      return res.json({
        success: true,
        message: 'Excel import completed successfully',
        data: {
          importBatchId: result.importBatchId,
          totalRows: result.totalRows,
          importedRows: result.insertedRows,
          updatedRows: result.updatedRows,
          skippedRows: result.skippedRows,
          warningRows: result.warningRows,
          errorRows: result.errorRows,
          verifiedCount: result.verifiedCount,
        },
        summary: {
          totalRows: result.totalRows,
          inserted: result.insertedRows,
          updated: result.updatedRows,
          skipped: result.skippedRows,
          warnings: result.warningRows,
          errors: result.errorRows,
        },
        batchId: result.importBatchId,
      });
    } catch (err: any) {
      logger.error('[IMPORT ERROR] Error confirming import:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Direct single-step import endpoint: POST /api/assets/import
   */
  public static async directImport(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No Excel file uploaded in request.' });
      }

      const onDuplicate = req.body.onDuplicate === 'SKIP' ? 'SKIP' : 'UPDATE';
      const fileName = req.file.originalname || 'company_assets.xlsx';
      logger.info(`[IMPORT] Single-step direct upload initiated for: ${fileName}`);

      const preview = ExcelImportService.previewImport(req.file.buffer, fileName, req.file.size);

      if (!preview.headerValid) {
        return res.status(400).json({
          success: false,
          message: `Excel format validation failed: ${preview.headerErrors.join('; ')}`,
        });
      }

      const result = await ExcelImportService.executeImport(preview, {
        fileName,
        fileSize: req.file.size,
        uploadedById: (req as any).user?.id,
        onDuplicate,
      });

      return res.json({
        success: true,
        message: 'Excel import completed',
        summary: {
          totalRows: result.totalRows,
          inserted: result.insertedRows,
          updated: result.updatedRows,
          skipped: result.skippedRows,
          warnings: result.warningRows,
          errors: result.errorRows,
        },
        batchId: result.importBatchId,
        data: result,
      });
    } catch (err: any) {
      logger.error('[IMPORT ERROR] Direct import failure:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get all import batches
   */
  public static async getBatches(req: Request, res: Response) {
    try {
      const batches = await prisma.importBatch.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { username: true } },
          _count: { select: { assets: true, rowLogs: true } },
        },
      });

      return res.json({ success: true, data: batches });
    } catch (err: any) {
      logger.error('[IMPORT ERROR] Error fetching import batches:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Export all database assets matching the exact 16 company Excel columns
   */
  public static async exportCompanyExcel(req: Request, res: Response) {
    try {
      const buffer = await ExcelImportService.generateCompanyExcelExport();
      const filename = `company_it_assets_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err: any) {
      logger.error('[IMPORT ERROR] Error exporting company excel:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get data verification metrics
   */
  public static async getVerificationData(req: Request, res: Response) {
    try {
      const metrics = await ExcelImportService.getVerificationMetrics();
      return res.json({ success: true, data: metrics });
    } catch (err: any) {
      logger.error('[IMPORT ERROR] Error fetching verification metrics:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
