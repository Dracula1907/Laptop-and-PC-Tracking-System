import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { UserSession } from '../types';

// Configurable API base URL — live HTTPS tunnel default
export const DEFAULT_API_URL = 'https://868d0b49512ae3.lhr.life/api';
export const LAN_API_URL = 'http://192.168.100.88:5000/api';
export const API_URL_KEY = 'faith_itam_api_url';
export const TOKEN_KEY = 'faith_itam_token';
export const USER_KEY = 'faith_itam_user';

let currentBaseUrl: string = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
export let API_BASE_URL = currentBaseUrl;

const apiClient = axios.create({
  baseURL: currentBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

export function setApiBaseUrl(newUrl: string): void {
  let formatted = newUrl.trim();
  if (formatted.endsWith('/')) {
    formatted = formatted.slice(0, -1);
  }
  if (!formatted.endsWith('/api')) {
    formatted = `${formatted}/api`;
  }
  currentBaseUrl = formatted;
  API_BASE_URL = formatted;
  apiClient.defaults.baseURL = formatted;
}

export async function getStoredApiUrl(): Promise<string> {
  try {
    const stored =
      Platform.OS === 'web'
        ? localStorage.getItem(API_URL_KEY)
        : await SecureStore.getItemAsync(API_URL_KEY);
    if (stored && stored.trim()) {
      setApiBaseUrl(stored.trim());
      return currentBaseUrl;
    }
  } catch (e) {
    console.warn('Failed to get stored API URL', e);
  }
  return currentBaseUrl;
}

export async function saveStoredApiUrl(url: string): Promise<void> {
  setApiBaseUrl(url);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(API_URL_KEY, currentBaseUrl);
    } else {
      await SecureStore.setItemAsync(API_URL_KEY, currentBaseUrl);
    }
  } catch (e) {
    console.warn('Failed to save API URL to storage', e);
  }
}

export async function testConnection(customUrl?: string): Promise<{ success: boolean; latencyMs?: number; message: string }> {
  let target = (customUrl || currentBaseUrl).trim();
  if (target.endsWith('/')) target = target.slice(0, -1);
  if (!target.endsWith('/api')) target = `${target}/api`;
  const healthUrl = `${target}/health`;
  const start = Date.now();
  try {
    const res = await axios.get(healthUrl, { timeout: 8000 });
    const latency = Date.now() - start;
    if (res.status === 200) {
      return { success: true, latencyMs: latency, message: `Connected successfully (${latency}ms)` };
    }
    return { success: false, message: `Server responded with HTTP ${res.status}` };
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Connection timed out';
    return { success: false, message: msg };
  }
}

// In-memory active token for synchronous interceptor access & instant invalidation
let activeToken: string | null = null;

export function setActiveToken(token: string | null): void {
  activeToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

export function getActiveToken(): string | null {
  return activeToken;
}

export async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  setActiveToken(token);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (e) {
    console.error('Failed to store secure token', e);
  }
}

export async function getStoredUser(): Promise<UserSession | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? localStorage.getItem(USER_KEY)
        : await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: UserSession): Promise<void> {
  try {
    const data = JSON.stringify(user);
    if (Platform.OS === 'web') {
      localStorage.setItem(USER_KEY, data);
    } else {
      await SecureStore.setItemAsync(USER_KEY, data);
    }
  } catch (e) {
    console.error('Failed to store user profile', e);
  }
}

export async function clearStoredSession(): Promise<void> {
  setActiveToken(null);
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch (e) {
    console.error('Failed to clear stored session', e);
  }
}

// Attach JWT Bearer token to all outgoing requests
apiClient.interceptors.request.use(async (config) => {
  const token = activeToken || (await getStoredToken());
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

// Global response error interceptor (handles 401 Unauthorized only)
let onUnauthorizedCallback: (() => void) | null = null;
export function setOnUnauthorizedCallback(cb: () => void) {
  onUnauthorizedCallback = cb;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await clearStoredSession();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
