import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/counts', requirePermission('ASSET_VIEW'), TransferController.getCounts);
router.get('/options', requirePermission('TRANSFER_CREATE'), TransferController.getOptions);
router.get('/', requirePermission('ASSET_VIEW'), TransferController.getTransfers);
router.get('/:id', requirePermission('ASSET_VIEW'), TransferController.getTransferById);
router.post('/', requirePermission('TRANSFER_CREATE'), TransferController.createTransfer);
router.put('/:id', requirePermission('TRANSFER_CREATE'), TransferController.updateTransfer);
router.post('/:id/complete', requirePermission('TRANSFER_APPROVE'), TransferController.completeTransfer);
router.post('/:id/cancel', requirePermission('TRANSFER_CREATE'), TransferController.cancelTransfer);
router.post('/:id/reverse', requirePermission('TRANSFER_APPROVE'), TransferController.reverseTransfer);

export default router;
