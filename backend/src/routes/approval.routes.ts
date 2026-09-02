import { Router } from 'express';
import { ApprovalController } from '../controllers/approval.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/counts', ApprovalController.getCounts);
router.get('/', ApprovalController.getApprovals);
router.get('/policies', ApprovalController.getPolicies);
router.put('/policies/:type', requirePermission('SETTINGS_MANAGE'), ApprovalController.updatePolicy);
router.get('/:id', ApprovalController.getApprovalById);
router.post('/:id/approve', ApprovalController.approve);
router.post('/:id/reject', ApprovalController.reject);
router.post('/:id/request-changes', ApprovalController.requestChanges);
router.post('/:id/resubmit', ApprovalController.resubmit);
router.post('/:id/cancel', ApprovalController.cancel);

export default router;
