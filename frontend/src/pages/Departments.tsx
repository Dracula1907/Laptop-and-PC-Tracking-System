import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../components/SearchInput';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Department, Employee, Location, DepartmentCounts } from '../types';
import { exportDepartmentsToExcel } from '../utils/exporters';
import {
  Plus,
  Eye,
  Edit,
  Building2,
  FileSpreadsheet,
  Users,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  MapPin,
  PowerOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Departments: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [counts, setCounts] = useState<DepartmentCounts>({ total: 0, active: 0, inactive: 0 });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    managerId: '',
    locationId: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Deactivate Modal State
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false);
  const [deactivatingDept, setDeactivatingDept] = useState<Department | null>(null);
  const [deactivating, setDeactivating] = useState<boolean>(false);

  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/departments/counts');
      if (res.success) setCounts(res.data);
    } catch (err) {
      console.error('Failed to fetch department counts:', err);
    }
  };

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');

      const res: any = await api.get(`/departments?${params.toString()}`);
      if (res.success) {
        setDepartments(res.data.departments || res.data);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalRecords(res.data.pagination.total || 0);
        } else {
          setTotalRecords(res.data.length || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      showToast('Error loading departments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchCounts();
    const fetchOptions = async () => {
      try {
        const [eRes, lRes]: any = await Promise.all([
          api.get('/employees?limit=250&status=ACTIVE'),
          api.get('/locations?limit=100'),
        ]);
        if (eRes.success) setEmployees(eRes.data.employees || []);
        if (lRes.success) setLocations(lRes.data.locations || lRes.data);
      } catch (err) {
        console.error('Failed to fetch master options:', err);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openCreateModal = () => {
    setEditId(null);
    setForm({
      name: '',
      code: '',
      description: '',
      managerId: '',
      locationId: locations[0]?.id || '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditId(dept.id);
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      managerId: dept.managerId || '',
      locationId: dept.locationId || '',
      isActive: dept.isActive,
    });
    setShowModal(true);
  };

  const openDetailsModal = async (deptId: string) => {
    setDetailsLoading(true);
    setShowDetailsModal(true);
    try {
      const res: any = await api.get(`/departments/${deptId}`);
      if (res.success) setSelectedDept(res.data);
    } catch (err) {
      showToast('Failed to load department details.', 'error');
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openDeactivateModal = (dept: Department) => {
    setDeactivatingDept(dept);
    setShowDeactivateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      showToast('Department name and code are mandatory.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        managerId: form.managerId || null,
        locationId: form.locationId || null,
      };

      if (editId) {
        await api.put(`/departments/${editId}`, payload);
        showToast('Department updated successfully.', 'success');
      } else {
        await api.post('/departments', payload);
        showToast('Department created successfully.', 'success');
      }
      setShowModal(false);
      fetchDepartments();
      fetchCounts();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingDept) return;
    setDeactivating(true);
    try {
      await api.post(`/departments/${deactivatingDept.id}/deactivate`, {});
      showToast(`Department "${deactivatingDept.name}" deactivated.`, 'success');
      setShowDeactivateModal(false);
      setDeactivatingDept(null);
      fetchDepartments();
      fetchCounts();
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate department.', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Department / Area Master"
        subtitle="Manage corporate business units, departmental managers, and hardware allocation pools."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportDepartmentsToExcel(departments);
                showToast('Department Excel export generated.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel (XLSX)
            </Button>
            {hasPermission('DEPARTMENT_MANAGE') && (
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                Create Department
              </Button>
            )}
          </div>
        }
      />

      {/* Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-[#151D2A] border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 font-mono uppercase">Total Departments</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 font-mono">{counts.total}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Configured organizational units</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('ACTIVE');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'bg-[#151D2A] border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 font-mono uppercase">Active Units</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-300 mt-1.5 font-mono">{counts.active}</p>
          <span className="text-[11px] text-emerald-500/80 mt-0.5 block">Eligible for assignments & transfers</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('INACTIVE');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'INACTIVE'
              ? 'bg-[#151D2A] border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 font-mono uppercase">Inactive / Archived</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-300 mt-1.5 font-mono">{counts.inactive}</p>
          <span className="text-[11px] text-rose-500/80 mt-0.5 block">Restricted from new allocations</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="w-72">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search code, name, manager, description..."
            />
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Only' },
                { value: 'INACTIVE', label: 'Inactive Only' },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Rows:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="bg-[#121624] border border-[#2B3550] rounded px-2 py-1 text-slate-200 text-xs outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="font-mono">
            Total: <strong className="text-white">{totalRecords}</strong>
          </span>
        </div>
      </div>

      {/* 9-Column Table */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-w-[1200px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1E2535] bg-[#0A0D15]/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-3.5">Dept Code</th>
                <th className="py-3 px-3.5">Department / Area Name</th>
                <th className="py-3 px-3.5">Description</th>
                <th className="py-3 px-3.5">Manager / In-Charge</th>
                <th className="py-3 px-3.5">Default Location</th>
                <th className="py-3 px-3.5 text-center">Staff Count</th>
                <th className="py-3 px-3.5 text-center">Allocated Assets</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2535]/50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-500 font-medium">
                    Loading Department Master...
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-500 font-medium">
                    No matching departments found.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => {
                  const empCount = dept._count?.employees || 0;
                  const assetCount = dept._count?.assets || 0;
                  return (
                    <tr
                      key={dept.id}
                      onClick={() => openDetailsModal(dept.id)}
                      className="hover:bg-[#141A28] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-indigo-400">{dept.code}</td>
                      <td className="py-3 px-3.5 font-semibold text-slate-200 group-hover:text-white">
                        {dept.name}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 max-w-xs truncate">{dept.description || '—'}</td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {dept.manager ? `${dept.manager.fullName} (${dept.manager.employeeCode})` : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">{dept.location?.name || '—'}</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] bg-slate-800/40 text-slate-300 border border-slate-700/50">
                          <Users className="w-3 h-3 text-indigo-400" />
                          {empCount} Staff
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          <Laptop className="w-3 h-3 text-indigo-400" />
                          {assetCount} Assets
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {dept.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Department Assets & Personnel"
                            onClick={() => openDetailsModal(dept.id)}
                            className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-indigo-300 hover:border-indigo-500 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {hasPermission('DEPARTMENT_MANAGE') && (
                            <>
                              <button
                                title="Edit Department Parameters"
                                onClick={() => openEditModal(dept)}
                                className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-amber-300 hover:border-amber-500 transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {dept.isActive && (
                                <button
                                  title="Deactivate Department"
                                  onClick={() => openDeactivateModal(dept)}
                                  className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-rose-400 hover:border-rose-500 transition-colors"
                                >
                                  <PowerOff className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E2535] bg-[#0A0D15]/60 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{departments.length ? (page - 1) * limit + 1 : 0}</strong> to{' '}
            <strong className="text-white">{Math.min(page * limit, totalRecords)}</strong> of{' '}
            <strong className="text-white">{totalRecords}</strong> departments
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="font-mono text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT DEPARTMENT MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Department / Area Master' : 'Create Department / Area'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department Code *"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. DEPT-IT"
              required
            />
            <Input
              label="Department / Area Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Information Technology"
              required
            />
          </div>

          <div>
            <Select
              label="Responsible Manager / Head"
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
              options={[
                { value: '', label: 'None Assigned' },
                ...employees.map((e) => ({
                  value: e.id,
                  label: `${e.fullName} (${e.employeeCode}) — ${e.designation || 'Staff'}`,
                })),
              ]}
            />
          </div>

          <div>
            <Select
              label="Default Facility Location"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              options={[
                { value: '', label: 'None Assigned' },
                ...locations.map((l) => ({ value: l.id, label: `${l.name} (${l.code})` })),
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Operational Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Scope, operational functions, cost center references..."
              className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-[#2B3550] text-indigo-600 focus:ring-0 w-4 h-4 bg-[#121624]"
              />
              <span>Department is Active (Available for new asset assignments & transfers)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2535]">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editId ? 'Save Master Updates' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DEPARTMENT DETAILS MODAL (Section 15) */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={selectedDept ? `${selectedDept.name} (${selectedDept.code})` : 'Department Details'}
        maxWidth="xl"
      >
        {detailsLoading || !selectedDept ? (
          <div className="py-16 text-center text-slate-400 text-xs font-mono">Loading Department Profile...</div>
        ) : (
          <div className="space-y-4">
            {/* Top metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Staff</span>
                <p className="text-xl font-bold font-mono text-white mt-0.5">{selectedDept.metrics?.employeeCount || 0}</p>
                <span className="text-[10px] text-emerald-400">
                  {selectedDept.metrics?.activeEmployeeCount || 0} active
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Assets</span>
                <p className="text-xl font-bold font-mono text-indigo-400 mt-0.5">
                  {selectedDept.metrics?.totalAssetCount || 0}
                </p>
                <span className="text-[10px] text-slate-500">In department</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Allocated</span>
                <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {selectedDept.metrics?.allocatedAssetCount || 0}
                </p>
                <span className="text-[10px] text-slate-500">Assigned to staff</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">In Repair</span>
                <p className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                  {selectedDept.metrics?.maintenanceAssetCount || 0}
                </p>
                <span className="text-[10px] text-slate-500">Under maintenance</span>
              </div>
            </div>

            {/* Department info */}
            <div className="p-3.5 rounded-lg bg-[#121624] border border-[#1E2535] text-xs grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 block">Manager / Head</span>
                <span className="text-white font-medium">
                  {selectedDept.manager ? `${selectedDept.manager.fullName} (${selectedDept.manager.employeeCode})` : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Default Facility</span>
                <span className="text-white font-medium">{selectedDept.location?.name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <span className={selectedDept.isActive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {selectedDept.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Assets Table */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase font-mono mb-2 flex items-center justify-between">
                <span>Allocated Hardware Devices ({selectedDept.assets?.length || 0})</span>
              </h5>
              <div className="max-h-48 overflow-y-auto border border-[#232C3E] rounded-lg bg-[#0E131F]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#0A0D15] text-slate-400 font-mono sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Asset ID</th>
                      <th className="py-2 px-3">Model</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Current Custodian</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2535]">
                    {!selectedDept.assets || selectedDept.assets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No hardware assets currently assigned to this department.
                        </td>
                      </tr>
                    ) : (
                      selectedDept.assets.map((a: any) => (
                        <tr
                          key={a.id}
                          onClick={() => navigate(`/assets/${a.id}`)}
                          className="hover:bg-[#141A28] cursor-pointer"
                        >
                          <td className="py-2 px-3 font-mono font-bold text-indigo-400">
                            {a.companyAssetId || a.assetCode}
                          </td>
                          <td className="py-2 px-3 text-slate-200">{a.model || a.assetName}</td>
                          <td className="py-2 px-3 text-slate-400">{a.assetType}</td>
                          <td className="py-2 px-3 text-slate-300">
                            {a.currentHolder ? a.currentHolder.fullName : '— (IT Stock)'}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-[10px] text-slate-300">{a.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Employees Table */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase font-mono mb-2">
                Linked Personnel ({selectedDept.employees?.length || 0})
              </h5>
              <div className="max-h-40 overflow-y-auto border border-[#232C3E] rounded-lg bg-[#0E131F]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#0A0D15] text-slate-400 font-mono sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Employee ID</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Designation</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Assets Held</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2535]">
                    {!selectedDept.employees || selectedDept.employees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No personnel assigned to this department.
                        </td>
                      </tr>
                    ) : (
                      selectedDept.employees.map((e: any) => (
                        <tr
                          key={e.id}
                          onClick={() => navigate(`/employees/${e.id}`)}
                          className="hover:bg-[#141A28] cursor-pointer"
                        >
                          <td className="py-2 px-3 font-mono font-bold text-indigo-400">{e.employeeCode}</td>
                          <td className="py-2 px-3 text-slate-200 font-medium">{e.fullName}</td>
                          <td className="py-2 px-3 text-slate-400">{e.designation || 'Staff'}</td>
                          <td className="py-2 px-3 text-slate-300">{e.status}</td>
                          <td className="py-2 px-3 text-right font-mono text-indigo-300">
                            {e._count?.heldAssets || 0} Assets
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1E2535]">
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DEACTIVATE CONFIRMATION MODAL (Section 16) */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Deactivate Department"
        maxWidth="md"
      >
        {deactivatingDept && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-amber-300">Non-Destructive Deactivation Protection</h5>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Deactivating department <strong className="text-white">"{deactivatingDept.name}"</strong> will
                  prevent it from being chosen in new asset assignments, transfers, or employee onboardings.
                  Historical asset history records will remain untouched and continue to accurately display this
                  department.
                </p>
              </div>
            </div>

            <p className="text-slate-400">
              Are you sure you want to mark this department as <strong className="text-rose-400">INACTIVE</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2535]">
              <Button variant="outline" onClick={() => setShowDeactivateModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={deactivating} onClick={handleDeactivate}>
                Confirm Deactivation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
