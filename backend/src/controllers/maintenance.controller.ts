import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { MaintenanceService } from '../services/maintenance.service';
import prisma from '../config/prisma';

export class MaintenanceController {
  static async getMaintenanceRecords(req: AuthenticatedRequest, res: Response) {
    try {
      const records = await MaintenanceService.getMaintenanceRecords(req.query);
      return res.status(200).json({ success: true, data: records, total: records.length });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getMaintenanceById(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.getMaintenanceById(req.params.id);
      return res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  static async getOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const assets = await prisma.asset.findMany({
        select: {
          id: true,
          companyAssetId: true,
          assetCode: true,
          assetName: true,
          model: true,
          serialNumber: true,
          status: true,
          location: true,
        },
        orderBy: { companyAssetId: 'asc' },
      });
      return res.json({ success: true, data: { assets } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createMaintenance(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.createMaintenance(req.body, req.user!.userId);
      return res.status(201).json({ success: true, data: record, message: 'Maintenance ticket created successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateMaintenance(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.updateMaintenance(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: record, message: 'Maintenance record updated.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteMaintenance(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await MaintenanceService.deleteMaintenance(req.params.id, req.user!.userId);
      return res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
