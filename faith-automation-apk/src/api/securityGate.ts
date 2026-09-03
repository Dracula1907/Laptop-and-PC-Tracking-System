import apiClient from './client';
import { GateKPIs, CurrentOutsideItem, GateMovementRecord, GateMaster, ScannedAssetData } from '../types';

export const securityGateApi = {
  getKPIs: async (): Promise<GateKPIs> => {
    const res = await apiClient.get('/security-gate/kpis');
    return res.data?.data || res.data;
  },

  scanToken: async (token: string): Promise<ScannedAssetData> => {
    const res = await apiClient.post('/security-gate/scan', { token });
    return res.data?.data || res.data;
  },

  getCurrentOutside: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ rows: CurrentOutsideItem[]; total: number }> => {
    const res = await apiClient.get('/security-gate/current-outside', { params });
    const payload = res.data?.data || res.data;
    return {
      rows: payload.rows || [],
      total: payload.total || (payload.rows ? payload.rows.length : 0),
    };
  },

  getMovements: async (params?: {
    page?: number;
    limit?: number;
    movementType?: 'OUT' | 'IN';
    search?: string;
  }): Promise<{ movements: GateMovementRecord[]; total: number }> => {
    const res = await apiClient.get('/security-gate/history', { params });
    const payload = res.data?.data || res.data;
    return {
      movements: payload.movements || [],
      total: payload.total || (payload.movements ? payload.movements.length : 0),
    };
  },

  getGates: async (): Promise<GateMaster[]> => {
    const res = await apiClient.get('/gates');
    return res.data?.data || res.data || [];
  },

  recordOut: async (data: {
    assetId: string;
    qrCodeId?: string;
    gateId?: string;
    destination: string;
    purpose: string;
    expectedReturn?: string | null;
    remarks?: string | null;
  }) => {
    const res = await apiClient.post('/security-gate/out', data);
    return res.data;
  },

  recordIn: async (data: {
    assetId: string;
    qrCodeId?: string;
    gateId?: string;
    remarks?: string | null;
  }) => {
    const res = await apiClient.post('/security-gate/in', data);
    return res.data;
  },
};
