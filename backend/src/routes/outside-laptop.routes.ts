import { Router } from 'express';
import { OutsideLaptopController } from '../controllers/outside-laptop.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', OutsideLaptopController.getRecords);
router.get('/currently-outside', OutsideLaptopController.getCurrentlyOutside);
router.get('/stats', OutsideLaptopController.getStats);
router.get('/export', OutsideLaptopController.getExportData);
router.post('/', OutsideLaptopController.recordMovement);
router.put('/:id', OutsideLaptopController.updateRecord);
router.delete('/:id', OutsideLaptopController.deleteRecord);

export default router;
