import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { UserDashboard } from '../pages/UserDashboard';
import { AssetList } from '../pages/AssetList';
import { AssetForm } from '../pages/AssetForm';
import { AssetDetail } from '../pages/AssetDetail';
import { Assignments } from '../pages/Assignments';
import { Transfers } from '../pages/Transfers';
import { Returns } from '../pages/Returns';
import { Maintenance } from '../pages/Maintenance';
import { ApprovalCenter } from '../pages/ApprovalCenter';
import { WarrantyManagement } from '../pages/WarrantyManagement';
import { Employees } from '../pages/Employees';
import { EmployeeDetail } from '../pages/EmployeeDetail';
import { Departments } from '../pages/Departments';
import { Locations } from '../pages/Locations';
import { Reports } from '../pages/Reports';
import { AuditLogs } from '../pages/AuditLogs';
import { Notifications } from '../pages/Notifications';
import { Users } from '../pages/Users';
import { Settings } from '../pages/Settings';
import { DataImport } from '../pages/DataImport';
import { DataVerification } from '../pages/DataVerification';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<MainLayout />}>
        {/* Protected Authenticated Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-assets" element={<UserDashboard />} />
          <Route path="/my-maintenance" element={<UserDashboard />} />

          <Route path="/assets" element={<AssetList />} />
          <Route path="/assets/new" element={<AssetForm />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/assets/:id/edit" element={<AssetForm />} />

          <Route path="/assignments" element={<Assignments />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/approvals" element={<ApprovalCenter />} />
          <Route path="/warranties" element={<WarrantyManagement />} />

          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/locations" element={<Locations />} />

          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />

          {/* Admin Only Routes */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/users" element={<Users />} />
            <Route path="/imports" element={<DataImport />} />
            <Route path="/imports/history" element={<DataImport />} />
            <Route path="/admin/import" element={<DataImport />} />
            <Route path="/admin/data-verification" element={<DataVerification />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
