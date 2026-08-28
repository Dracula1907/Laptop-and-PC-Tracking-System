import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/summary', DashboardController.getSummaryStats);
router.get('/charts', DashboardController.getChartsData);
router.get('/activity', DashboardController.getRecentActivity);
router.get('/alerts', DashboardController.getDashboardAlerts);

export default router;
