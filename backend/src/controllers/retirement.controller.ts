import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { RetirementService } from '../services/retirement.service';

export class RetirementController {
  static async getCandidates(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await RetirementService.getRetirementCandidates();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async requestRetirement(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await RetirementService.requestRetirement(req.body, req.user!.userId);
      return res.status(201).json({ success: true, data, message: 'Retirement request created.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async completeRetirement(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await RetirementService.completeRetirement(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data, message: 'Asset retirement executed successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async compareReplacement(req: AuthenticatedRequest, res: Response) {
    try {
      const { oldAssetId, replacementAssetId } = req.query as { oldAssetId: string; replacementAssetId: string };
      const data = await RetirementService.compareReplacement(oldAssetId, replacementAssetId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getRetirements(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await RetirementService.getRetirements(req.query);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
