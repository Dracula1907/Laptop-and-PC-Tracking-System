import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { SearchInput } from '../components/SearchInput';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Employee } from '../types';
import { exportModuleToExcel } from '../utils/exporters';
import { Plus, Eye, Edit, UserCheck, FileSpreadsheet } from 'lucide-react';

export const Employees: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    designation: '',
    departmentId: '',
    locationId: '',
    status: 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res: any = await api.get(`/employees${q}`);
      if (res.success) setEmployees(res.data.employees);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const [dRes, lRes]: any = await Promise.all([api.get('/departments'), api.get('/locations')]);
        if (dRes.success) setDepartments(dRes.data);
        if (lRes.success) setLocations(lRes.data);
      } catch (err) {}
    };
    fetchOrg();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setForm({ fullName: '', email: '', phone: '', designation: '', departmentId: departments[0]?.id || '', locationId: locations[0]?.id || '', status: 'ACTIVE' });
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditId(emp.id);
    setForm({
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone || '',
      designation: emp.designation || '',
      departmentId: emp.departmentId,
      locationId: emp.locationId,
      status: emp.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.departmentId || !form.locationId) {
      showToast('Full name, email, department, and location are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/employees/${editId}`, form);
        showToast('Employee updated successfully!', 'success');
      } else {
        await api.post('/employees', form);
        showToast('Employee created successfully!', 'success');
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Employee>[] = [
    {
      key: 'employeeCode',
      header: 'Employee Code',
      render: (item) => <span className="font-mono font-bold text-brandPrimary">{item.employeeCode}</span>,
    },
    {
      key: 'fullName',
      header: 'Full Name & Designation',
      render: (item) => (
        <div>
          <p className="font-semibold text-textPrimary">{item.fullName}</p>
          <p className="text-[10px] text-textMuted">{item.designation || 'Staff'}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email / Phone',
      render: (item) => (
        <div className="text-xs">
          <p className="text-textPrimary">{item.email}</p>
          <p className="text-[10px] text-textMuted">{item.phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department / Location',
      render: (item) => (
        <div className="text-xs">
          <p className="text-textPrimary">{item.department?.name}</p>
          <p className="text-[10px] text-textMuted">{item.location?.name}</p>
        </div>
      ),
    },
    {
      key: 'heldAssets',
      header: 'Assigned Assets',
      render: (item) => (
        <span className="font-bold text-brandPrimary px-2 py-0.5 bg-brandPrimary/10 rounded-full border border-brandPrimary/30">
          {item.heldAssets?.length || 0} Assets
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} type="employee" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => navigate(`/employees/${item.id}`)} />
          {hasPermission('EMPLOYEE_UPDATE') && (
            <Button variant="ghost" size="sm" icon={<Edit className="w-4 h-4" />} onClick={() => openEditModal(item)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        subtitle="Manage corporate workforce, staff assignments, and linked IT assets."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportModuleToExcel(employees, 'Employees');
                showToast('Excel export generated successfully.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel
            </Button>
            {hasPermission('EMPLOYEE_CREATE') && (
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                Add New Employee
              </Button>
            )}
          </div>
        }
      />

      <div className="bg-surface border border-borderDark rounded-xl p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, employee code, email, designation..." />
      </div>

      <DataTable columns={columns} data={employees} loading={loading} onRowClick={(item) => navigate(`/employees/${item.id}`)} />

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Employee' : 'Add New Employee'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="e.g. Rajesh Sharma"
            required
          />
          <Input
            label="Email Address *"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. r.sharma@faithautomation.com"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 00000"
            />
            <Input
              label="Designation"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="Senior Engineer"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department *"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
            <Select
              label="Location *"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
            />
          </div>
          <Select
            label="Employee Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'ON_LEAVE', label: 'On Leave' },
              { value: 'EXITED', label: 'Exited' },
            ]}
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={submitting}>{editId ? 'Save Updates' : 'Create Employee'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
