import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

export async function clearStoredSession(): Promise<void> {
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
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error interceptor (handles 401 Unauthorized)
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
