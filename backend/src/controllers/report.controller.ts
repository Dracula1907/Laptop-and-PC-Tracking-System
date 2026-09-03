import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ReportService } from '../services/report.service';

export class ReportController {
  static async getSummaryKPIs(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getSummaryKPIs();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getAssetAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getAssetAnalytics(req.query);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getUtilization(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getUtilization(req.query);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getEmployeeAccountability(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getEmployeeAccountability(req.query);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getReturnsReport(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getReturnsReport();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getMaintenanceAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getMaintenanceAnalytics();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getWarrantyAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getWarrantyAnalytics();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getAssetAging(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getAssetAging();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getAssetHealthMatrix(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getAssetHealthMatrix();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getSavedReports(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.getSavedReports(req.user!.userId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async createSavedReport(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await ReportService.createSavedReport(req.user!.userId, req.body);
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteSavedReport(req: AuthenticatedRequest, res: Response) {
    try {
      await ReportService.deleteSavedReport(req.params.id, req.user!.userId);
      return res.status(200).json({ success: true, message: 'Saved report deleted.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

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
