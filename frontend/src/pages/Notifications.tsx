import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { Notification } from '../types';
import { Bell, CheckCheck, AlertTriangle, Info } from 'lucide-react';

export const Notifications: React.FC = () => {
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/notifications');
      if (res.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      showToast('All notifications marked as read', 'success');
      fetchNotifications();
    } catch (err) {}
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="System Notifications & Alerts"
        subtitle="Warranty warnings, overdue return notices, and assignment approvals."
        actions={
          <Button variant="outline" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={handleMarkAllRead}>
            Mark All Read
          </Button>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-textSecondary">Loading notifications...</div>
      ) : (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card>
              <div className="py-12 text-center text-textMuted">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications found.</p>
              </div>
            </Card>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-all ${
                  n.isRead ? 'bg-surface/50 border-borderDark opacity-80' : 'bg-brandPrimary/10 border-brandPrimary/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-surfaceElevated border border-borderDark text-brandPrimary">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-textPrimary">{n.title}</h4>
                      <p className="text-xs text-textSecondary mt-1">{n.message}</p>
                      <span className="text-[10px] text-textMuted mt-2 block font-mono">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {!n.isRead && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brandPrimary text-white">
                      New
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
