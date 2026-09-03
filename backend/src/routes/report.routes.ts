import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/summary', requirePermission('REPORT_VIEW'), ReportController.getSummaryKPIs);
router.get('/assets', requirePermission('REPORT_VIEW'), ReportController.getAssetAnalytics);
router.get('/utilization', requirePermission('REPORT_VIEW'), ReportController.getUtilization);
router.get('/employees', requirePermission('REPORT_VIEW'), ReportController.getEmployeeAccountability);
router.get('/returns', requirePermission('REPORT_VIEW'), ReportController.getReturnsReport);
router.get('/maintenance', requirePermission('REPORT_VIEW'), ReportController.getMaintenanceAnalytics);
router.get('/warranty', requirePermission('REPORT_VIEW'), ReportController.getWarrantyAnalytics);
router.get('/aging', requirePermission('REPORT_VIEW'), ReportController.getAssetAging);
router.get('/health-matrix', requirePermission('REPORT_VIEW'), ReportController.getAssetHealthMatrix);

// Saved Reports
router.get('/saved', requirePermission('REPORT_VIEW'), ReportController.getSavedReports);
router.post('/saved', requirePermission('REPORT_VIEW'), ReportController.createSavedReport);
router.delete('/saved/:id', requirePermission('REPORT_VIEW'), ReportController.deleteSavedReport);

// Dynamic/Legacy type endpoint
router.get('/:type', requirePermission('REPORT_VIEW'), ReportController.getReportData);

export default router;
