import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AuditService } from '../services/audit.service';

export class AuditController {
  static async getLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const logs = await AuditService.getLogs(req.query);
      return res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
