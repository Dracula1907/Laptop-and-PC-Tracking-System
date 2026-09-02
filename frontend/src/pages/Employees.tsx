import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { SearchInput } from '../components/SearchInput';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Employee, Department, Location, EmployeeCounts } from '../types';
import { exportEmployeesToExcel } from '../utils/exporters';
import {
  Plus,
  Eye,
  Edit,
  UserX,
  FileSpreadsheet,
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FilterX,
  Laptop,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const Employees: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [counts, setCounts] = useState<EmployeeCounts>({
    total: 0,
    active: 0,
    onLeave: 0,
    inactive: 0,
    exited: 0,
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [allActiveEmployees, setAllActiveEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Pagination State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [designationFilter, setDesignationFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeCode: '',
    fullName: '',
    email: '',
    phone: '',
    designation: '',
    departmentId: '',
    locationId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'EXITED',
    managerId: '',
    joiningDate: '',
    exitDate: '',
    remarks: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Deactivate / Exit Clearance Modal State
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false);
  const [targetEmployee, setTargetEmployee] = useState<Employee | null>(null);
  const [deactivateForm, setDeactivateForm] = useState({
    status: 'EXITED' as 'EXITED' | 'INACTIVE',
    exitDate: new Date().toISOString().slice(0, 10),
    remarks: '',
  });
  const [deactivating, setDeactivating] = useState<boolean>(false);

  // Fetch Master Telemetry Counts
  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/employees/counts');
      if (res.success) setCounts(res.data);
    } catch (err) {
      console.error('Failed to fetch employee counts:', err);
    }
  };

  // Fetch Employees with Server-Side Search & Filters
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (departmentFilter !== 'ALL') params.append('departmentId', departmentFilter);
      if (locationFilter !== 'ALL') params.append('locationId', locationFilter);
      if (designationFilter.trim()) params.append('designation', designationFilter.trim());

      const res: any = await api.get(`/employees?${params.toString()}`);
      if (res.success) {
        setEmployees(res.data.employees);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalRecords(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      showToast('Error loading employee directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, departmentFilter, locationFilter, designationFilter]);

  // Initial Fetch of master departments, locations, and counts
  useEffect(() => {
    fetchCounts();
    const fetchDropdowns = async () => {
      try {
        const [dRes, lRes, eRes]: any = await Promise.all([
          api.get('/departments?limit=100'),
          api.get('/locations?limit=100'),
          api.get('/employees?limit=250&status=ACTIVE'),
        ]);
        if (dRes.success) setDepartments(dRes.data.departments || dRes.data);
        if (lRes.success) setLocations(lRes.data.locations || lRes.data);
        if (eRes.success) setAllActiveEmployees(eRes.data.employees || []);
      } catch (err) {
        console.error('Failed to fetch organization master options:', err);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
    setLocationFilter('ALL');
    setDesignationFilter('');
    setPage(1);
  };

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'ALL' ||
    departmentFilter !== 'ALL' ||
    locationFilter !== 'ALL' ||
    designationFilter !== '';

  const openCreateModal = () => {
    setEditId(null);
    setForm({
      employeeCode: '',
      fullName: '',
      email: '',
      phone: '',
      designation: '',
      departmentId: departments[0]?.id || '',
      locationId: locations[0]?.id || '',
      status: 'ACTIVE',
      managerId: '',
      joiningDate: new Date().toISOString().slice(0, 10),
      exitDate: '',
      remarks: '',
    });
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditId(emp.id);
    setForm({
      employeeCode: emp.employeeCode || '',
      fullName: emp.fullName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      designation: emp.designation || '',
      departmentId: emp.departmentId,
      locationId: emp.locationId,
      status: emp.status,
      managerId: emp.managerId || '',
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : '',
      exitDate: emp.exitDate ? new Date(emp.exitDate).toISOString().slice(0, 10) : '',
      remarks: emp.remarks || '',
    });
    setShowModal(true);
  };

  const openDeactivateModal = (emp: Employee) => {
    setTargetEmployee(emp);
    setDeactivateForm({
      status: emp.status === 'ACTIVE' ? 'EXITED' : emp.status === 'EXITED' ? 'INACTIVE' : 'EXITED',
      exitDate: new Date().toISOString().slice(0, 10),
      remarks: '',
    });
    setShowDeactivateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.departmentId || !form.locationId) {
      showToast('Full name, email, department, and location are mandatory.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        employeeCode: form.employeeCode.trim() || undefined,
        managerId: form.managerId || null,
        exitDate: form.status === 'EXITED' && form.exitDate ? form.exitDate : null,
      };

      if (editId) {
        await api.put(`/employees/${editId}`, payload);
        showToast('Employee updated successfully.', 'success');
      } else {
        await api.post('/employees', payload);
        showToast('Employee created successfully.', 'success');
      }
      setShowModal(false);
      fetchEmployees();
      fetchCounts();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!targetEmployee) return;
    setDeactivating(true);
    try {
      const res: any = await api.post(`/employees/${targetEmployee.id}/deactivate`, deactivateForm);
      if (res.success) {
        showToast(res.message || 'Employee status updated.', res.data?.clearanceRequired ? 'warning' : 'success');
        setShowDeactivateModal(false);
        setTargetEmployee(null);
        fetchEmployees();
        fetchCounts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update employee status.', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  const renderDataQualityBadge = (quality?: 'CLEAN' | 'WARNING' | 'INCOMPLETE') => {
    if (quality === 'CLEAN') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> Clean
        </span>
      );
    }
    if (quality === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" /> Warning
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <XCircle className="w-3 h-3" /> Incomplete
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Employee Master Directory"
        subtitle="Authoritative personnel database, organizational hierarchy, and hardware accountability registry."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportEmployeesToExcel(employees);
                showToast('Excel report generated successfully.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel (XLSX)
            </Button>
            {hasPermission('EMPLOYEE_CREATE') && (
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                Add New Employee
              </Button>
            )}
          </div>
        }
      />

      {/* Dynamic PostgreSQL Telemetry Summary Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-[#151D2A] border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 font-mono uppercase">Total Staff</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 font-mono">{counts.total}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Full workforce ledger</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('ACTIVE');
            setPage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'bg-[#151D2A] border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 font-mono uppercase">Active Staff</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-300 mt-1.5 font-mono">{counts.active}</p>
          <span className="text-[11px] text-emerald-500/80 mt-0.5 block">Eligible for asset assignment</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('ON_LEAVE');
            setPage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ON_LEAVE'
              ? 'bg-[#151D2A] border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 font-mono uppercase">On Leave</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1.5 font-mono">{counts.onLeave}</p>
          <span className="text-[11px] text-amber-500/80 mt-0.5 block">Temporarily away</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('EXITED');
            setPage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'EXITED' || statusFilter === 'INACTIVE'
              ? 'bg-[#151D2A] border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 font-mono uppercase">Exited / Inactive</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-300 mt-1.5 font-mono">{counts.inactive + counts.exited}</p>
          <span className="text-[11px] text-rose-500/80 mt-0.5 block">Assignment restricted</span>
        </div>
      </div>

      {/* Control & Multi-Filter Bar */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search by Employee ID, Name, Email, Phone, Designation, Dept, Location..."
            />
          </div>
          <div>
            <Select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              options={[{ value: 'ALL', label: 'All Departments / Areas' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
            />
          </div>
          <div>
            <Select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              options={[{ value: 'ALL', label: 'All Facility Locations' }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1E2535]/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Quick Status:</span>
            {['ALL', 'ACTIVE', 'ON_LEAVE', 'INACTIVE', 'EXITED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-brandPrimary text-white shadow-sm'
                    : 'bg-[#151D2A] text-slate-400 hover:text-white hover:bg-[#1C2536]'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 ml-2 font-medium"
              >
                <FilterX className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Rows:</span>
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
            <span className="text-slate-400 font-mono">
              Total: <strong className="text-white">{totalRecords}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 12-Column Table with Internal Horizontal Scroll */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-w-[1450px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1E2535] bg-[#0A0D15]/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-3.5">Employee ID</th>
                <th className="py-3 px-3.5">Full Name</th>
                <th className="py-3 px-3.5">Email Address</th>
                <th className="py-3 px-3.5">Phone</th>
                <th className="py-3 px-3.5">Designation</th>
                <th className="py-3 px-3.5">Department / Area</th>
                <th className="py-3 px-3.5">Location</th>
                <th className="py-3 px-3.5 text-center">Assigned Assets</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-center">Data Quality</th>
                <th className="py-3 px-3.5">Joining Date</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2535]/50">
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-slate-500 font-medium">
                    Loading Employee Registry...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-slate-500 font-medium">
                    No matching employee records found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const heldCount = emp._count?.heldAssets || emp.heldAssets?.length || 0;
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="hover:bg-[#141A28] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-indigo-400">
                        {emp.employeeCode}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-200 group-hover:text-white">
                        {emp.fullName}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">
                        {emp.email}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px]">
                        {emp.phone || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {emp.designation || 'Staff'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {emp.department?.name || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {emp.location?.name || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] border ${
                            heldCount > 0
                              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                              : 'bg-slate-800/40 text-slate-400 border-slate-700/50'
                          }`}
                        >
                          <Laptop className="w-3 h-3" />
                          {heldCount} Assets
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <StatusBadge status={emp.status} type="employee" />
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {renderDataQualityBadge(emp.dataQuality)}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 text-[11px] font-mono">
                        {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Employee Profile & Assets"
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-indigo-300 hover:border-indigo-500 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {hasPermission('EMPLOYEE_UPDATE') && (
                            <button
                              title="Edit Employee Master Data"
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-amber-300 hover:border-amber-500 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPermission('EMPLOYEE_DEACTIVATE') && (
                            <button
                              title="Deactivate / Exit Employee & Check Clearance"
                              onClick={() => openDeactivateModal(emp)}
                              className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-rose-400 hover:border-rose-500 transition-colors"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
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

        {/* Server-Side Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E2535] bg-[#0A0D15]/60 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{employees.length ? (page - 1) * limit + 1 : 0}</strong> to{' '}
            <strong className="text-white">{Math.min(page * limit, totalRecords)}</strong> of{' '}
            <strong className="text-white">{totalRecords}</strong> recorded employees
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

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Employee Master Record' : 'Register New Employee'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Employee ID (Auto-generated if left blank)"
              value={form.employeeCode}
              onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
              placeholder="e.g. EMP-025"
            />
            <Input
              label="Full Name *"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Corporate Email Address *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="r.sharma@faithautomation.com"
              required
            />
            <Input
              label="Phone Contact"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Designation / Title"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="Automation Systems Engineer"
            />
            <Select
              label="Reporting Manager"
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
              options={[
                { value: '', label: 'None (Direct Report / Head)' },
                ...allActiveEmployees
                  .filter((e) => e.id !== editId)
                  .map((e) => ({
                    value: e.id,
                    label: `${e.fullName} (${e.employeeCode}) — ${e.designation || 'Staff'}`,
                  })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Department / Area *"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              options={departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }))}
              required
            />
            <Select
              label="Assigned Facility Location *"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              options={locations.map((l) => ({ value: l.id, label: `${l.name} (${l.code})` }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Employment Status *"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              options={[
                { value: 'ACTIVE', label: 'Active (Eligible for Assets)' },
                { value: 'ON_LEAVE', label: 'On Leave' },
                { value: 'INACTIVE', label: 'Inactive (Restricted)' },
                { value: 'EXITED', label: 'Exited (Restricted)' },
              ]}
              required
            />
            <Input
              label="Joining Date"
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            />
            <Input
              label="Exit Date"
              type="date"
              value={form.exitDate}
              onChange={(e) => setForm({ ...form, exitDate: e.target.value })}
              disabled={form.status !== 'EXITED'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Internal Remarks</label>
            <textarea
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Notes, clearance records, or organizational adjustments..."
              className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2535]">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editId ? 'Save Master Updates' : 'Register Employee'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DEACTIVATE / EXIT CLEARANCE MODAL */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Employee Deactivation & Exit Clearance"
        maxWidth="lg"
      >
        {targetEmployee && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-3.5 rounded-lg bg-[#121624] border border-[#2B3550] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {targetEmployee.fullName} ({targetEmployee.employeeCode})
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {targetEmployee.designation || 'Staff'} — {targetEmployee.department?.name}
                </p>
              </div>
              <StatusBadge status={targetEmployee.status} type="employee" />
            </div>

            {/* Asset Clearance Warning Banner */}
            {targetEmployee.heldAssets && targetEmployee.heldAssets.length > 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                      EMPLOYEE EXIT — ASSET CLEARANCE REQUIRED
                    </h5>
                    <p className="text-xs text-slate-300 mt-1">
                      This employee is currently holding{' '}
                      <strong className="text-amber-200">{targetEmployee.heldAssets.length} company IT assets</strong>.
                      Deactivating this employee will mark them as ineligible for new assets, but will NOT automatically
                      wipe custody. Please ensure these devices are formally returned or transferred:
                    </p>
                  </div>
                </div>

                {/* Table of held hardware */}
                <div className="max-h-40 overflow-y-auto border border-[#2B3550] rounded-lg bg-[#0E131F]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#0A0D15] text-slate-400 font-mono">
                      <tr>
                        <th className="py-2 px-3">Asset ID</th>
                        <th className="py-2 px-3">Device / Model</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2535]">
                      {targetEmployee.heldAssets.map((a: any) => (
                        <tr key={a.id} className="hover:bg-[#141A28]">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-400">
                            {a.companyAssetId || a.assetCode}
                          </td>
                          <td className="py-2 px-3 text-slate-200">{a.model || a.assetName}</td>
                          <td className="py-2 px-3 text-slate-400">{a.assetType}</td>
                          <td className="py-2 px-3">
                            <StatusBadge status={a.status} type="assetStatus" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300">
                  Zero active hardware currently held by this employee. Clean clearance status.
                </p>
              </div>
            )}

            {/* Deactivation parameters */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Target Lifecycle Status *"
                  value={deactivateForm.status}
                  onChange={(e) =>
                    setDeactivateForm({ ...deactivateForm, status: e.target.value as 'EXITED' | 'INACTIVE' })
                  }
                  options={[
                    { value: 'EXITED', label: 'Exited (Permanent Employee Departure)' },
                    { value: 'INACTIVE', label: 'Inactive (Suspended / On Extended Leave)' },
                  ]}
                />
                <Input
                  label="Exit / Deactivation Date *"
                  type="date"
                  value={deactivateForm.exitDate}
                  onChange={(e) => setDeactivateForm({ ...deactivateForm, exitDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Clearance / Exit Remarks *
                </label>
                <textarea
                  rows={3}
                  value={deactivateForm.remarks}
                  onChange={(e) => setDeactivateForm({ ...deactivateForm, remarks: e.target.value })}
                  placeholder="Record clearance reasons, resignation status, handover supervisor..."
                  className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1E2535]">
              <Button type="button" variant="outline" onClick={() => setShowDeactivateModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={deactivating}
                onClick={handleDeactivate}
              >
                Confirm Deactivation & Record Clearance
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
