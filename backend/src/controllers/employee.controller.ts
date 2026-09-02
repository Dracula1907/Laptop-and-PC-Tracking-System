import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { EmployeeService } from '../services/employee.service';

export class EmployeeController {
  static async getEmployeeCounts(req: AuthenticatedRequest, res: Response) {
    try {
      const counts = await EmployeeService.getEmployeeCounts();
      return res.status(200).json({ success: true, data: counts });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getEmployees(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await EmployeeService.getEmployees(req.query);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getEmployeeById(req: AuthenticatedRequest, res: Response) {
    try {
      const emp = await EmployeeService.getEmployeeById(req.params.id);
      return res.status(200).json({ success: true, data: emp });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  static async createEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const emp = await EmployeeService.createEmployee(req.body, req.user!.userId);
      return res.status(201).json({ success: true, data: emp, message: 'Employee created successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const emp = await EmployeeService.updateEmployee(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: emp, message: 'Employee updated successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deactivateEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await EmployeeService.deactivateEmployee(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({
        success: true,
        data: result,
        message: result.clearanceRequired
          ? 'Employee status changed to EXITED/INACTIVE. Asset clearance is required for active held hardware.'
          : 'Employee deactivated successfully.',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await EmployeeService.deleteEmployee(req.params.id, req.user!.userId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
