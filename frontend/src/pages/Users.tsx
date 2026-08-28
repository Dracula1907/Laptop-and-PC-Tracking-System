import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { User } from '../types';
import { Plus, Edit, Shield, Lock } from 'lucide-react';

export const Users: React.FC = () => {
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    roleId: '',
    employeeId: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [uRes, rRes, eRes]: any = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
        api.get('/employees?limit=100'),
      ]);
      if (uRes.success) setUsers(uRes.data);
      if (rRes.success) setRoles(rRes.data);
      if (eRes.success) setEmployees(eRes.data.employees);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setForm({ username: '', password: '', roleId: roles[0]?.id || '', employeeId: '', isActive: true });
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditId(u.id);
    setForm({
      username: u.username,
      password: '',
      roleId: u.role.id,
      employeeId: u.employee?.id || '',
      isActive: u.hasOwnProperty('isActive') ? (u as any).isActive : true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/users/${editId}`, form);
        showToast('User account updated!', 'success');
      } else {
        if (!form.username || !form.password || !form.roleId) {
          showToast('Username, password, and role are required.', 'error');
          return;
        }
        await api.post('/users', form);
        showToast('User created successfully!', 'success');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'username',
      header: 'Username',
      render: (item) => <span className="font-semibold text-textPrimary">{item.username}</span>,
    },
    {
      key: 'role',
      header: 'Role Code',
      render: (item) => (
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/30">
          {item.role.name} ({item.role.code})
        </span>
      ),
    },
    {
      key: 'employee',
      header: 'Linked Employee',
      render: (item) => (
        item.employee ? (
          <div>
            <p className="font-medium text-textPrimary">{item.employee.fullName}</p>
            <p className="text-[10px] text-textMuted">{item.employee.email}</p>
          </div>
        ) : (
          <span className="text-textMuted italic">System User</span>
        )
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (item) => (
        <span className="text-xs text-textMuted">
          {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <Button variant="ghost" size="sm" icon={<Edit className="w-4 h-4" />} onClick={() => openEditModal(item)} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Role Administration"
        subtitle="Manage authentication credentials, system roles, and authorization scopes."
        actions={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
            Create New User
          </Button>
        }
      />

      <DataTable columns={columns} data={users} loading={loading} />

      {/* CREATE / EDIT USER MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit User Account' : 'Create User Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username *"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            disabled={Boolean(editId)}
            required
          />

          <Input
            label={editId ? 'New Password (Leave blank to keep unchanged)' : 'Password *'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editId}
          />

          <Select
            label="Role *"
            value={form.roleId}
            onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            options={roles.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))}
          />

          <Select
            label="Link Employee (Optional)"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            options={[
              { value: '', label: 'Unlinked System User' },
              ...employees.map((emp) => ({ value: emp.id, label: `${emp.fullName} (${emp.employeeCode})` })),
            ]}
          />

          {editId && (
            <label className="flex items-center space-x-2 text-xs text-textPrimary cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-borderDark bg-surface text-brandPrimary"
              />
              <span>Account Active</span>
            </label>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={submitting}>{editId ? 'Save Account' : 'Create User'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
