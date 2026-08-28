import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', requirePermission('EMPLOYEE_VIEW'), EmployeeController.getEmployees);
router.get('/:id', requirePermission('EMPLOYEE_VIEW'), EmployeeController.getEmployeeById);
router.post('/', requirePermission('EMPLOYEE_CREATE'), EmployeeController.createEmployee);
router.put('/:id', requirePermission('EMPLOYEE_UPDATE'), EmployeeController.updateEmployee);

export default router;
