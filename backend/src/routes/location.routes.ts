import { Router } from 'express';
import { LocationController } from '../controllers/location.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', LocationController.getLocations);
router.get('/:id', LocationController.getLocationById);
router.post('/', requirePermission('LOCATION_MANAGE'), LocationController.createLocation);
router.put('/:id', requirePermission('LOCATION_MANAGE'), LocationController.updateLocation);

export default router;
