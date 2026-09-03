import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { NotificationService } from '../services/notification.service';
import { NotificationCategory } from '@prisma/client';

export class NotificationController {
  static async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await NotificationService.getUserNotifications(req.user!.userId, req.query);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await NotificationService.getUnreadCount(req.user!.userId);
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

  static async markAsUnread(req: AuthenticatedRequest, res: Response) {
    try {
      await NotificationService.markAsUnread(req.params.id, req.user!.userId);
      return res.status(200).json({ success: true, message: 'Notification marked as unread.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const category = req.body.category as NotificationCategory | undefined;
      await NotificationService.markAllAsRead(req.user!.userId, category);
      return res.status(200).json({ success: true, message: 'Notifications marked as read.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await NotificationService.getUserPreferences(req.user!.userId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updatePreference(req: AuthenticatedRequest, res: Response) {
    try {
      const { category, inAppEnabled, emailEnabled } = req.body;
      const data = await NotificationService.updatePreference(
        req.user!.userId,
        category,
        inAppEnabled,
        emailEnabled
      );
      return res.status(200).json({ success: true, data, message: 'Preferences updated.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
