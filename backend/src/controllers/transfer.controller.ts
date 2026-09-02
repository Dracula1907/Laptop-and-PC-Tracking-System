import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { TransferService } from '../services/transfer.service';
import { logger } from '../utils/logger';

export class TransferController {
  /**
   * Get transfers with server search, filtering, and pagination
   */
  public static async getTransfers(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await TransferService.getTransfers(req.query);
      return res.json({
        success: true,
        data: result.transfers,
        pagination: result.pagination,
        total: result.pagination.total,
      });
    } catch (err: any) {
      logger.error('Error fetching transfers:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get real-time transfer counters directly from PostgreSQL
   */
  public static async getCounts(req: AuthenticatedRequest, res: Response) {
    try {
      const counts = await TransferService.getTransferCounts();
      return res.json({ success: true, data: counts });
    } catch (err: any) {
      logger.error('Error fetching transfer counts:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get options with current asset state preview
   */
  public static async getOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const options = await TransferService.getOptions();
      return res.json({ success: true, data: options });
    } catch (err: any) {
      logger.error('Error fetching transfer options:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get single transfer details by ID or code
   */
  public static async getTransferById(req: AuthenticatedRequest, res: Response) {
    try {
      const transfer = await TransferService.getTransferById(req.params.id);
      return res.json({ success: true, data: transfer });
    } catch (err: any) {
      logger.error('Error fetching transfer details:', err);
      return res.status(404).json({ success: false, message: err.message });
    }
  }

  /**
   * Create a new asset transfer
   */
  public static async createTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const transfer = await TransferService.createTransfer(req.body, userId);
      return res.status(201).json({
        success: true,
        message: 'Asset transfer record created successfully.',
        data: transfer,
      });
    } catch (err: any) {
      logger.error('Error creating transfer:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Update a pending transfer
   */
  public static async updateTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const updated = await TransferService.updateTransfer(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: 'Transfer updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      logger.error('Error updating transfer:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Complete / Authorize a pending transfer
   */
  public static async completeTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const completed = await TransferService.completeTransfer(req.params.id, userId);
      return res.json({
        success: true,
        message: 'Transfer authorized and completed successfully. Asset state synchronized.',
        data: completed,
      });
    } catch (err: any) {
      logger.error('Error completing transfer:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Cancel a pending transfer
   */
  public static async cancelTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await TransferService.cancelTransfer(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      logger.error('Error cancelling transfer:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Reverse a completed transfer
   */
  public static async reverseTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await TransferService.reverseTransfer(req.params.id, req.body, userId);
      return res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      logger.error('Error reversing transfer:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}
