import { Router } from 'express';
import { QrController } from '../controllers/qr.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/generate', QrController.generateQr);
router.get('/asset/:assetId', QrController.getAssetQrs);
router.post('/replace', QrController.replaceQr);
router.post('/revoke', QrController.revokeQr);
router.post('/bulk-generate', QrController.bulkGenerate);
router.post('/resolve', QrController.resolveToken);

export default router;
