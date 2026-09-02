import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { MaintenanceService } from '../services/maintenance.service';

export class MaintenanceController {
  static async getMaintenanceRecords(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await MaintenanceService.getMaintenanceRecords(req.query);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getCounts(req: AuthenticatedRequest, res: Response) {
    try {
      const counts = await MaintenanceService.getMaintenanceCounts();
      return res.status(200).json({ success: true, data: counts });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const options = await MaintenanceService.getOptions();
      return res.status(200).json({ success: true, data: options });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
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

  static async createMaintenance(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.createMaintenance(req.body, req.user!.userId);
      return res.status(201).json({
        success: true,
        data: record,
        message: 'Maintenance ticket created successfully. Asset set to UNDER_REPAIR.',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async assignTechnician(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.assignTechnician(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({
        success: true,
        data: record,
        message: 'Technician/provider assigned successfully.',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateDiagnosis(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.updateDiagnosis(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({
        success: true,
        data: record,
        message: 'Diagnostic findings recorded successfully.',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateRepair(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.updateRepair(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({
        success: true,
        data: record,
        message: 'Repair actions and costs recorded successfully.',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async completeMaintenance(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.completeMaintenance(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({
        success: true,
        data: record,
        message: 'Maintenance completed! Asset condition and inventory synchronized.',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async cancelMaintenance(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.cancelMaintenance(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({
        success: true,
        data: record,
        message: 'Maintenance ticket cancelled and asset restored.',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateMaintenance(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await MaintenanceService.updateMaintenance(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({
        success: true,
        data: record,
        message: 'Maintenance record updated successfully.',
      });
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
