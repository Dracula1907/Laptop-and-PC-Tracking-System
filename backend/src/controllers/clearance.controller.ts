import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ClearanceService } from '../services/clearance.service';

export class ClearanceController {
  static async initiateClearance(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ClearanceService.initiateClearance(req.body, req.user!.userId);
      return res.status(201).json({ success: true, data, message: 'Clearance initiated successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getClearances(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ClearanceService.getClearances(req.query);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getClearanceById(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ClearanceService.getClearanceById(req.params.id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  static async resolveClearanceItem(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ClearanceService.resolveClearanceItem(req.params.itemId, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data, message: 'Clearance item resolved.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async completeClearance(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ClearanceService.completeClearance(req.params.id, req.user!.userId, req.body.notes);
      return res.status(200).json({ success: true, data, message: 'Clearance completed and signed off.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
