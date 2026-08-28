import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  LogOut,
  Search,
  ChevronDown,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';
import api from '../services/api';
import { Notification } from '../types';

interface HeaderProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Header: React.FC<HeaderProps> = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      try {
        const res: any = await api.get('/notifications');
        const isSuccess = res?.success ?? res?.data?.success;
        const data = res?.data ?? res;
        if (isSuccess && data) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {}
    };

    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/assets?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  return (
    <header className="h-16 bg-[#0E121B] border-b border-[#232C38] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 transition-colors duration-200">
      {/* Left: Mobile collapse toggle & Global Search */}
      <div className="flex items-center space-x-3 flex-1 max-w-xl">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-[#7B8490] hover:text-white hover:bg-[#191E27] transition-colors sm:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-[#58707A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Global search asset code, serial, employee..."
            className="w-full bg-[#191E27] border border-[#313C4A] hover:border-[#4D525E] focus:border-[#22C7D6] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#CED1D5] placeholder-[#58707A] focus:outline-none transition-all shadow-inner font-sans"
          />
        </form>
      </div>

      {/* Right: Theme Toggle, Notifications, User Avatar */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 rounded-lg bg-[#191E27] border border-[#313C4A] hover:border-[#4D525E] flex items-center justify-center text-[#7B8490] hover:text-white transition-colors relative focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-colors" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500 hover:text-indigo-600 transition-colors" />
          )}
        </button>

        {/* Notifications Icon Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-lg bg-[#191E27] border border-[#313C4A] hover:border-[#4D525E] flex items-center justify-center text-[#7B8490] hover:text-white transition-colors relative focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C53A43] shadow-[0_0_6px_#C53A43]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0E121B] border border-[#313C4A] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-[#313C4A] flex items-center justify-between bg-[#191E27]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Telemetry Alerts</h4>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-cyan-400 hover:underline font-medium">
                    Mark read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#14223A]">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">All systems operating within baseline parameters.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition-colors ${
                        n.isRead ? 'bg-transparent opacity-75' : 'bg-cyan-500/5 border-l-2 border-cyan-400'
                      }`}
                    >
                      <h5 className="font-semibold text-white mb-0.5">{n.title}</h5>
                      <p className="text-slate-400 text-[11px]">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Capsule (Matches Reference Image) */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 px-2 py-1 rounded-lg bg-[#080E1C] border border-[#192A45] hover:border-slate-600 transition-colors"
          >
            {/* Avatar with Online Beacon */}
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 border border-cyan-400/50 flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden">
                <span className="font-mono">AD</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#080E1C] shadow-[0_0_4px_#10B981]" />
            </div>

            <div className="hidden sm:block text-left pr-1">
              <p className="text-xs font-bold text-white leading-none font-mono">admin</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5 font-mono">
                ADMIN
              </span>
            </div>

            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-[#080E1C] border border-[#1E3354] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
              <div className="px-3 py-2 border-b border-[#14223A]">
                <p className="text-xs font-bold text-white font-mono">{user?.username}</p>
                <p className="text-[10px] text-slate-400">{user?.employee?.email || 'admin@faithautomation.com'}</p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" /> Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
