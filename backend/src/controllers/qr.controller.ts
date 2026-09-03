import { Request, Response, NextFunction } from 'express';
import { QrService } from '../services/qr.service';

export class QrController {
  static async generateQr(req: any, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.body;
      const userId = req.user?.userId || req.user?.id;
      const data = await QrService.generateAssetQr(assetId, userId);
      res.json({ success: true, message: 'QR code generated successfully.', data });
    } catch (err) {
      next(err);
    }
  }

  static async getAssetQrs(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.params;
      const data = await QrService.getAssetQrs(assetId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async replaceQr(req: any, res: Response, next: NextFunction) {
    try {
      const { assetId, reason } = req.body;
      const userId = req.user?.userId || req.user?.id;
      const data = await QrService.replaceQr(assetId, reason, userId);
      res.json({ success: true, message: 'QR code replaced with new active tag.', data });
    } catch (err) {
      next(err);
    }
  }

  static async revokeQr(req: any, res: Response, next: NextFunction) {
    try {
      const { assetId, reason } = req.body;
      const userId = req.user?.userId || req.user?.id;
      const data = await QrService.revokeQr(assetId, reason, userId);
      res.json({ success: true, message: 'QR code revoked.', data });
    } catch (err) {
      next(err);
    }
  }

  static async bulkGenerate(req: any, res: Response, next: NextFunction) {
    try {
      const { assetIds } = req.body;
      const userId = req.user?.userId || req.user?.id;
      const data = await QrService.bulkGenerateQrs(assetIds, userId);
      res.json({ success: true, message: `Successfully generated ${data.totalCreated} QR codes.`, data });
    } catch (err) {
      next(err);
    }
  }

  static async resolveToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const data = await QrService.resolveQrToken(token);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
