import { Router } from 'express';
import { RetirementController } from '../controllers/retirement.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/candidates', requirePermission('ASSET_VIEW'), RetirementController.getCandidates);
router.post('/request', requirePermission('ASSET_UPDATE'), RetirementController.requestRetirement);
router.post('/:id/complete', requirePermission('ASSET_DEACTIVATE'), RetirementController.completeRetirement);
router.get('/compare', requirePermission('ASSET_VIEW'), RetirementController.compareReplacement);
router.get('/', requirePermission('ASSET_VIEW'), RetirementController.getRetirements);

export default router;
