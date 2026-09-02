import { Router } from 'express';
import { WarrantyController } from '../controllers/warranty.controller';
import { WarrantyClaimController } from '../controllers/warranty-claim.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// Telemetry & options
router.get('/counts', WarrantyController.getCounts);
router.get('/providers', WarrantyController.getProviders);
router.get('/asset-options', WarrantyController.getAssetOptions);
router.get('/asset/:assetId', WarrantyController.getWarrantyByAssetId);

// Warranty Claims endpoints
router.get('/claims', WarrantyClaimController.getClaims);
router.get('/claims/:id', WarrantyClaimController.getClaimById);
router.post('/claims', requirePermission('MAINTENANCE_CREATE'), WarrantyClaimController.createClaim);
router.put('/claims/:id', requirePermission('MAINTENANCE_UPDATE'), WarrantyClaimController.updateClaim);

// Warranties CRUD & Actions
router.get('/', WarrantyController.getWarranties);
router.get('/:id', WarrantyController.getWarrantyById);
router.post('/', requirePermission('ASSET_CREATE'), WarrantyController.createWarranty);
router.put('/:id', requirePermission('ASSET_UPDATE'), WarrantyController.updateWarranty);
router.post('/:id/extend', requirePermission('ASSET_UPDATE'), WarrantyController.extendWarranty);
router.post('/:id/cancel', requirePermission('ASSET_DEACTIVATE'), WarrantyController.cancelWarranty);

export default router;
