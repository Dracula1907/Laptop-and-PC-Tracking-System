import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { Notification, NotificationCategory, NotificationPriority, NotificationPreference } from '../types';
import {
  Bell,
  CheckCheck,
  Search,
  Filter,
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  Clock,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';

export const Notifications: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  // Preferences Modal
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState<boolean>(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '25');
      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (readFilter !== 'all') params.append('isRead', readFilter);

      const res: any = await api.get(`/notifications?${params.toString()}`);
      const data = res?.data ?? res;
      if (data?.notifications) {
        setNotifications(data.notifications);
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, categoryFilter, priorityFilter, readFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchNotifications();
  };

  const handleMarkRead = async (id: string, currentlyRead: boolean) => {
    try {
      if (currentlyRead) {
        await api.post(`/notifications/${id}/unread`);
      } else {
        await api.post(`/notifications/${id}/read`);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: !currentlyRead } : n))
      );
      setUnreadCount((c) => (currentlyRead ? c + 1 : Math.max(0, c - 1)));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all', {});
      showToast('All notifications marked as read', 'success');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const openPreferencesModal = async () => {
    setShowPreferences(true);
    setLoadingPrefs(true);
    try {
      const res: any = await api.get('/notifications/preferences');
      const data = res?.data ?? res;
      if (Array.isArray(data)) {
        setPreferences(data);
      }
    } catch {
    } finally {
      setLoadingPrefs(false);
    }
  };

  const updatePreferenceToggle = async (cat: NotificationCategory, inApp: boolean) => {
    try {
      await api.put('/notifications/preferences', {
        category: cat,
        inAppEnabled: inApp,
      });
      setPreferences((prev) =>
        prev.map((p) => (p.category === cat ? { ...p, inAppEnabled: inApp } : p))
      );
      showToast(`Notification setting updated for ${cat}`, 'info');
    } catch {
      showToast('Failed to update preference', 'error');
    }
  };

  const criticalCount = notifications.filter(
    (n) => n.priority === 'CRITICAL' || n.priority === 'HIGH'
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Notifications & Alerts Center"
        subtitle="Live operational telemetry, warranty warnings, overdue notices, and system alerts."
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<SlidersHorizontal className="w-4 h-4" />}
              onClick={openPreferencesModal}
            >
              Alert Preferences
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCheck className="w-4 h-4" />}
                onClick={handleMarkAllRead}
              >
                Mark All Read
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center space-x-3 bg-[#10141D] border-[#222A38]">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Alerts</p>
            <h3 className="text-xl font-bold text-white font-mono">{total}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-3 bg-[#10141D] border-[#222A38]">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Unread Alerts</p>
            <h3 className="text-xl font-bold text-white font-mono">{unreadCount}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-3 bg-[#10141D] border-[#222A38]">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">High / Critical</p>
            <h3 className="text-xl font-bold text-white font-mono">{criticalCount}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-3 bg-[#10141D] border-[#222A38]">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Read Alerts</p>
            <h3 className="text-xl font-bold text-white font-mono">{Math.max(0, total - unreadCount)}</h3>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 bg-[#10141D] border-[#222A38]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title, asset, keyword..."
              className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#181F2C] border border-[#2B3547] rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Categories</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="TRANSFER">Transfer</option>
              <option value="RETURN">Return</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="WARRANTY">Warranty</option>
              <option value="APPROVAL">Approval</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="RETIREMENT">Retirement</option>
              <option value="BULK_OPERATION">Bulk Operations</option>
              <option value="DOCUMENT">Document</option>
              <option value="SYSTEM">System</option>
            </select>

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#181F2C] border border-[#2B3547] rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status */}
            <select
              value={readFilter}
              onChange={(e) => {
                setReadFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#181F2C] border border-[#2B3547] rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="false">Unread Only</option>
              <option value="true">Read Only</option>
            </select>

            {(search || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || readFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('ALL');
                  setPriorityFilter('ALL');
                  setReadFilter('all');
                  setPage(1);
                }}
                className="px-2 py-1.5 text-slate-400 hover:text-white flex items-center space-x-1"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading alerts telemetry...</div>
      ) : notifications.length === 0 ? (
        <Card className="py-16 text-center text-slate-400 bg-[#10141D] border-[#222A38]">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30 text-cyan-400" />
          <h4 className="text-sm font-semibold text-white">No notifications found</h4>
          <p className="text-xs text-slate-500 mt-1">
            All system processes and operational lifecycles are operating within normal parameters.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const isCrit = n.priority === 'CRITICAL' || n.priority === 'HIGH';
            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-all ${
                  n.isRead
                    ? 'bg-[#10141D]/60 border-[#1F2633] opacity-80'
                    : 'bg-[#121927] border-[#2A374F] shadow-sm'
                } ${isCrit ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-cyan-500'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isCrit
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {n.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1C2433] text-slate-300 border border-[#2A374F]">
                        {n.category}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                    </div>

                    <h4 className="font-semibold text-sm text-white mb-1">{n.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>

                    <div className="flex items-center space-x-3 mt-3 text-[11px] text-slate-500 font-mono">
                      <span>{new Date(n.createdAt).toLocaleString('en-GB')}</span>
                      {n.entityType && (
                        <span>• Ref: {n.entityType}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    {n.actionRoute && (
                      <button
                        onClick={() => navigate(n.actionRoute!)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1D2638] hover:bg-[#25324A] text-cyan-400 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-cyan-500/30"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkRead(n.id, n.isRead)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#181F2C] hover:bg-[#20293A] text-slate-300 text-xs font-medium transition-colors border border-[#2B3547]"
                    >
                      {n.isRead ? 'Mark unread' : 'Mark read'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <div>
                <h3 className="text-sm font-bold text-white">Alert Delivery Preferences</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Control which notification categories trigger in-app alerts.
                </p>
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#222B3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 divide-y divide-[#1D2536]">
              {loadingPrefs ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading settings...</div>
              ) : (
                preferences.map((p) => (
                  <div key={p.category} className="pt-3 first:pt-0 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-semibold text-white">{p.category}</h5>
                      <p className="text-[11px] text-slate-400">
                        Receive telemetry & lifecycle alerts for {p.category.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.inAppEnabled}
                        onChange={(e) => updatePreferenceToggle(p.category, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#1F2737] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-[#252F42] bg-[#151B27] flex justify-end">
              <Button size="sm" variant="primary" onClick={() => setShowPreferences(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
