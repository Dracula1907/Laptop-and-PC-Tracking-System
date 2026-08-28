import { Router } from 'express';
import multer from 'multer';
import { ImportController } from '../controllers/import.controller';
import { authenticateJWT, requireRoles } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Authenticated endpoints
router.use(authenticateJWT);

// Direct single-step upload
router.post('/upload', upload.single('file'), ImportController.directImport);

// Preview file before committing
router.post('/preview', upload.single('file'), ImportController.previewFile);

// Confirm import into PostgreSQL
router.post('/confirm', upload.single('file'), ImportController.confirmImport);

// List import batches
router.get('/batches', ImportController.getBatches);

// Export current inventory in company 16-column Excel format
router.get('/export-company-excel', ImportController.exportCompanyExcel);

// Verification metrics
router.get('/verification', ImportController.getVerificationData);

export default router;
