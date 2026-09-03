import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { BulkImportService } from '../services/bulk-import.service';

export class BulkController {
  static async bulkUpdateAssets(req: AuthenticatedRequest, res: Response) {
    try {
      const { assetIds, updates } = req.body;
      const data = await BulkImportService.bulkUpdateAssets(assetIds, updates, req.user!.userId);
      return res.status(200).json({ success: true, data, message: 'Bulk update completed.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async stageImport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx) file.' });
      }

      const entityType = req.body.entityType || 'ASSET';
      const mode = req.body.mode || 'CREATE_AND_UPDATE';

      const data = await BulkImportService.stageImport(
        req.file.buffer,
        req.file.originalname,
        entityType,
        mode,
        req.user!.userId
      );

      return res.status(200).json({ success: true, data, message: 'Import staged and validated.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async commitImport(req: AuthenticatedRequest, res: Response) {
    try {
      const { batchId } = req.body;
      const data = await BulkImportService.commitImport(batchId, req.user!.userId);
      return res.status(200).json({ success: true, data, message: 'Import committed successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async rollbackImport(req: AuthenticatedRequest, res: Response) {
    try {
      const { batchId } = req.body;
      const data = await BulkImportService.rollbackImport(batchId, req.user!.userId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getImportHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await BulkImportService.getImportHistory(req.query);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getImportBatch(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await BulkImportService.getImportBatch(req.params.id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }
}
