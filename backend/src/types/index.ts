import { Request } from 'express';

export interface UserPayload {
  userId: string;
  username: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  employeeId?: string | null;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}
