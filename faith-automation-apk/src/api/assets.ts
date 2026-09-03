import apiClient from './client';
import { Asset } from '../types';

export const assetsApi = {
  getList: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    assetType?: string;
    allocationStatus?: string;
  }): Promise<{ rows: Asset[]; total: number; page: number; totalPages: number }> => {
    const res = await apiClient.get('/assets', { params: { limit: 20, ...params } });
    const payload = res.data?.data || res.data;
    return {
      rows: payload.rows || payload.assets || [],
      total: payload.total || 0,
      page: payload.page || 1,
      totalPages: payload.totalPages || 1,
    };
  },

  getCounts: async (): Promise<{ total: number; active: number; repair: number; inUse: number }> => {
    const res = await apiClient.get('/assets/counts');
    return res.data?.data || res.data || { total: 0, active: 0, repair: 0, inUse: 0 };
  },
};
