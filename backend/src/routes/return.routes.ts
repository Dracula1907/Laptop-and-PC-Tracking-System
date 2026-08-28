import { Router } from 'express';
import { ReturnController } from '../controllers/return.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', requirePermission('ASSET_VIEW'), ReturnController.getReturns);
router.get('/options', requirePermission('RETURN_CREATE'), ReturnController.getOptions);
router.post('/', requirePermission('RETURN_CREATE'), ReturnController.createReturn);
router.put('/:id', requirePermission('RETURN_UPDATE'), ReturnController.updateReturn);
router.delete('/:id', requirePermission('RETURN_DELETE'), ReturnController.deleteReturn);

export default router;
