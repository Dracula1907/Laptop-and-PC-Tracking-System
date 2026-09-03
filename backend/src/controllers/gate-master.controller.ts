import { Request, Response, NextFunction } from 'express';
import { GateMasterService } from '../services/gate-master.service';

export class GateMasterController {
  static async getGates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await GateMasterService.getGates();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createGate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await GateMasterService.createGate(req.body);
      res.json({ success: true, message: 'Gate registered successfully.', data });
    } catch (err) {
      next(err);
    }
  }

  static async updateGate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await GateMasterService.updateGate(req.params.id, req.body);
      res.json({ success: true, message: 'Gate updated.', data });
    } catch (err) {
      next(err);
    }
  }
}
