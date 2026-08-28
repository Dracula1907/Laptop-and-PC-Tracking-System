import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Laptop,
  ArrowRightLeft,
  RotateCcw,
  Wrench,
  Users,
  Building2,
  MapPin,
  FileBarChart,
  ClipboardList,
  ShieldCheck,
  Settings,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Database,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { user } = useAuth();
  const roleCode = user?.role.code;
  const isUser = roleCode === 'USER';

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-[#0A0D14]/96 border-r border-[#1E2535] flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      {/* Brand Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-[#1E2535]">
        {!collapsed ? (
          <div className="flex items-center space-x-2.5 min-w-0 pr-1 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#121624] border border-[#2B3550] flex items-center justify-center p-1 shadow-sm shrink-0">
              <img
                src="/faith-logo-app.png"
                alt="Faith Automation"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-[11.5px] font-bold text-white tracking-tight leading-snug">
                Faith Automation IT Inventory
              </h2>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-8 h-8 rounded-lg bg-[#121624] border border-[#2B3550] flex items-center justify-center p-1 shadow-sm">
            <img
              src="/faith-logo-app.png"
              alt="Faith Automation"
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded text-slate-500 hover:text-white hover:bg-[#1A2035] transition-colors hidden sm:block shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Links Container */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 relative font-sans">
        {isUser ? (
          <div>
            {!collapsed && <p className="px-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-mono">MY PORTAL</p>}
            <nav className="space-y-0.5">
              <NavItem to="/my-assets" icon={<Laptop className="w-4 h-4" />} label="My Assets" collapsed={collapsed} />
              <NavItem to="/my-maintenance" icon={<Wrench className="w-4 h-4" />} label="My Maintenance" collapsed={collapsed} />
              <NavItem to="/notifications" icon={<ClipboardList className="w-4 h-4" />} label="Notifications" collapsed={collapsed} />
            </nav>
          </div>
        ) : (
          <>
            {/* LIFECYCLE MANAGEMENT */}
            <div>
              {!collapsed && (
                <p className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                  LIFECYCLE MANAGEMENT
                </p>
              )}
              <nav className="space-y-0.5">
                <NavItem to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" collapsed={collapsed} />
                <NavItem to="/assets" icon={<Laptop className="w-4 h-4" />} label="Assets Inventory" collapsed={collapsed} />
                <NavItem to="/assignments" icon={<UserCheck className="w-4 h-4" />} label="Assignments" collapsed={collapsed} />
                <NavItem to="/transfers" icon={<ArrowRightLeft className="w-4 h-4" />} label="Transfers" collapsed={collapsed} />
                <NavItem to="/returns" icon={<RotateCcw className="w-4 h-4" />} label="Returns" collapsed={collapsed} />
                <NavItem to="/maintenance" icon={<Wrench className="w-4 h-4" />} label="Maintenance" collapsed={collapsed} />
              </nav>
            </div>

            {/* ORGANIZATION */}
            <div>
              {!collapsed && (
                <p className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                  ORGANIZATION
                </p>
              )}
              <nav className="space-y-0.5">
                <NavItem to="/employees" icon={<Users className="w-4 h-4" />} label="Employees" collapsed={collapsed} />
                <NavItem to="/departments" icon={<Building2 className="w-4 h-4" />} label="Departments" collapsed={collapsed} />
                <NavItem to="/locations" icon={<MapPin className="w-4 h-4" />} label="Locations" collapsed={collapsed} />
              </nav>
            </div>

            {/* ANALYTICS */}
            <div>
              {!collapsed && (
                <p className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                  ANALYTICS
                </p>
              )}
              <nav className="space-y-0.5">
                <NavItem to="/reports" icon={<FileBarChart className="w-4 h-4" />} label="Reports" collapsed={collapsed} />
                <NavItem to="/audit-logs" icon={<ClipboardList className="w-4 h-4" />} label="Audit Logs" collapsed={collapsed} />
              </nav>
            </div>

            {/* ADMINISTRATION */}
            {(roleCode === 'ADMIN' || roleCode === 'MANAGER') && (
              <div>
                {!collapsed && (
                  <p className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                    ADMINISTRATION
                  </p>
                )}
                <nav className="space-y-0.5">
                  {roleCode === 'ADMIN' && (
                    <NavItem to="/admin/data-verification" icon={<Database className="w-4 h-4" />} label="Data Verification" collapsed={collapsed} />
                  )}
                  {roleCode === 'ADMIN' && (
                    <NavItem to="/imports" icon={<FileSpreadsheet className="w-4 h-4" />} label="Data Import" collapsed={collapsed} />
                  )}
                  {roleCode === 'ADMIN' && (
                    <NavItem to="/users" icon={<ShieldCheck className="w-4 h-4" />} label="Users & Roles" collapsed={collapsed} />
                  )}
                  <NavItem to="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" collapsed={collapsed} />
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, collapsed }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 relative ${
          isActive
            ? 'bg-gradient-to-r from-[#3B2C6E]/80 to-[#4B3586]/60 border border-[#6B4FB8]/70 text-white shadow-[0_0_12px_rgba(107,79,184,0.3)]'
            : 'text-slate-400 hover:bg-[#131929] hover:text-slate-200'
        }`
      }
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="ml-2.5 truncate font-sans">{label}</span>}
    </NavLink>
  );
};
