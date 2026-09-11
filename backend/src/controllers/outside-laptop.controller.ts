import { Request, Response, NextFunction } from 'express';
import { OutsideLaptopService } from '../services/outside-laptop.service';

export class OutsideLaptopController {
  public static async getRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        search: req.query.search as string,
        movementType: req.query.movementType as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const result = await OutsideLaptopService.getRecords(filters);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getCurrentlyOutside(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const data = await OutsideLaptopService.getCurrentlyOutside(search);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OutsideLaptopService.getStats();
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async recordMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const data = await OutsideLaptopService.recordMovement(req.body, userId);
      res.status(201).json({
        success: true,
        message: `Outside Laptop movement recorded successfully (${data.movementType}).`,
        data,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to record Outside Laptop movement.',
      });
    }
  }

  public static async updateRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const data = await OutsideLaptopService.updateRecord(req.params.id, req.body, userId);
      res.json({
        success: true,
        message: 'Outside Laptop record updated successfully.',
        data,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to update Outside Laptop record.',
      });
    }
  }

  public static async deleteRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      await OutsideLaptopService.deleteRecord(req.params.id, userId);
      res.json({
        success: true,
        message: 'Outside Laptop record deleted successfully.',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to delete Outside Laptop record.',
      });
    }
  }

  public static async getExportData(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OutsideLaptopService.getAllForExport();
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
