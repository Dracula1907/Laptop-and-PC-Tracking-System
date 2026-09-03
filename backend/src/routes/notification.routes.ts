import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.post('/read-all', NotificationController.markAllAsRead);
router.get('/preferences', NotificationController.getPreferences);
router.put('/preferences', NotificationController.updatePreference);

router.post('/:id/read', NotificationController.markAsRead);
router.post('/:id/unread', NotificationController.markAsUnread);

export default router;
