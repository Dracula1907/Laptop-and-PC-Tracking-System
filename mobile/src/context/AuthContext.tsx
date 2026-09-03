import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession } from '../types';
import { authApi } from '../api/auth';
import {
  getStoredToken,
  setStoredToken,
  clearStoredSession,
  setOnUnauthorizedCallback,
} from '../api/client';

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; roleCode?: string; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = async () => {
    try {
      await clearStoredSession();
    } catch {
      // Ignored
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      logout();
    });

    const restore = async () => {
      try {
        setIsLoading(true);
        const storedToken = await getStoredToken();
        if (storedToken) {
          setToken(storedToken);
          const currentUser = await authApi.getMe();
          setUser(currentUser);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        await clearStoredSession();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const res = await authApi.login(username, password);
      await setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return { success: true, roleCode: res.user.roleCode };
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to connect to company server. Please verify Wi-Fi / LAN connection.';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
