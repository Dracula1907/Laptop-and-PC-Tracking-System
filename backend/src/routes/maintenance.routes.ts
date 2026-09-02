import { Router } from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/counts', MaintenanceController.getCounts);
router.get('/options', MaintenanceController.getOptions);
router.get('/', MaintenanceController.getMaintenanceRecords);
router.get('/:id', MaintenanceController.getMaintenanceById);

router.post('/', requirePermission('MAINTENANCE_CREATE'), MaintenanceController.createMaintenance);
router.post('/:id/assign', requirePermission('MAINTENANCE_UPDATE'), MaintenanceController.assignTechnician);
router.post('/:id/diagnose', requirePermission('MAINTENANCE_UPDATE'), MaintenanceController.updateDiagnosis);
router.post('/:id/repair', requirePermission('MAINTENANCE_UPDATE'), MaintenanceController.updateRepair);
router.post('/:id/complete', requirePermission('MAINTENANCE_UPDATE'), MaintenanceController.completeMaintenance);
router.post('/:id/cancel', requirePermission('MAINTENANCE_UPDATE'), MaintenanceController.cancelMaintenance);

router.put('/:id', requirePermission('MAINTENANCE_UPDATE'), MaintenanceController.updateMaintenance);
router.delete('/:id', requirePermission('MAINTENANCE_DELETE'), MaintenanceController.deleteMaintenance);

export default router;
