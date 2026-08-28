import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { SettingService } from '../services/setting.service';

export class SettingController {
  static async getSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const settings = await SettingService.getSettings();
      return res.status(200).json({ success: true, data: settings });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await SettingService.updateSettings(req.body.settings, req.user!.userId);
      return res.status(200).json({ success: true, data: updated, message: 'Settings saved successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
