import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AssetService } from '../services/asset.service';
import { HistoryService } from '../services/history.service';

export class AssetController {
  static async getAssets(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await AssetService.getAssets(req.query);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getAssetById(req: AuthenticatedRequest, res: Response) {
    try {
      const asset = await AssetService.getAssetById(req.params.id);
      return res.status(200).json({ success: true, data: asset });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  static async createAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const asset = await AssetService.createAsset(req.body, req.user!.userId);
      return res.status(201).json({ success: true, data: asset, message: 'Asset created successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const asset = await AssetService.updateAsset(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: asset, message: 'Asset updated successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateHardware(req: AuthenticatedRequest, res: Response) {
    try {
      const asset = await AssetService.updateHardware(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: asset, message: 'Hardware configuration updated successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async assignAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const assignment = await AssetService.assignAsset(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: assignment, message: 'Asset assigned successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async transferAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const transfer = await AssetService.transferAsset(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: transfer, message: 'Asset transfer processed.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async returnAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const returnRec = await AssetService.returnAsset(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: returnRec, message: 'Asset return processed.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async createMaintenance(req: AuthenticatedRequest, res: Response) {
    try {
      const maintenance = await AssetService.createMaintenance({ ...req.body, assetId: req.params.id }, req.user!.userId);
      return res.status(201).json({ success: true, data: maintenance, message: 'Maintenance ticket created.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await AssetService.deleteAsset(req.params.id, req.user!.userId);
      return res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deactivateAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await AssetService.deactivateAsset(req.params.id, req.user!.userId);
      return res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getDepartments(_req: AuthenticatedRequest, res: Response) {
    try {
      const departments = await AssetService.getDistinctDepartments();
      return res.status(200).json({ success: true, data: departments });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getLocations(_req: AuthenticatedRequest, res: Response) {
    try {
      const locations = await AssetService.getDistinctLocations();
      return res.status(200).json({ success: true, data: locations });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getInventoryCounts(_req: AuthenticatedRequest, res: Response) {
    try {
      const counts = await AssetService.getInventoryCounts();
      return res.status(200).json({ success: true, data: counts });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getAssetHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const history = await HistoryService.getAssetHistory(req.params.id, req.query);
      return res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getAssetHistorySummary(req: AuthenticatedRequest, res: Response) {
    try {
      const summary = await HistoryService.getAssetHistorySummary(req.params.id);
      return res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async recordHistoryCorrection(req: AuthenticatedRequest, res: Response) {
    try {
      const correction = await HistoryService.recordCorrection(
        req.params.id,
        req.params.historyId,
        req.body,
        req.user!.userId
      );
      return res.status(201).json({
        success: true,
        data: correction,
        message: 'Administrative correction recorded successfully. Original history entry preserved.',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getGlobalHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const history = await HistoryService.getGlobalHistory(req.query);
      return res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
