import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { DepartmentService } from '../services/department.service';

export class DepartmentController {
  static async getDepartments(req: AuthenticatedRequest, res: Response) {
    try {
      const depts = await DepartmentService.getDepartments();
      return res.status(200).json({ success: true, data: depts });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getDepartmentById(req: AuthenticatedRequest, res: Response) {
    try {
      const dept = await DepartmentService.getDepartmentById(req.params.id);
      return res.status(200).json({ success: true, data: dept });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  static async createDepartment(req: AuthenticatedRequest, res: Response) {
    try {
      const dept = await DepartmentService.createDepartment(req.body, req.user!.userId);
      return res.status(201).json({ success: true, data: dept });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateDepartment(req: AuthenticatedRequest, res: Response) {
    try {
      const dept = await DepartmentService.updateDepartment(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: dept });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
