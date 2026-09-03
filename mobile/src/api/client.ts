import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { UserSession } from '../types';

// Configurable API base URL, defaulting to local network IP
const DEFAULT_API_URL = 'http://192.168.1.7:5000/api';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Secure token storage helpers with web/platform fallback
export const TOKEN_KEY = 'faith_itam_token';
export const USER_KEY = 'faith_itam_user';

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
