import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyToken } from '../utils/jwt';

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token is missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }
};

export const requirePermission = (permissionCode: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    if (req.user.roleCode === 'ADMIN') {
      return next();
    }

    if (!req.user.permissions || !req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You lack permission '${permissionCode}' to perform this action.`,
      });
    }

    next();
  };
};

export const requireRoles = (roleCodes: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    if (!roleCodes.includes(req.user.roleCode)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires role ${roleCodes.join(' or ')}.`,
      });
    }

    next();
  };
};
