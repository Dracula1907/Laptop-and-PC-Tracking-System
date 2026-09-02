import { Router } from 'express';
import { ReturnController } from '../controllers/return.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/counts', requirePermission('ASSET_VIEW'), ReturnController.getCounts);
router.get('/options', requirePermission('RETURN_CREATE'), ReturnController.getOptions);
router.get('/', requirePermission('ASSET_VIEW'), ReturnController.getReturns);
router.get('/:id', requirePermission('ASSET_VIEW'), ReturnController.getReturnById);
router.post('/', requirePermission('RETURN_CREATE'), ReturnController.createReturn);
router.put('/:id', requirePermission('RETURN_UPDATE'), ReturnController.updateReturn);
router.post('/:id/receive', requirePermission('RETURN_CREATE'), ReturnController.receiveReturn);
router.post('/:id/inspect', requirePermission('RETURN_CREATE'), ReturnController.inspectReturn);
router.post('/:id/complete', requirePermission('RETURN_CREATE'), ReturnController.completeReturn);
router.post('/:id/cancel', requirePermission('RETURN_CREATE'), ReturnController.cancelReturn);

export default router;
