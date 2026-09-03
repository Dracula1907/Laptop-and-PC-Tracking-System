import apiClient from './client';

export const assetsApi = {
  getAssets: async (params?: { page?: number; limit?: number; search?: string; status?: string; assetType?: string }) => {
    const res = await apiClient.get('/assets', { params });
    return res.data?.data || res.data;
  },

  getAssetById: async (id: string) => {
    const res = await apiClient.get(`/assets/${id}`);
    return res.data?.data || res.data;
  },

  getCounts: async () => {
    const res = await apiClient.get('/assets/counts');
    return res.data?.data || res.data;
  },
};

export const qrApi = {
  getAssetQrs: async (assetId: string) => {
    const res = await apiClient.get(`/qr/asset/${assetId}`);
    return res.data?.data || res.data;
  },

  generateQr: async (assetId: string) => {
    const res = await apiClient.post('/qr/generate', { assetId });
    return res.data?.data || res.data;
  },
};
