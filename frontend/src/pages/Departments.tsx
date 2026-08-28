import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Department } from '../types';
import { exportModuleToExcel } from '../utils/exporters';
import { Plus, Edit, Building2, FileSpreadsheet } from 'lucide-react';

export const Departments: React.FC = () => {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/departments');
      if (res.success) setDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setForm({ name: '', code: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditId(dept.id);
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      showToast('Department name and code are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/departments/${editId}`, form);
        showToast('Department updated!', 'success');
      } else {
        await api.post('/departments', form);
        showToast('Department created!', 'success');
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Department>[] = [
    {
      key: 'code',
      header: 'Dept Code',
      render: (item) => <span className="font-mono font-bold text-brandPrimary">{item.code}</span>,
    },
    {
      key: 'name',
      header: 'Department Name',
      render: (item) => <span className="font-semibold text-textPrimary">{item.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (item) => <span className="text-xs text-textSecondary">{item.description || '—'}</span>,
    },
    {
      key: 'employeesCount',
      header: 'Linked Employees',
      render: (item) => <span className="font-semibold text-textPrimary">{item._count?.employees || 0} Staff</span>,
    },
    {
      key: 'assetsCount',
      header: 'Allocated Assets',
      render: (item) => <span className="font-bold text-brandPrimary">{item._count?.assets || 0} Assets</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        hasPermission('DEPARTMENT_MANAGE') && (
          <Button variant="ghost" size="sm" icon={<Edit className="w-4 h-4" />} onClick={() => openEditModal(item)} />
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Management"
        subtitle="Configure organizational business units and track asset distribution per department."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportModuleToExcel(departments, 'Departments');
                showToast('Excel export generated successfully.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel
            </Button>
            {hasPermission('DEPARTMENT_MANAGE') && (
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                Create Department
              </Button>
            )}
          </div>
        }
      />

      <DataTable columns={columns} data={departments} loading={loading} />

      {/* CREATE / EDIT MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Department' : 'Create Department'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Department Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Information Technology"
            required
          />
          <Input
            label="Department Code *"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="e.g. DEPT-IT"
            required
          />
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full bg-surface border border-borderDark text-sm text-textPrimary rounded-lg p-3"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={submitting}>{editId ? 'Save Updates' : 'Create Department'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
