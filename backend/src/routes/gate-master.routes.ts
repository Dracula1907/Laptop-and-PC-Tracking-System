import { Router } from 'express';
import { GateMasterController } from '../controllers/gate-master.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', GateMasterController.getGates);
router.post('/', requirePermission('SETTINGS_MANAGE'), GateMasterController.createGate);
router.patch('/:id', requirePermission('SETTINGS_MANAGE'), GateMasterController.updateGate);

export default router;
