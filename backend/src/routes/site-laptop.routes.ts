import { Router } from 'express';
import { SiteLaptopController } from '../controllers/site-laptop.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/stats', requirePermission('ASSET_VIEW'), SiteLaptopController.getStats);
router.get('/eligible-inventory', requirePermission('ASSET_VIEW'), SiteLaptopController.getEligibleInventory);
router.get('/history', requirePermission('ASSET_VIEW'), SiteLaptopController.getHistories);
router.get('/:id/history', requirePermission('ASSET_VIEW'), SiteLaptopController.getHistories);
router.get('/:id', requirePermission('ASSET_VIEW'), SiteLaptopController.getSiteLaptopById);
router.get('/', requirePermission('ASSET_VIEW'), SiteLaptopController.getSiteLaptops);

router.post('/', requirePermission('ASSET_UPDATE'), SiteLaptopController.createSiteLaptop);
router.put('/:id', requirePermission('ASSET_UPDATE'), SiteLaptopController.updateSiteLaptop);

export default router;
