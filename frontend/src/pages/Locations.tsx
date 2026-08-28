import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Location } from '../types';
import { exportModuleToExcel } from '../utils/exporters';
import { Plus, Edit, MapPin, FileSpreadsheet } from 'lucide-react';

export const Locations: React.FC = () => {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '' });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/locations');
      if (res.success) setLocations(res.data);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setForm({ name: '', code: '', address: '' });
    setShowModal(true);
  };

  const openEditModal = (loc: Location) => {
    setEditId(loc.id);
    setForm({ name: loc.name, code: loc.code, address: loc.address || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      showToast('Location name and code are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/locations/${editId}`, form);
        showToast('Location updated!', 'success');
      } else {
        await api.post('/locations', form);
        showToast('Location created!', 'success');
      }
      setShowModal(false);
      fetchLocations();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Location>[] = [
    {
      key: 'code',
      header: 'Location Code',
      render: (item) => <span className="font-mono font-bold text-brandPrimary">{item.code}</span>,
    },
    {
      key: 'name',
      header: 'Facility Name',
      render: (item) => <span className="font-semibold text-textPrimary">{item.name}</span>,
    },
    {
      key: 'address',
      header: 'Address',
      render: (item) => <span className="text-xs text-textSecondary">{item.address || '—'}</span>,
    },
    {
      key: 'employeesCount',
      header: 'Staff Count',
      render: (item) => <span className="font-semibold text-textPrimary">{item._count?.employees || 0} Staff</span>,
    },
    {
      key: 'assetsCount',
      header: 'Assets Stationed',
      render: (item) => <span className="font-bold text-brandPrimary">{item._count?.assets || 0} Assets</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        hasPermission('LOCATION_MANAGE') && (
          <Button variant="ghost" size="sm" icon={<Edit className="w-4 h-4" />} onClick={() => openEditModal(item)} />
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Office & Facility Locations"
        subtitle="Manage corporate campuses, office branches, and asset tracking per physical location."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportModuleToExcel(locations, 'Locations');
                showToast('Excel export generated successfully.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel
            </Button>
            {hasPermission('LOCATION_MANAGE') && (
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                Create Location
              </Button>
            )}
          </div>
        }
      />

      <DataTable columns={columns} data={locations} loading={loading} />

      {/* CREATE / EDIT MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Location' : 'Create Location'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Location / Facility Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Head Office Mumbai"
            required
          />
          <Input
            label="Location Code *"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="e.g. LOC-MUM"
            required
          />
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Full Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              placeholder="Facility address details..."
              className="w-full bg-surface border border-borderDark text-sm text-textPrimary rounded-lg p-3"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={submitting}>{editId ? 'Save Updates' : 'Create Location'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
