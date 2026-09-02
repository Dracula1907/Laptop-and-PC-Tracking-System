import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/counts', requirePermission('ASSET_VIEW'), AssignmentController.getCounts);
router.get('/options', requirePermission('ASSIGNMENT_CREATE'), AssignmentController.getOptions);
router.get('/', requirePermission('ASSET_VIEW'), AssignmentController.getAssignments);
router.get('/:id', requirePermission('ASSET_VIEW'), AssignmentController.getAssignmentById);
router.post('/', requirePermission('ASSIGNMENT_CREATE'), AssignmentController.createAssignment);
router.put('/:id', requirePermission('ASSIGNMENT_CREATE'), AssignmentController.updateAssignment);
router.post('/:id/return', requirePermission('RETURN_CREATE'), AssignmentController.returnAssignment);
router.post('/:id/cancel', requirePermission('ASSIGNMENT_CREATE'), AssignmentController.cancelAssignment);

export default router;
