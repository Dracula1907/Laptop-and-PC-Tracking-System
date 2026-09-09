import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { SiteLaptopService } from '../services/site-laptop.service';

export class SiteLaptopController {
  public static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const stats = await SiteLaptopService.getStats();
      return res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async getEligibleInventory(req: AuthenticatedRequest, res: Response) {
    try {
      const search = req.query.search as string;
      const data = await SiteLaptopService.getEligibleInventoryLaptops(search);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async getSiteLaptops(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await SiteLaptopService.getSiteLaptops(req.query);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async getSiteLaptopById(req: AuthenticatedRequest, res: Response) {
    try {
      const item = await SiteLaptopService.getSiteLaptopById(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Site Laptop record not found.' });
      }
      return res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async createSiteLaptop(req: AuthenticatedRequest, res: Response) {
    try {
      const record = await SiteLaptopService.createSiteLaptop(req.body, req.user?.userId);
      return res.status(201).json({
        success: true,
        data: record,
        message: `Site Laptop record ${record.code} created successfully.`,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async updateSiteLaptop(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await SiteLaptopService.updateSiteLaptop(req.params.id, req.body, req.user?.userId);
      return res.status(200).json({
        success: true,
        data: updated,
        message: `Site Laptop record ${updated.code} updated successfully.`,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async getHistories(req: AuthenticatedRequest, res: Response) {
    try {
      const siteLaptopId = req.params.id || (req.query.siteLaptopId as string);
      const data = await SiteLaptopService.getHistories(siteLaptopId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
