import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/:type', requirePermission('REPORT_VIEW'), ReportController.getReportData);

export default router;
