import { Router } from 'express';
import { ClearanceController } from '../controllers/clearance.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/', requirePermission('EMPLOYEE_UPDATE'), ClearanceController.initiateClearance);
router.get('/', requirePermission('EMPLOYEE_VIEW'), ClearanceController.getClearances);
router.get('/:id', requirePermission('EMPLOYEE_VIEW'), ClearanceController.getClearanceById);
router.put('/:id/items/:itemId', requirePermission('EMPLOYEE_UPDATE'), ClearanceController.resolveClearanceItem);
router.post('/:id/complete', requirePermission('EMPLOYEE_UPDATE'), ClearanceController.completeClearance);

export default router;
