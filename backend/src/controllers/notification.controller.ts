import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  static async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await NotificationService.getUserNotifications(req.user!.userId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      await NotificationService.markAsRead(req.params.id, req.user!.userId);
      return res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      await NotificationService.markAllAsRead(req.user!.userId);
      return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
