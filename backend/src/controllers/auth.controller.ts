import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async login(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await AuthService.login(req.body, req.ip, req.get('user-agent'));
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const user = await AuthService.getMe(req.user.userId);
      return res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
