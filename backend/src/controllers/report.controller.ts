import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ReportService } from '../services/report.service';

export class ReportController {
  static async getReportData(req: AuthenticatedRequest, res: Response) {
    try {
      const type = req.params.type;
      const data = await ReportService.getReportData(type);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
