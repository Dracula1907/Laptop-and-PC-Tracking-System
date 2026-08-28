import { Router } from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', MaintenanceController.getMaintenanceRecords);
router.get('/options', MaintenanceController.getOptions);
router.get('/:id', MaintenanceController.getMaintenanceById);
router.post('/', requirePermission('MAINTENANCE_CREATE'), MaintenanceController.createMaintenance);
router.put('/:id', requirePermission('MAINTENANCE_UPDATE'), MaintenanceController.updateMaintenance);
router.delete('/:id', requirePermission('MAINTENANCE_DELETE'), MaintenanceController.deleteMaintenance);

export default router;
