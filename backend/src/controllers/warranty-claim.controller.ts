import { Response, NextFunction } from 'express';
import { WarrantyClaimService } from '../services/warranty-claim.service';
import {
  WarrantyClaimCreateSchema,
  WarrantyClaimUpdateSchema,
} from '../validators/schemas';

export class WarrantyClaimController {
  /**
   * GET /api/warranties/claims
   */
  static async getClaims(req: any, res: Response, next: NextFunction) {
    try {
      const data = await WarrantyClaimService.getClaims(req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/warranties/claims/:id
   */
  static async getClaimById(req: any, res: Response, next: NextFunction) {
    try {
      const data = await WarrantyClaimService.getClaimById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/warranties/claims
   */
  static async createClaim(req: any, res: Response, next: NextFunction) {
    try {
      const validated = WarrantyClaimCreateSchema.parse(req.body);
      const userId = req.user?.userId || req.user?.id;
      const data = await WarrantyClaimService.createClaim(validated, userId);
      res.status(201).json({
        success: true,
        message: 'Warranty claim filed successfully.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/warranties/claims/:id
   */
  static async updateClaim(req: any, res: Response, next: NextFunction) {
    try {
      const validated = WarrantyClaimUpdateSchema.parse(req.body);
      const userId = req.user?.userId || req.user?.id;
      const data = await WarrantyClaimService.updateClaim(req.params.id, validated, userId);
      res.json({
        success: true,
        message: 'Warranty claim updated successfully.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
