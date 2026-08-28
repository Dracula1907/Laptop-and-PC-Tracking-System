import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', requirePermission('ASSET_VIEW'), TransferController.getTransfers);
router.get('/options', requirePermission('TRANSFER_CREATE'), TransferController.getOptions);
router.post('/', requirePermission('TRANSFER_CREATE'), TransferController.createTransfer);
router.put('/:id', requirePermission('TRANSFER_UPDATE'), TransferController.updateTransfer);
router.delete('/:id', requirePermission('TRANSFER_DELETE'), TransferController.deleteTransfer);

export default router;
