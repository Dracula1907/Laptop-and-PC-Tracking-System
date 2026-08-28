import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', requirePermission('ASSET_VIEW'), AssignmentController.getAssignments);
router.post('/', requirePermission('ASSIGNMENT_CREATE'), AssignmentController.createAssignment);
router.get('/options', requirePermission('ASSIGNMENT_CREATE'), AssignmentController.getOptions);

export default router;
