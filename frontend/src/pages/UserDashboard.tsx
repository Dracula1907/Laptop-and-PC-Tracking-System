import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Asset, MaintenanceRecord } from '../types';
import { Laptop, Wrench, RotateCcw, AlertTriangle } from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Request Modal
  const [showMaintModal, setShowMaintModal] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [maintForm, setMaintForm] = useState({ issueTitle: '', issueDescription: '' });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      if (user?.employee?.id) {
        const res: any = await api.get(`/assets?employeeId=${user.employee.id}`);
        if (res.success) setAssets(res.data.assets);
      }
      const mRes: any = await api.get('/maintenance');
      if (mRes.success) setMaintenance(mRes.data);
    } catch (err) {
      console.error('Failed to load user assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const openMaintModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setMaintForm({ issueTitle: '', issueDescription: '' });
    setShowMaintModal(true);
  };

  const handleMaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setSubmitting(true);
    try {
      await api.post(`/assets/${selectedAsset.id}/maintenance`, maintForm);
      showToast('Maintenance request submitted to IT!', 'success');
      setShowMaintModal(false);
      fetchUserData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-textSecondary">Loading My Portal Data...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.employee?.fullName || user?.username}`}
        subtitle="View your assigned IT workstations, raise repair tickets, and submit return requests."
      />

      {/* My Assigned Hardware */}
      <Card title="My Assigned Hardware & Peripherals" subtitle="Equipments registered to your employee profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-textMuted text-xs">
              No hardware currently assigned to your account.
            </div>
          ) : (
            assets.map((a) => (
              <div key={a.id} className="p-4 rounded-xl bg-surfaceElevated border border-borderDark space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/30">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-mono font-bold text-xs text-brandPrimary">{a.assetCode}</span>
                      <h4 className="font-bold text-sm text-textPrimary">{a.manufacturer} {a.model}</h4>
                    </div>
                  </div>
                  <StatusBadge status={a.status} type="assetStatus" />
                </div>

                <div className="text-xs space-y-1 text-textSecondary pt-1 border-t border-borderDark/60">
                  <p>Type: <span className="font-medium text-textPrimary">{a.assetType}</span></p>
                  {a.serialNumber && <p>Serial Number: <span className="font-mono text-textPrimary">{a.serialNumber}</span></p>}
                  {a.specifications?.processor && <p>CPU: <span className="text-textPrimary">{a.specifications.processor}</span></p>}
                  {a.specifications?.ram && <p>RAM: <span className="text-textPrimary">{a.specifications.ram}</span></p>}
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <Button variant="danger" size="sm" icon={<Wrench className="w-3.5 h-3.5" />} onClick={() => openMaintModal(a)}>
                    Request Repair
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* My Maintenance Requests */}
      <Card title="My Maintenance & Service Tickets" subtitle="Status of submitted repair requests">
        <div className="space-y-3">
          {maintenance.length === 0 ? (
            <p className="text-xs text-textMuted py-4 text-center">No maintenance tickets reported.</p>
          ) : (
            maintenance.map((m) => (
              <div key={m.id} className="p-3 rounded-lg bg-surfaceElevated border border-borderDark text-xs flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-textPrimary">{m.issueTitle}</h5>
                  <p className="text-textSecondary text-[11px] mt-0.5">{m.issueDescription}</p>
                </div>
                <StatusBadge status={m.repairStatus} type="maintenance" />
              </div>
            ))
          )}
        </div>
      </Card>

      {/* MAINTENANCE REQUEST MODAL */}
      {selectedAsset && (
        <Modal isOpen={showMaintModal} onClose={() => setShowMaintModal(false)} title={`Request Repair: ${selectedAsset.assetCode}`}>
          <form onSubmit={handleMaintSubmit} className="space-y-4">
            <Input
              label="Issue Title *"
              value={maintForm.issueTitle}
              onChange={(e) => setMaintForm({ ...maintForm, issueTitle: e.target.value })}
              placeholder="e.g. Battery not charging / Screen flicker"
              required
            />
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Detailed Description *</label>
              <textarea
                value={maintForm.issueDescription}
                onChange={(e) => setMaintForm({ ...maintForm, issueDescription: e.target.value })}
                rows={3}
                required
                placeholder="Explain what happens and when the issue occurs..."
                className="w-full bg-surface border border-borderDark text-sm text-textPrimary rounded-lg p-3"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowMaintModal(false)}>Cancel</Button>
              <Button type="submit" variant="danger" loading={submitting}>Submit Request to IT</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
