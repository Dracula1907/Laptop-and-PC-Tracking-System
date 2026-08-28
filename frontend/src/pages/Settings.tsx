import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { Save, Settings as SettingsIcon } from 'lucide-react';

export const Settings: React.FC = () => {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<any>({
    ORG_NAME: 'Faith Automation & Engineering',
    WARRANTY_ALERT_DAYS: '60',
    OVERDUE_RETURN_DAYS: '3',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res: any = await api.get('/settings');
        if (res.success) {
          const map: any = {};
          res.data.forEach((s: any) => {
            map[s.key] = s.value;
          });
          setSettings((prev: any) => ({ ...prev, ...map }));
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = Object.keys(settings).map((key) => ({ key, value: settings[key] }));
      await api.post('/settings', { settings: payload });
      showToast('System settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-textSecondary">Loading System Settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="System Settings & Configuration"
        subtitle="Manage global organizational parameters, warranty alert thresholds, and return grace periods."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card title="Organization Parameters" subtitle="Enterprise branding and display name">
          <Input
            label="Organization Display Name"
            value={settings.ORG_NAME}
            onChange={(e) => setSettings({ ...settings, ORG_NAME: e.target.value })}
            placeholder="e.g. Faith Automation & Engineering"
          />
        </Card>

        <Card title="Alert Thresholds & Grace Periods" subtitle="Automatic notifications triggers for warranties and returns">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Warranty Expiry Alert Period (Days)"
              type="number"
              value={settings.WARRANTY_ALERT_DAYS}
              onChange={(e) => setSettings({ ...settings, WARRANTY_ALERT_DAYS: e.target.value })}
              placeholder="60"
            />
            <Input
              label="Overdue Return Grace Period (Days)"
              type="number"
              value={settings.OVERDUE_RETURN_DAYS}
              onChange={(e) => setSettings({ ...settings, OVERDUE_RETURN_DAYS: e.target.value })}
              placeholder="3"
            />
          </div>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" loading={saving} icon={<Save className="w-4 h-4" />}>
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
