import { Request, Response, NextFunction } from 'express';
import { ApprovalService } from '../services/approval.service';
import { ApprovalPolicyService } from '../services/approval-policy.service';
import {
  ApprovalDecisionSchema,
  ApprovalRejectionSchema,
  ApprovalRequestChangesSchema,
  ApprovalResubmitSchema,
  ApprovalCancellationSchema,
  ApprovalPolicyUpdateSchema,
} from '../validators/schemas';

export class ApprovalController {
  /**
   * GET /api/approvals/counts
   */
  static async getCounts(req: any, res: Response, next: NextFunction) {
    try {
      const counts = await ApprovalService.getApprovalCounts(req.user);
      res.json({ success: true, data: counts });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/approvals
   */
  static async getApprovals(req: any, res: Response, next: NextFunction) {
    try {
      const data = await ApprovalService.getApprovals(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/approvals/:id
   */
  static async getApprovalById(req: any, res: Response, next: NextFunction) {
    try {
      const data = await ApprovalService.getApprovalById(req.params.id, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/approvals/:id/approve
   */
  static async approve(req: any, res: Response, next: NextFunction) {
    try {
      const validated = ApprovalDecisionSchema.parse(req.body);
      const data = await ApprovalService.approveRequest(req.params.id, validated, req.user);
      res.json({
        success: true,
        message: 'Approval request approved and operation executed successfully.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/approvals/:id/reject
   */
  static async reject(req: any, res: Response, next: NextFunction) {
    try {
      const validated = ApprovalRejectionSchema.parse(req.body);
      const data = await ApprovalService.rejectRequest(req.params.id, validated, req.user);
      res.json({
        success: true,
        message: 'Approval request rejected.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/approvals/:id/request-changes
   */
  static async requestChanges(req: any, res: Response, next: NextFunction) {
    try {
      const validated = ApprovalRequestChangesSchema.parse(req.body);
      const data = await ApprovalService.requestChanges(req.params.id, validated, req.user);
      res.json({
        success: true,
        message: 'Modifications requested on proposal.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/approvals/:id/resubmit
   */
  static async resubmit(req: any, res: Response, next: NextFunction) {
    try {
      const validated = ApprovalResubmitSchema.parse(req.body);
      const data = await ApprovalService.resubmitRequest(req.params.id, validated, req.user.id);
      res.json({
        success: true,
        message: 'Proposal revised and resubmitted for review.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/approvals/:id/cancel
   */
  static async cancel(req: any, res: Response, next: NextFunction) {
    try {
      const validated = ApprovalCancellationSchema.parse(req.body);
      const data = await ApprovalService.cancelRequest(req.params.id, validated, req.user.id);
      res.json({
        success: true,
        message: 'Approval request cancelled.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/approvals/policies
   */
  static async getPolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const policies = await ApprovalPolicyService.getPolicies();
      res.json({ success: true, data: policies });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/approvals/policies/:type
   */
  static async updatePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = ApprovalPolicyUpdateSchema.parse(req.body);
      const policy = await ApprovalPolicyService.updatePolicy(req.params.type as any, validated);
      res.json({ success: true, message: 'Policy configuration updated.', data: policy });
    } catch (err) {
      next(err);
    }
  }
}
