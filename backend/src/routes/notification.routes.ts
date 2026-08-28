import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', NotificationController.getNotifications);
router.post('/:id/read', NotificationController.markAsRead);
router.post('/read-all', NotificationController.markAllAsRead);

export default router;
