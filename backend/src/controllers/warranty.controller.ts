import { Response, NextFunction } from 'express';
import { WarrantyService } from '../services/warranty.service';
import {
  WarrantyCreateSchema,
  WarrantyUpdateSchema,
  WarrantyExtendSchema,
  WarrantyCancelSchema,
} from '../validators/schemas';

export class WarrantyController {
  /**
   * GET /api/warranties/counts
   */
  static async getCounts(req: any, res: Response, next: NextFunction) {
    try {
      const counts = await WarrantyService.getWarrantyCounts();
      res.json({ success: true, data: counts });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/warranties
   */
  static async getWarranties(req: any, res: Response, next: NextFunction) {
    try {
      const data = await WarrantyService.getWarranties(req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/warranties/providers
   */
  static async getProviders(req: any, res: Response, next: NextFunction) {
    try {
      const providers = await WarrantyService.getProviders();
      res.json({ success: true, data: providers });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/warranties/asset-options
   */
  static async getAssetOptions(req: any, res: Response, next: NextFunction) {
    try {
      const assets = await WarrantyService.getAssetOptions(req.query.search as string);
      res.json({ success: true, data: assets });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/warranties/asset/:assetId
   */
  static async getWarrantyByAssetId(req: any, res: Response, next: NextFunction) {
    try {
      const warranties = await WarrantyService.getWarrantyByAssetId(req.params.assetId);
      res.json({ success: true, data: warranties });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/warranties/:id
   */
  static async getWarrantyById(req: any, res: Response, next: NextFunction) {
    try {
      const data = await WarrantyService.getWarrantyById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/warranties
   */
  static async createWarranty(req: any, res: Response, next: NextFunction) {
    try {
      const validated = WarrantyCreateSchema.parse(req.body);
      const userId = req.user?.userId || req.user?.id;
      const data = await WarrantyService.createWarranty(validated, userId);
      res.status(201).json({
        success: true,
        message: 'Warranty contract created successfully.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/warranties/:id
   */
  static async updateWarranty(req: any, res: Response, next: NextFunction) {
    try {
      const validated = WarrantyUpdateSchema.parse(req.body);
      const userId = req.user?.userId || req.user?.id;
      const data = await WarrantyService.updateWarranty(req.params.id, validated, userId);
      res.json({
        success: true,
        message: 'Warranty contract updated successfully.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/warranties/:id/extend
   */
  static async extendWarranty(req: any, res: Response, next: NextFunction) {
    try {
      const validated = WarrantyExtendSchema.parse(req.body);
      const userId = req.user?.userId || req.user?.id;
      const data = await WarrantyService.extendWarranty(req.params.id, validated, userId);
      res.json({
        success: true,
        message: 'Warranty extension granted and recorded successfully.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/warranties/:id/cancel
   */
  static async cancelWarranty(req: any, res: Response, next: NextFunction) {
    try {
      const validated = WarrantyCancelSchema.parse(req.body);
      const userId = req.user?.userId || req.user?.id;
      const data = await WarrantyService.cancelWarranty(req.params.id, validated, userId);
      res.json({
        success: true,
        message: 'Warranty contract cancelled.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
