import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { UserService } from '../services/user.service';

export class UserController {
  static async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await UserService.getUsers();
      return res.status(200).json({ success: true, data: users });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await UserService.createUser(req.body, req.user!.userId);
      return res.status(201).json({ success: true, data: user, message: 'User created successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await UserService.updateUser(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: user, message: 'User updated successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getRoles(req: AuthenticatedRequest, res: Response) {
    try {
      const roles = await UserService.getRoles();
      return res.status(200).json({ success: true, data: roles });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
