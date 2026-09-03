import { Router } from 'express';
import { SecurityGateController } from '../controllers/security-gate.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/kpis', SecurityGateController.getKPIs);
router.get('/last-movement', SecurityGateController.getLastMovement);
router.get('/current-outside', SecurityGateController.getCurrentOutside);
router.get('/history', SecurityGateController.getHistory);
router.post('/scan', SecurityGateController.scan);
router.post('/out', SecurityGateController.recordOut);
router.post('/in', SecurityGateController.recordIn);
router.get('/daily-register', SecurityGateController.getDailyRegister);


export default router;
