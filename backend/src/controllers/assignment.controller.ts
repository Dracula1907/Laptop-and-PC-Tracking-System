import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AssignmentService } from '../services/assignment.service';
import { logger } from '../utils/logger';

export class AssignmentController {
  /**
   * Get assignments with search, filtering, and pagination
   */
  public static async getAssignments(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await AssignmentService.getAssignments(req.query);
      return res.json({
        success: true,
        data: result.assignments,
        pagination: result.pagination,
        total: result.pagination.total,
      });
    } catch (err: any) {
      logger.error('Error fetching assignments:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get real-time assignment summary counters directly from PostgreSQL
   */
  public static async getCounts(req: AuthenticatedRequest, res: Response) {
    try {
      const counts = await AssignmentService.getAssignmentCounts();
      return res.json({ success: true, data: counts });
    } catch (err: any) {
      logger.error('Error fetching assignment counts:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get assignment details by ID or code
   */
  public static async getAssignmentById(req: AuthenticatedRequest, res: Response) {
    try {
      const assignment = await AssignmentService.getAssignmentById(req.params.id);
      return res.json({ success: true, data: assignment });
    } catch (err: any) {
      logger.error('Error fetching assignment details:', err);
      return res.status(404).json({ success: false, message: err.message });
    }
  }

  /**
   * Create a new asset assignment
   */
  public static async createAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const assignment = await AssignmentService.createAssignment(req.body, userId);
      return res.status(201).json({
        success: true,
        message: 'Asset assigned successfully.',
        data: assignment,
      });
    } catch (err: any) {
      logger.error('Error creating assignment:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Update safe editable fields on an assignment
   */
  public static async updateAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const updated = await AssignmentService.updateAssignment(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: 'Assignment updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      logger.error('Error updating assignment:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Return asset directly through assignment
   */
  public static async returnAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await AssignmentService.returnAssignment(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      logger.error('Error returning assignment:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Cancel an active assignment
   */
  public static async cancelAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await AssignmentService.cancelAssignment(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      logger.error('Error cancelling assignment:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Get available assets, active employees, and organization options
   */
  public static async getOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const options = await AssignmentService.getOptions();
      return res.json({ success: true, data: options });
    } catch (err: any) {
      logger.error('Error fetching assignment options:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
