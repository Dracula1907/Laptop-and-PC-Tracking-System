import { Request, Response, NextFunction } from 'express';
import { SecurityGateService } from '../services/security-gate.service';
import { QrService } from '../services/qr.service';

export class SecurityGateController {
  static async getKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SecurityGateService.getGateKPIs();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getCurrentOutside(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SecurityGateService.getCurrentOutsideAssets(req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SecurityGateService.getMovementHistory(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async scan(req: any, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const data = await QrService.resolveQrToken(token, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getLastMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SecurityGateService.getLastMovement();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }


  static async recordOut(req: any, res: Response, next: NextFunction) {
    try {
      const data = await SecurityGateService.recordAssetOut(req.body, req.user);
      res.json({
        success: true,
        message: `Asset recorded OUT successfully. (Movement: ${data.movementCode})`,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordIn(req: any, res: Response, next: NextFunction) {
    try {
      const data = await SecurityGateService.recordAssetIn(req.body, req.user);
      res.json({
        success: true,
        message: `Asset recorded IN successfully. (Movement: ${data.movementCode})`,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDailyRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, gateId } = req.query;
      const data = await SecurityGateService.getDailyRegister(date as string, gateId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
