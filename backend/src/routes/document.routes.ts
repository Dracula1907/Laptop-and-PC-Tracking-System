import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/', requirePermission('ASSET_UPDATE'), DocumentController.generateDocument);
router.get('/', requirePermission('ASSET_VIEW'), DocumentController.getDocuments);
router.get('/:id', requirePermission('ASSET_VIEW'), DocumentController.getDocumentById);
router.post('/:id/void', requirePermission('ASSET_DEACTIVATE'), DocumentController.voidDocument);
router.delete('/:id', requirePermission('ASSET_DEACTIVATE'), DocumentController.deleteDocument);

export default router;
