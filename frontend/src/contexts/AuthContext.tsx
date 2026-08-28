import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  hasPermission: (permissionCode: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('itam_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res: any = await api.get('/auth/me');
        if (res.success) {
          setUser(res.data);
        }
      } catch (err) {
        localStorage.removeItem('itam_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (username: string, password: string): Promise<User> => {
    const res: any = await api.post('/auth/login', { username, password });
    if (res.success) {
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('itam_token', newToken);
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('itam_token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.role.code === 'ADMIN') return true;
    return user.permissions.includes(permissionCode);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
