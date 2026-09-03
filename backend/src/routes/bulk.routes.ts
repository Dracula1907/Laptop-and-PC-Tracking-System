import { Router } from 'express';
import multer from 'multer';
import { BulkController } from '../controllers/bulk.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.use(authenticateJWT);

router.post('/assets/update', requirePermission('ASSET_UPDATE'), BulkController.bulkUpdateAssets);
router.post('/import/stage', requirePermission('ASSET_CREATE'), upload.single('file'), BulkController.stageImport);
router.post('/import/commit', requirePermission('ASSET_CREATE'), BulkController.commitImport);
router.post('/import/rollback', requirePermission('ASSET_DEACTIVATE'), BulkController.rollbackImport);
router.get('/import/history', requirePermission('ASSET_VIEW'), BulkController.getImportHistory);
router.get('/import/batches/:id', requirePermission('ASSET_VIEW'), BulkController.getImportBatch);

export default router;
