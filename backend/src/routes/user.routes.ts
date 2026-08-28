import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', requirePermission('USER_CREATE'), UserController.getUsers);
router.get('/roles', requirePermission('USER_CREATE'), UserController.getRoles);
router.post('/', requirePermission('USER_CREATE'), UserController.createUser);
router.put('/:id', requirePermission('USER_UPDATE'), UserController.updateUser);

export default router;
