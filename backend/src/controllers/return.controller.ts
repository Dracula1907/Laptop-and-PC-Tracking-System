import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ReturnService } from '../services/return.service';
import { logger } from '../utils/logger';

export class ReturnController {
  /**
   * Get returns with server-side pagination, search, and combined filters
   */
  public static async getReturns(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await ReturnService.getReturns(req.query);
      return res.json({
        success: true,
        data: result.returns,
        pagination: result.pagination,
        total: result.pagination.total,
      });
    } catch (err: any) {
      logger.error('Error fetching returns:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get live PostgreSQL aggregate counters
   */
  public static async getCounts(req: AuthenticatedRequest, res: Response) {
    try {
      const counts = await ReturnService.getReturnCounts();
      return res.json({ success: true, data: counts });
    } catch (err: any) {
      logger.error('Error fetching return counts:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get options with complete current asset state preview
   */
  public static async getOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const options = await ReturnService.getOptions();
      return res.json({ success: true, data: options });
    } catch (err: any) {
      logger.error('Error fetching return options:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get single return details by ID or code
   */
  public static async getReturnById(req: AuthenticatedRequest, res: Response) {
    try {
      const returnRec = await ReturnService.getReturnById(req.params.id);
      return res.json({ success: true, data: returnRec });
    } catch (err: any) {
      logger.error('Error fetching return details:', err);
      return res.status(404).json({ success: false, message: err.message });
    }
  }

  /**
   * Create a new return (Initiation or immediate completion)
   */
  public static async createReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const created = await ReturnService.createReturn(req.body, userId);
      return res.status(201).json({
        success: true,
        message: 'Asset return record processed successfully.',
        data: created,
      });
    } catch (err: any) {
      logger.error('Error creating return:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Receive a pending return (Physical receipt)
   */
  public static async receiveReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const updated = await ReturnService.receiveReturn(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: 'Asset marked as physically received at facility.',
        data: updated,
      });
    } catch (err: any) {
      logger.error('Error receiving return:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Inspect a received return (Checklist & Diagnostics)
   */
  public static async inspectReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const updated = await ReturnService.inspectReturn(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: 'Physical inspection and diagnostic results recorded successfully.',
        data: updated,
      });
    } catch (err: any) {
      logger.error('Error inspecting return:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Complete a return (Finalize workflow and update asset state)
   */
  public static async completeReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const updated = await ReturnService.completeReturn(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: 'Asset return completed successfully. Custody and inventory synchronized.',
        data: updated,
      });
    } catch (err: any) {
      logger.error('Error completing return:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Cancel a pending or received return
   */
  public static async cancelReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await ReturnService.cancelReturn(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: result.message,
        data: result.returnRecord,
      });
    } catch (err: any) {
      logger.error('Error cancelling return:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Safe update of return record
   */
  public static async updateReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const updated = await ReturnService.updateReturn(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: 'Return record updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      logger.error('Error updating return:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}
