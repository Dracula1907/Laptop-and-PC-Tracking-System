import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  permission?: string;
  roles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission, roles }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bgBase flex items-center justify-center text-textSecondary">
        <div className="inline-block w-8 h-8 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role.code)) {
    return <Navigate to={user.role.code === 'USER' ? '/my-assets' : '/dashboard'} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to={user.role.code === 'USER' ? '/my-assets' : '/dashboard'} replace />;
  }

  return <Outlet />;
};
