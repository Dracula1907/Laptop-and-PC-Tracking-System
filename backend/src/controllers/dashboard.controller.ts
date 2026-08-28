import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  static async getSummaryStats(req: AuthenticatedRequest, res: Response) {
    try {
      const summary = await DashboardService.getSummaryStats();
      return res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getChartsData(req: AuthenticatedRequest, res: Response) {
    try {
      const charts = await DashboardService.getChartsData();
      return res.status(200).json({ success: true, data: charts });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getRecentActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const activity = await DashboardService.getRecentActivity();
      return res.status(200).json({ success: true, data: activity });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getDashboardAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      const alerts = await DashboardService.getDashboardAlerts();
      return res.status(200).json({ success: true, data: alerts });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
