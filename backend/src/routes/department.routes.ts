import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', DepartmentController.getDepartments);
router.get('/:id', DepartmentController.getDepartmentById);
router.post('/', requirePermission('DEPARTMENT_MANAGE'), DepartmentController.createDepartment);
router.put('/:id', requirePermission('DEPARTMENT_MANAGE'), DepartmentController.updateDepartment);

export default router;
