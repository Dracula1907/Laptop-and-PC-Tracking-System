import { Router } from 'express';
import { SettingController } from '../controllers/setting.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', SettingController.getSettings);
router.post('/', requirePermission('SETTINGS_MANAGE'), SettingController.updateSettings);

export default router;
