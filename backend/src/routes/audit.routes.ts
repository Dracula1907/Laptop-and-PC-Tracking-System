import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', requirePermission('AUDIT_VIEW'), AuditController.getLogs);

export default router;
