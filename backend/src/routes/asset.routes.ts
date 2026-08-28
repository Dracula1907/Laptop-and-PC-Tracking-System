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
router.get('/', requirePermission('ASSET_VIEW'), AssetController.getAssets);
router.get('/:id', requirePermission('ASSET_VIEW'), AssetController.getAssetById);
router.post('/', requirePermission('ASSET_CREATE'), AssetController.createAsset);
router.put('/:id', requirePermission('ASSET_UPDATE'), AssetController.updateAsset);
router.delete('/:id', requirePermission('ASSET_DELETE'), AssetController.deleteAsset);

router.post('/:id/assign', requirePermission('ASSIGNMENT_CREATE'), AssetController.assignAsset);
router.post('/:id/transfer', requirePermission('TRANSFER_CREATE'), AssetController.transferAsset);
router.post('/:id/return', requirePermission('RETURN_CREATE'), AssetController.returnAsset);
router.post('/:id/maintenance', requirePermission('MAINTENANCE_CREATE'), AssetController.createMaintenance);

export default router;
