import { Router } from 'express';
import multer from 'multer';
import { AssetController } from '../controllers/asset.controller';
import { ImportController } from '../controllers/import.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.use(authenticateJWT);

router.post('/import', requirePermission('ASSET_CREATE'), upload.single('file'), ImportController.directImport);
router.get('/departments', requirePermission('ASSET_VIEW'), AssetController.getDepartments);
router.get('/locations', requirePermission('ASSET_VIEW'), AssetController.getLocations);
router.get('/counts', requirePermission('ASSET_VIEW'), AssetController.getInventoryCounts);
router.get('/history/all', requirePermission('ASSET_VIEW'), AssetController.getGlobalHistory);
router.get('/', requirePermission('ASSET_VIEW'), AssetController.getAssets);
router.get('/:id', requirePermission('ASSET_VIEW'), AssetController.getAssetById);
router.get('/:id/history/summary', requirePermission('ASSET_VIEW'), AssetController.getAssetHistorySummary);
router.get('/:id/history', requirePermission('ASSET_VIEW'), AssetController.getAssetHistory);
router.post('/:id/history/:historyId/correction', requirePermission('ASSET_UPDATE'), AssetController.recordHistoryCorrection);
router.post('/', requirePermission('ASSET_CREATE'), AssetController.createAsset);
router.put('/:id', requirePermission('ASSET_UPDATE'), AssetController.updateAsset);
router.put('/:id/hardware', requirePermission('ASSET_UPDATE'), AssetController.updateHardware);
router.post('/:id/deactivate', requirePermission('ASSET_DEACTIVATE'), AssetController.deactivateAsset);
router.delete('/:id', requirePermission('ASSET_DELETE'), AssetController.deleteAsset);

router.post('/:id/assign', requirePermission('ASSIGNMENT_CREATE'), AssetController.assignAsset);
router.post('/:id/transfer', requirePermission('TRANSFER_CREATE'), AssetController.transferAsset);
router.post('/:id/return', requirePermission('RETURN_CREATE'), AssetController.returnAsset);
router.post('/:id/maintenance', requirePermission('MAINTENANCE_CREATE'), AssetController.createMaintenance);

export default router;
