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
  ExternalLink,
  CheckCheck,
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
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res: any = await api.get('/notifications?limit=20');
      const data = res?.data ?? res;
      if (data?.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
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
      await api.post('/notifications/read-all', {});
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleNotificationClick = async (n: Notification) => {
    try {
      if (!n.isRead) {
        await api.post(`/notifications/${n.id}/read`);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setShowNotifications(false);
      if (n.actionRoute) {
        navigate(n.actionRoute);
      }
    } catch {}
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'CRITICAL') return n.priority === 'CRITICAL' || n.priority === 'HIGH';
    if (activeTab === 'APPROVAL') return n.category === 'APPROVAL';
    if (activeTab === 'MAINTENANCE') return n.category === 'MAINTENANCE';
    if (activeTab === 'WARRANTY') return n.category === 'WARRANTY';
    return true;
  });

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
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold text-white bg-rose-600 rounded-full border border-[#0E121B] flex items-center justify-center shadow-md animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0E121B] border border-[#313C4A] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[480px]">
              <div className="p-3 border-b border-[#313C4A] flex items-center justify-between bg-[#191E27]">
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Operational Alerts
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-0.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center space-x-1 px-3 py-1.5 bg-[#141923] border-b border-[#232C38] overflow-x-auto text-[11px]">
                {['ALL', 'CRITICAL', 'APPROVAL', 'MAINTENANCE', 'WARRANTY'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2 py-0.5 rounded-md whitespace-nowrap font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="overflow-y-auto divide-y divide-[#1B2330] flex-1">
                {filteredNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No notifications in this view.
                  </div>
                ) : (
                  filteredNotifications.map((n) => {
                    const isCrit = n.priority === 'CRITICAL' || n.priority === 'HIGH';
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 text-xs transition-colors cursor-pointer hover:bg-[#191F2B] ${
                          n.isRead ? 'bg-transparent opacity-75' : 'bg-cyan-500/5'
                        } ${isCrit ? 'border-l-2 border-rose-500' : 'border-l-2 border-cyan-500'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              isCrit
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-cyan-500/20 text-cyan-400'
                            }`}
                          >
                            {n.category}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <h5 className="font-semibold text-white mb-0.5">{n.title}</h5>
                        <p className="text-slate-400 text-[11px] leading-relaxed">{n.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-[#313C4A] bg-[#141923] text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/notifications');
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center space-x-1"
                >
                  <span>Open Full Notifications Center</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Capsule */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 px-2 py-1 rounded-lg bg-[#080E1C] border border-[#192A45] hover:border-slate-600 transition-colors"
          >
            {/* Avatar with Online Beacon */}
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 border border-cyan-400/50 flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden">
                <span className="font-mono">
                  {user?.username ? user.username.slice(0, 2).toUpperCase() : 'AD'}
                </span>
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#080E1C] shadow-[0_0_4px_#10B981]" />
            </div>

            <div className="hidden sm:block text-left pr-1">
              <p className="text-xs font-bold text-white leading-none font-mono">
                {user?.username || 'admin'}
              </p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5 font-mono">
                {user?.role?.code || 'ADMIN'}
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
