import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/counts', DepartmentController.getDepartmentCounts);
router.get('/', DepartmentController.getDepartments);
router.get('/:id', DepartmentController.getDepartmentById);
router.post('/', requirePermission('DEPARTMENT_MANAGE'), DepartmentController.createDepartment);
router.put('/:id', requirePermission('DEPARTMENT_MANAGE'), DepartmentController.updateDepartment);
router.post('/:id/deactivate', requirePermission('DEPARTMENT_MANAGE'), DepartmentController.deactivateDepartment);
router.delete('/:id', requirePermission('DEPARTMENT_MANAGE'), DepartmentController.deleteDepartment);

export default router;
