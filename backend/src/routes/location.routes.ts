import { Router } from 'express';
import { LocationController } from '../controllers/location.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/counts', LocationController.getLocationCounts);
router.get('/', LocationController.getLocations);
router.get('/:id', LocationController.getLocationById);
router.post('/', requirePermission('LOCATION_MANAGE'), LocationController.createLocation);
router.put('/:id', requirePermission('LOCATION_MANAGE'), LocationController.updateLocation);
router.post('/:id/deactivate', requirePermission('LOCATION_MANAGE'), LocationController.deactivateLocation);
router.delete('/:id', requirePermission('LOCATION_MANAGE'), LocationController.deleteLocation);

export default router;
