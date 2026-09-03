import apiClient from './client';
import { UserSession } from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<{ token: string; user: UserSession }> => {
    const res = await apiClient.post('/auth/login', { username, password });
    const payload = res.data?.data || res.data;
    return {
      token: payload.token,
      user: {
        userId: payload.user?.id || payload.user?.userId || payload.userId,
        username: payload.user?.username || username,
        roleId: payload.user?.roleId || '',
        roleCode: payload.user?.role?.code || payload.user?.roleCode || payload.roleCode,
        roleName: payload.user?.role?.name || payload.user?.roleName || payload.roleName,
        employeeId: payload.user?.employeeId,
        permissions: payload.user?.permissions || payload.permissions || [],
      },
    };
  },

  getMe: async (): Promise<UserSession> => {
    const res = await apiClient.get('/auth/me');
    const u = res.data?.data || res.data;
    return {
      userId: u.id || u.userId,
      username: u.username,
      roleId: u.roleId || u.role?.id,
      roleCode: u.role?.code || u.roleCode,
      roleName: u.role?.name || u.roleName,
      employeeId: u.employeeId,
      permissions: u.permissions || [],
    };
  },
};
