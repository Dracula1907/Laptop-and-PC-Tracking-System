import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Laptop,
  ArrowUpRight,
  AlertCircle,
  RotateCcw,
  Filter,
  Calendar,
  Eye,
  Edit,
  FileSpreadsheet,
  X,
  AlertTriangle,
  Ban,
  CheckSquare,
  Building2,
  MapPin,
  ShieldCheck,
  History,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AssetAssignment } from '../types';
import { exportAssignmentsToExcel } from '../utils/exporters';
import api from '../services/api';

export const Assignments: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Live PostgreSQL Counters
  const [counts, setCounts] = useState({
    all: 0,
    active: 0,
    overdue: 0,
    returned: 0,
    cancelled: 0,
  });

  // Filters from URL Search Params
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>(searchParams.get('employeeId') || '');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>(searchParams.get('assetType') || '');
  const [deptFilter, setDeptFilter] = useState<string>(searchParams.get('department') || '');
  const [locFilter, setLocFilter] = useState<string>(searchParams.get('location') || '');

  // Sorting state
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'assignedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'desc');

  // Dynamic Options for Selects
  const [options, setOptions] = useState<{
    availableAssets: any[];
    employees: any[];
    departments: any[];
    locations: any[];
    approvers: any[];
  }>({
    availableAssets: [],
    employees: [],
    departments: [],
    locations: [],
    approvers: [],
  });

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  const [selectedAssignment, setSelectedAssignment] = useState<AssetAssignment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [returnLoading, setReturnLoading] = useState<boolean>(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  // Form States
  const [createForm, setCreateForm] = useState({
    assetId: '',
    employeeId: '',
    departmentId: '',
    locationId: '',
    assignedAt: new Date().toISOString().slice(0, 10),
    expectedReturnDate: '',
    conditionAtAssignment: 'GOOD',
    reason: '',
    remarks: '',
    approvedById: '',
  });

  const [editForm, setEditForm] = useState({
    departmentId: '',
    locationId: '',
    expectedReturnDate: '',
    conditionAtAssignment: 'GOOD',
    reason: '',
    remarks: '',
    approvedById: '',
  });

  const [returnForm, setReturnForm] = useState({
    conditionAtReturn: 'GOOD',
    accessoriesReturned: true,
    damageReported: false,
    missingAccessories: '',
    remarks: '',
  });

  const [cancelForm, setCancelForm] = useState({
    reason: '',
  });

  // Fetch dynamic counters from PostgreSQL
  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/assignments/counts');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setCounts(data);
      }
    } catch (err) {
      console.error('Failed to load assignment counters:', err);
    }
  };

  // Fetch options for dropdowns
  const fetchOptions = async () => {
    try {
      const res: any = await api.get('/assignments/options');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setOptions(data);
      }
    } catch (err) {
      console.error('Failed to load assignment options:', err);
    }
  };

  // Fetch assignments with pagination, search, and filters
  const fetchAssignments = async (page = pagination.page, currentLimit = pagination.limit) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', currentLimit.toString());
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter && statusFilter !== 'ALL') query.set('status', statusFilter);
      if (employeeFilter) query.set('employeeId', employeeFilter);
      if (assetTypeFilter) query.set('assetType', assetTypeFilter);
      if (deptFilter) query.set('department', deptFilter);
      if (locFilter) query.set('location', locFilter);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      // Sync URL query params
      setSearchParams(query, { replace: true });

      const res: any = await api.get(`/assignments?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;

      if (isSuccess && data) {
        setAssignments(data.assignments || data || []);
        if (data.pagination) {
          setPagination({
            page: data.pagination.page,
            limit: data.pagination.limit,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
      addToast('Failed to load assignments from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchAssignments(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, employeeFilter, assetTypeFilter, deptFilter, locFilter, sortBy, sortOrder]);

  const handlePageChange = (newPage: number) => {
    fetchAssignments(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit }));
    fetchAssignments(1, newLimit);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setEmployeeFilter('');
    setAssetTypeFilter('');
    setDeptFilter('');
    setLocFilter('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter && statusFilter !== 'ALL') count++;
    if (employeeFilter) count++;
    if (assetTypeFilter) count++;
    if (deptFilter) count++;
    if (locFilter) count++;
    return count;
  }, [search, statusFilter, employeeFilter, assetTypeFilter, deptFilter, locFilter]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    fetchOptions();
    setCreateForm({
      assetId: options.availableAssets[0]?.id || '',
      employeeId: options.employees[0]?.id || '',
      departmentId: options.employees[0]?.departmentId || '',
      locationId: options.employees[0]?.locationId || '',
      assignedAt: new Date().toISOString().slice(0, 10),
      expectedReturnDate: '',
      conditionAtAssignment: 'GOOD',
      reason: 'Standard corporate IT hardware allocation',
      remarks: '',
      approvedById: options.approvers[0]?.id || '',
    });
    setIsCreateModalOpen(true);
  };

  // Submit Create Assignment
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.assetId) {
      addToast('Please select an asset to assign.', 'warning');
      return;
    }
    if (!createForm.employeeId) {
      addToast('Please select an employee custodian.', 'warning');
      return;
    }

    setCreateLoading(true);
    try {
      const res: any = await api.post('/assignments', {
        assetId: createForm.assetId,
        employeeId: createForm.employeeId,
        departmentId: createForm.departmentId || undefined,
        locationId: createForm.locationId || undefined,
        assignedAt: createForm.assignedAt || undefined,
        expectedReturnDate: createForm.expectedReturnDate || undefined,
        conditionAtAssignment: createForm.conditionAtAssignment,
        reason: createForm.reason,
        remarks: createForm.remarks,
        approvedById: createForm.approvedById || undefined,
      });

      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Asset assigned successfully!', 'success');
        setIsCreateModalOpen(false);
        fetchAssignments(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to assign asset.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error creating assignment.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Details Modal
  const handleOpenDetailModal = async (asg: AssetAssignment) => {
    setSelectedAssignment(asg);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res: any = await api.get(`/assignments/${asg.id}`);
      if (res?.success && res.data) {
        setSelectedAssignment(res.data);
      }
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (asg: AssetAssignment) => {
    setSelectedAssignment(asg);
    setEditForm({
      departmentId: asg.departmentId || '',
      locationId: asg.locationId || '',
      expectedReturnDate: asg.expectedReturnDate ? asg.expectedReturnDate.slice(0, 10) : '',
      conditionAtAssignment: (asg.conditionAtAssignment as any) || 'GOOD',
      reason: asg.reason || '',
      remarks: asg.remarks || '',
      approvedById: asg.approvedById || '',
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setEditLoading(true);
    try {
      const res: any = await api.put(`/assignments/${selectedAssignment.id}`, {
        departmentId: editForm.departmentId || undefined,
        locationId: editForm.locationId || undefined,
        expectedReturnDate: editForm.expectedReturnDate || null,
        conditionAtAssignment: editForm.conditionAtAssignment,
        reason: editForm.reason,
        remarks: editForm.remarks,
        approvedById: editForm.approvedById || undefined,
      });

      if (res?.success ?? res?.data?.success) {
        addToast('Assignment updated successfully.', 'success');
        setIsEditModalOpen(false);
        fetchAssignments(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to update assignment.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error updating assignment.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Return Modal
  const handleOpenReturnModal = (asg: AssetAssignment) => {
    setSelectedAssignment(asg);
    setReturnForm({
      conditionAtReturn: (asg.conditionAtAssignment as any) || 'GOOD',
      accessoriesReturned: true,
      damageReported: false,
      missingAccessories: '',
      remarks: 'Returned in standard operating order',
    });
    setIsReturnModalOpen(true);
  };

  // Submit Return
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setReturnLoading(true);
    try {
      const res: any = await api.post(`/assignments/${selectedAssignment.id}/return`, {
        conditionAtReturn: returnForm.conditionAtReturn,
        accessoriesReturned: returnForm.accessoriesReturned,
        damageReported: returnForm.damageReported,
        missingAccessories: returnForm.missingAccessories || undefined,
        remarks: returnForm.remarks,
      });

      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Asset returned successfully!', 'success');
        setIsReturnModalOpen(false);
        fetchAssignments(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to return asset.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error returning asset.', 'error');
    } finally {
      setReturnLoading(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (asg: AssetAssignment) => {
    setSelectedAssignment(asg);
    setCancelForm({ reason: '' });
    setIsCancelModalOpen(true);
  };

  // Submit Cancel
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !cancelForm.reason.trim()) {
      addToast('Cancellation reason is required.', 'warning');
      return;
    }

    setCancelLoading(true);
    try {
      const res: any = await api.post(`/assignments/${selectedAssignment.id}/cancel`, {
        reason: cancelForm.reason.trim(),
      });

      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Assignment cancelled successfully.', 'success');
        setIsCancelModalOpen(false);
        fetchAssignments(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to cancel assignment.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error cancelling assignment.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Excel Export
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams();
      query.set('limit', '10000');
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter && statusFilter !== 'ALL') query.set('status', statusFilter);
      if (employeeFilter) query.set('employeeId', employeeFilter);
      if (assetTypeFilter) query.set('assetType', assetTypeFilter);
      if (deptFilter) query.set('department', deptFilter);
      if (locFilter) query.set('location', locFilter);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      const res: any = await api.get(`/assignments?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      const exportList = data?.assignments || [];

      if (exportList.length === 0) {
        addToast('No assignments match active filters to export.', 'warning');
        return;
      }

      exportAssignmentsToExcel(exportList);
      addToast(`Exported ${exportList.length} assignments to Excel successfully.`, 'success');
    } catch (err: any) {
      console.error('Export failed:', err);
      addToast('Failed to export assignments to Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Asset Assignments & Accountability"
        subtitle="Track complete device custody, custodian handovers, return schedules, and historical accountability."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              loading={exporting}
              onClick={handleExportExcel}
              title="Export all matching assignments to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Export Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() => { fetchAssignments(); fetchCounts(); }}
              title="Refresh records from database"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {hasPermission('ASSIGNMENT_CREATE') && (
              <Button
                variant="primary"
                onClick={handleOpenCreateModal}
                icon={<Plus className="w-4 h-4" />}
                className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-md"
              >
                Assign Asset
              </Button>
            )}
          </div>
        }
      />

      {/* Dynamic PostgreSQL Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-bgElevated border rounded-xl p-3.5 transition-all cursor-pointer shadow-card ${
            statusFilter === 'ALL' ? 'border-brandPrimary ring-1 ring-brandPrimary/40' : 'border-borderBase hover:border-brandPrimary/40'
          }`}
        >
          <div className="flex items-center justify-between text-textSecondary text-xs">
            <span>All Records</span>
            <UserCheck className="w-3.5 h-3.5 text-brandPrimary" />
          </div>
          <p className="text-xl font-bold font-mono text-textPrimary mt-1.5">{counts.all}</p>
          <span className="text-[10px] text-textSecondary">Historical repository</span>
        </div>

        <div
          onClick={() => setStatusFilter('ACTIVE')}
          className={`bg-bgElevated border rounded-xl p-3.5 transition-all cursor-pointer shadow-card ${
            statusFilter === 'ACTIVE' ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-borderBase hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span>Active In-Use</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1.5">{counts.active}</p>
          <span className="text-[10px] text-textSecondary">Currently with custodians</span>
        </div>

        <div
          onClick={() => setStatusFilter('OVERDUE')}
          className={`bg-bgElevated border rounded-xl p-3.5 transition-all cursor-pointer shadow-card ${
            statusFilter === 'OVERDUE' ? 'border-amber-500 ring-1 ring-amber-500/40' : 'border-borderBase hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-xs">
            <span>Overdue Return</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1.5">{counts.overdue}</p>
          <span className="text-[10px] text-textSecondary">Past expected date</span>
        </div>

        <div
          onClick={() => setStatusFilter('RETURNED')}
          className={`bg-bgElevated border rounded-xl p-3.5 transition-all cursor-pointer shadow-card ${
            statusFilter === 'RETURNED' ? 'border-blue-500 ring-1 ring-blue-500/40' : 'border-borderBase hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-blue-400 text-xs">
            <span>Returned</span>
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-bold font-mono text-blue-400 mt-1.5">{counts.returned}</p>
          <span className="text-[10px] text-textSecondary">Completed handovers</span>
        </div>

        <div
          onClick={() => setStatusFilter('CANCELLED')}
          className={`bg-bgElevated border rounded-xl p-3.5 transition-all cursor-pointer shadow-card ${
            statusFilter === 'CANCELLED' ? 'border-rose-500 ring-1 ring-rose-500/40' : 'border-borderBase hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 text-xs">
            <span>Cancelled</span>
            <Ban className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-xl font-bold font-mono text-rose-400 mt-1.5">{counts.cancelled}</p>
          <span className="text-[10px] text-textSecondary">Revoked allocations</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-bgElevated border border-borderBase rounded-xl p-4 space-y-3 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 items-center">
          {/* Search Input (2 cols) */}
          <div className="sm:col-span-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search Assignment ID, Asset ID, Employee, Dept, Location..."
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'ACTIVE', label: `Active (${counts.active})` },
              { value: 'OVERDUE', label: `Overdue (${counts.overdue})` },
              { value: 'RETURNED', label: `Returned (${counts.returned})` },
              { value: 'CANCELLED', label: `Cancelled (${counts.cancelled})` },
            ]}
          />

          {/* Department Filter */}
          <Select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              ...options.departments.map((d: any) => ({ value: d.name, label: d.name })),
            ]}
          />

          {/* Location Filter */}
          <Select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            options={[
              { value: '', label: 'All Locations' },
              ...options.locations.map((l: any) => ({ value: l.name, label: l.name })),
            ]}
          />

          {/* Asset Type Filter */}
          <Select
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Asset Types' },
              { value: 'LAPTOP', label: 'Laptop' },
              { value: 'DESKTOP', label: 'Office PC' },
              { value: 'WORKSTATION', label: 'Work Station' },
              { value: 'MONITOR', label: 'Monitor' },
            ]}
          />
        </div>

        {/* Active Filter Chips & Result Count */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-borderBase/60 gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-textSecondary font-medium flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-textSecondary" />
              Active Filters:
            </span>

            {activeFilterCount === 0 && (
              <span className="text-textSecondary/60 italic text-[11px]">None (Showing all records)</span>
            )}

            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brandPrimary/15 border border-brandPrimary/30 text-brandPrimary text-[11px]">
                Search: "{search}"
                <button type="button" onClick={() => setSearch('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/50 border border-blue-500/30 text-blue-300 text-[11px]">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {deptFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-[11px]">
                Dept: {deptFilter}
                <button type="button" onClick={() => setDeptFilter('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {locFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/50 border border-purple-500/30 text-purple-300 text-[11px]">
                Location: {locFilter}
                <button type="button" onClick={() => setLocFilter('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {assetTypeFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px]">
                Type: {assetTypeFilter}
                <button type="button" onClick={() => setAssetTypeFilter('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] text-textSecondary hover:text-white underline ml-1"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="text-textSecondary">
            Total Matching: <strong className="text-textPrimary font-mono">{pagination.total}</strong> assignments
          </div>
        </div>
      </div>

      {/* 13 Standard Columns Enterprise Table with Internal Horizontal Scrolling */}
      <div className="relative">
        <div className="w-full overflow-x-auto rounded-xl border border-borderBase shadow-card">
          <table className="w-full text-left border-collapse text-sm min-w-[1250px]">
            <thead>
              <tr className="bg-surfaceElevated/80 border-b border-borderBase text-xs font-semibold text-textSecondary uppercase tracking-wider select-none font-mono">
                <th
                  onClick={() => handleSort('assignmentCode')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Assignment ID</span>
                    {sortBy === 'assignmentCode' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('assetId')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Asset ID</span>
                    {sortBy === 'assetId' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('assetName')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[160px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Asset Name</span>
                    {sortBy === 'assetName' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('employeeName')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[160px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Employee</span>
                    {sortBy === 'employeeName' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('departmentName')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[140px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Department / Area</span>
                    {sortBy === 'departmentName' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('locationName')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    {sortBy === 'locationName' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('assignedAt')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Assignment Date</span>
                    {sortBy === 'assignedAt' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('expectedReturnDate')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Expected Return</span>
                    {sortBy === 'expectedReturnDate' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('actualReturnDate')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Actual Return</span>
                    {sortBy === 'actualReturnDate' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortBy === 'status' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[100px]">Assigned By</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[100px]">Approved By</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[150px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase/60 text-textPrimary">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(13)].map((__, j) => (
                      <td key={j} className="px-3.5 py-3.5">
                        <div className="h-4 bg-slate-800/80 rounded w-4/5" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-textSecondary">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <UserCheck className="w-8 h-8 text-zinc-600" />
                      <p className="font-semibold text-textPrimary text-sm">No assignment records found</p>
                      <p className="text-xs text-textSecondary max-w-sm">
                        No asset assignments match the active search or filters in PostgreSQL database.
                      </p>
                      {activeFilterCount > 0 && (
                        <Button variant="secondary" size="sm" onClick={clearAllFilters} className="mt-2 text-xs">
                          Clear Active Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                assignments.map((item) => {
                  const isAct = item.status === 'ACTIVE' && !item.isOverdue;
                  const isOver = item.isOverdue;
                  const isRet = item.status === 'RETURNED' || item.status === 'COMPLETED';
                  const isCan = item.status === 'CANCELLED';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetailModal(item)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
                    >
                      {/* Assignment Code */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono font-bold text-brandPrimary">
                        {item.assignmentCode}
                      </td>

                      {/* Asset ID */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/assets/${item.assetId}`);
                          }}
                          className="font-bold text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          {item.assetCode}
                          <ArrowUpRight className="w-3 h-3 opacity-60" />
                        </span>
                      </td>

                      {/* Asset Name */}
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-textPrimary leading-snug">{item.assetName}</p>
                        <p className="text-[10px] text-textSecondary font-mono mt-0.5">
                          {item.manufacturer} {item.model && item.model !== item.assetName ? `• ${item.model}` : ''}
                        </p>
                      </td>

                      {/* Employee */}
                      <td className="px-3.5 py-3">
                        <p className="font-medium text-textPrimary">{item.employeeName}</p>
                        {item.employeeCode && (
                          <span className="text-[10px] text-textSecondary font-mono">{item.employeeCode}</span>
                        )}
                      </td>

                      {/* Department / Area */}
                      <td className="px-3.5 py-3 text-textSecondary font-medium whitespace-nowrap">
                        {item.departmentName || '—'}
                      </td>

                      {/* Location */}
                      <td className="px-3.5 py-3 text-textSecondary font-mono whitespace-nowrap">
                        {item.locationName || '—'}
                      </td>

                      {/* Handover Date */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-textSecondary">
                        {item.assignedAt ? new Date(item.assignedAt).toISOString().slice(0, 10) : '—'}
                      </td>

                      {/* Expected Return */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono">
                        {item.expectedReturnDate ? (
                          <span className={item.isOverdue ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                            {new Date(item.expectedReturnDate).toISOString().slice(0, 10)}
                          </span>
                        ) : (
                          <span className="text-zinc-500 italic font-sans">Indefinite</span>
                        )}
                      </td>

                      {/* Actual Return */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-textSecondary">
                        {item.actualReturnDate ? new Date(item.actualReturnDate).toISOString().slice(0, 10) : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {isOver ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/40 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            OVERDUE
                          </span>
                        ) : isAct ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        ) : isRet ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-950/40 text-blue-400 border border-blue-500/20">
                            RETURNED
                          </span>
                        ) : isCan ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-950/40 text-rose-400 border border-rose-500/20">
                            CANCELLED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Assigned By */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-textSecondary font-mono text-[11px]">
                        {item.assignedByName || 'admin'}
                      </td>

                      {/* Approved By */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-textSecondary font-mono text-[11px]">
                        {item.approvedByName || '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-right font-sans" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetailModal(item)}
                            title="View Assignment Details"
                            className="p-1.5 hover:text-brandPrimary hover:bg-slate-800"
                            icon={<Eye className="w-4 h-4" />}
                          />
                          {hasPermission('ASSIGNMENT_CREATE') && item.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Assignment"
                              className="p-1.5 hover:text-amber-400 hover:bg-slate-800"
                              icon={<Edit className="w-4 h-4" />}
                            />
                          )}
                          {hasPermission('RETURN_CREATE') && item.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReturnModal(item)}
                              title="Return Asset"
                              className="p-1.5 hover:text-blue-400 hover:bg-blue-950/40"
                              icon={<RotateCcw className="w-4 h-4" />}
                            />
                          )}
                          {hasPermission('ASSIGNMENT_CREATE') && item.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCancelModal(item)}
                              title="Cancel Assignment"
                              className="p-1.5 hover:text-rose-400 hover:bg-rose-950/40"
                              icon={<Ban className="w-4 h-4" />}
                            />
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
      </div>

      {/* Pagination Controls */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.total}
        limit={pagination.limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        pageSizeOptions={[25, 50, 100]}
      />

      {/* ── MODAL 1: Create Assignment ────────────────────────────────────── */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="New Asset Assignment & Custodian Handover"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Asset Selection */}
              <div>
                <label className="block text-textSecondary font-medium mb-1">
                  Select Available Asset <span className="text-rose-400">*</span>
                </label>
                <select
                  value={createForm.assetId}
                  onChange={(e) => setCreateForm({ ...createForm, assetId: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                  required
                >
                  <option value="">-- Choose Unallocated Asset --</option>
                  {options.availableAssets.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.companyAssetId || a.assetCode} — {a.assetName || a.model} ({a.sourceAssetType || a.assetType})
                    </option>
                  ))}
                </select>
                {options.availableAssets.length === 0 && (
                  <p className="text-amber-400 text-[11px] mt-1">No unallocated assets currently available in stock.</p>
                )}
              </div>

              {/* Employee Selection */}
              <div>
                <label className="block text-textSecondary font-medium mb-1">
                  Assign To Employee Custodian <span className="text-rose-400">*</span>
                </label>
                <select
                  value={createForm.employeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const emp = options.employees.find((x: any) => x.id === empId);
                    setCreateForm({
                      ...createForm,
                      employeeId: empId,
                      departmentId: emp?.departmentId || createForm.departmentId,
                      locationId: emp?.locationId || createForm.locationId,
                    });
                  }}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                  required
                >
                  <option value="">-- Choose Active Employee --</option>
                  {options.employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode}) — {emp.designation || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-textSecondary font-medium mb-1">Responsible Department / Area</label>
                <select
                  value={createForm.departmentId}
                  onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
                >
                  <option value="">-- Inherit from Employee / General --</option>
                  {options.departments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-textSecondary font-medium mb-1">Operating Location</label>
                <select
                  value={createForm.locationId}
                  onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
                >
                  <option value="">-- Inherit from Employee / Facility --</option>
                  {options.locations.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Handover Date */}
              <div>
                <label className="block text-textSecondary font-medium mb-1">Handover Date</label>
                <input
                  type="date"
                  value={createForm.assignedAt}
                  onChange={(e) => setCreateForm({ ...createForm, assignedAt: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                />
              </div>

              {/* Expected Return Date */}
              <div>
                <label className="block text-textSecondary font-medium mb-1">
                  Expected Return Date <span className="text-zinc-500 font-normal">(Optional for temporary loan)</span>
                </label>
                <input
                  type="date"
                  value={createForm.expectedReturnDate}
                  onChange={(e) => setCreateForm({ ...createForm, expectedReturnDate: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                />
              </div>

              {/* Condition At Assignment */}
              <div>
                <label className="block text-textSecondary font-medium mb-1">Condition At Assignment</label>
                <select
                  value={createForm.conditionAtAssignment}
                  onChange={(e) => setCreateForm({ ...createForm, conditionAtAssignment: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="EXCELLENT">EXCELLENT (New)</option>
                  <option value="GOOD">GOOD (Standard Operational)</option>
                  <option value="FAIR">FAIR (Minor Wear)</option>
                  <option value="DAMAGED">DAMAGED (Pre-existing defect)</option>
                </select>
              </div>

              {/* Approver */}
              <div>
                <label className="block text-textSecondary font-medium mb-1">Authorizing Approver</label>
                <select
                  value={createForm.approvedById}
                  onChange={(e) => setCreateForm({ ...createForm, approvedById: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="">-- No explicit approver --</option>
                  {options.approvers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role?.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-textSecondary font-medium mb-1">Assignment Reason / Project Context</label>
              <input
                type="text"
                value={createForm.reason}
                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                placeholder="e.g. Automation PLC project deployment at site"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-brandPrimary"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-textSecondary font-medium mb-1">Handover Remarks & Accessories Included</label>
              <textarea
                value={createForm.remarks}
                onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                rows={2}
                placeholder="e.g. Handed over with charger, laptop bag, and wireless mouse"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={createLoading}
                className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-md"
              >
                Confirm Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 2: Assignment Details ──────────────────────────────────── */}
      {isDetailModalOpen && selectedAssignment && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Assignment Details — ${selectedAssignment.assignmentCode}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-sans">
            {detailLoading && (
              <div className="flex items-center justify-center p-4 text-brandPrimary">
                <RotateCcw className="w-5 h-5 animate-spin mr-2" />
                Loading latest details…
              </div>
            )}

            {/* Top Status Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-bgBase border border-borderBase">
              <div>
                <span className="text-[10px] text-textSecondary uppercase font-mono block">Status</span>
                <div className="mt-1">
                  {selectedAssignment.isOverdue ? (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-950/40 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      OVERDUE FOR RETURN
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                      {selectedAssignment.displayStatus || selectedAssignment.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-textSecondary uppercase font-mono block">Assignment Code</span>
                <span className="text-base font-bold font-mono text-brandPrimary">{selectedAssignment.assignmentCode}</span>
              </div>
            </div>

            {/* 2-Column Cards: Asset & Custodian */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Asset Card */}
              <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs border-b border-borderBase pb-2">
                  <Laptop className="w-4 h-4" />
                  <span>Assigned Hardware Device</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Asset ID:</span>
                  <span
                    onClick={() => navigate(`/assets/${selectedAssignment.assetId}`)}
                    className="font-mono font-bold text-cyan-400 cursor-pointer hover:underline"
                  >
                    {selectedAssignment.assetCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Name & Model:</span>
                  <span className="font-semibold text-textPrimary">{selectedAssignment.assetName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Serial Number:</span>
                  <span className="font-mono text-textPrimary">{selectedAssignment.serialNumber || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Device Type:</span>
                  <span className="font-mono text-textSecondary">{selectedAssignment.assetType}</span>
                </div>
              </div>

              {/* Employee Custodian Card */}
              <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs border-b border-borderBase pb-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Employee Custodian</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Employee Name:</span>
                  <span className="font-semibold text-textPrimary">{selectedAssignment.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Employee Code:</span>
                  <span className="font-mono text-textPrimary">{selectedAssignment.employeeCode || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Department / Area:</span>
                  <span className="text-textPrimary">{selectedAssignment.departmentName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Location:</span>
                  <span className="font-mono text-textSecondary">{selectedAssignment.locationName || '—'}</span>
                </div>
              </div>
            </div>

            {/* Schedule & Governance Card */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs border-b border-borderBase pb-2">
                <Calendar className="w-4 h-4" />
                <span>Lifecycle Dates & Accountability</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Handover Date</span>
                  <span className="font-mono text-textPrimary">
                    {selectedAssignment.assignedAt ? new Date(selectedAssignment.assignedAt).toISOString().slice(0, 10) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Expected Return</span>
                  <span className="font-mono text-textPrimary">
                    {selectedAssignment.expectedReturnDate ? new Date(selectedAssignment.expectedReturnDate).toISOString().slice(0, 10) : 'Indefinite'}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Actual Return</span>
                  <span className="font-mono text-textPrimary">
                    {selectedAssignment.actualReturnDate ? new Date(selectedAssignment.actualReturnDate).toISOString().slice(0, 10) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Condition Handover</span>
                  <span className="font-mono text-textPrimary">{selectedAssignment.conditionAtAssignment || 'GOOD'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-borderBase/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-textSecondary">Assignment Reason:</span>
                  <p className="text-textPrimary mt-0.5">{selectedAssignment.reason || '—'}</p>
                </div>
                <div>
                  <span className="text-textSecondary">Handover Remarks:</span>
                  <p className="text-textPrimary mt-0.5">{selectedAssignment.remarks || '—'}</p>
                </div>
              </div>
            </div>

            {/* Recent History Trail */}
            {selectedAssignment.historyEvents && selectedAssignment.historyEvents.length > 0 && (
              <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
                <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-xs border-b border-borderBase pb-2">
                  <History className="w-4 h-4" />
                  <span>Recent Asset Accountability Timeline</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedAssignment.historyEvents.map((evt: any) => (
                    <div key={evt.id} className="flex items-start justify-between text-[11px] p-1.5 rounded bg-bgElevated/60">
                      <div>
                        <span className="font-semibold text-textPrimary font-mono">{evt.action}</span>
                        <p className="text-textSecondary">{evt.remarks || 'Status updated'}</p>
                      </div>
                      <span className="text-[10px] font-mono text-textSecondary shrink-0 ml-2">
                        {new Date(evt.eventDate || evt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
              {selectedAssignment.status === 'ACTIVE' && hasPermission('RETURN_CREATE') && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenReturnModal(selectedAssignment);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Return Asset
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: Edit Assignment ──────────────────────────────────────── */}
      {isEditModalOpen && selectedAssignment && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Assignment — ${selectedAssignment.assignmentCode}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Expected Return Date</label>
              <input
                type="date"
                value={editForm.expectedReturnDate}
                onChange={(e) => setEditForm({ ...editForm, expectedReturnDate: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
              />
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Condition At Assignment</label>
              <select
                value={editForm.conditionAtAssignment}
                onChange={(e) => setEditForm({ ...editForm, conditionAtAssignment: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
              >
                <option value="EXCELLENT">EXCELLENT</option>
                <option value="GOOD">GOOD</option>
                <option value="FAIR">FAIR</option>
                <option value="DAMAGED">DAMAGED</option>
              </select>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Responsible Department</label>
              <select
                value={editForm.departmentId}
                onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
              >
                <option value="">-- No Department --</option>
                {options.departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Location</label>
              <select
                value={editForm.locationId}
                onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
              >
                <option value="">-- No Location --</option>
                {options.locations.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Assignment Reason</label>
              <input
                type="text"
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Remarks</label>
              <textarea
                value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                rows={2}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={editLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 4: Return Asset ────────────────────────────────────────── */}
      {isReturnModalOpen && selectedAssignment && (
        <Modal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title={`Return Asset to Stock — ${selectedAssignment.assetCode}`}
        >
          <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-bgBase border border-borderBase rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-textSecondary">Returning Custodian:</span>
                <span className="font-semibold text-textPrimary">{selectedAssignment.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Asset:</span>
                <span className="font-mono text-cyan-400 font-bold">{selectedAssignment.assetCode}</span>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Condition At Return</label>
              <select
                value={returnForm.conditionAtReturn}
                onChange={(e) => setReturnForm({ ...returnForm, conditionAtReturn: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
              >
                <option value="EXCELLENT">EXCELLENT (Like New)</option>
                <option value="GOOD">GOOD (Standard Operational)</option>
                <option value="FAIR">FAIR (Noticeable wear)</option>
                <option value="DAMAGED">DAMAGED (Requires repair/maintenance)</option>
              </select>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnForm.accessoriesReturned}
                  onChange={(e) => setReturnForm({ ...returnForm, accessoriesReturned: e.target.checked })}
                  className="rounded border-borderBase text-brandPrimary focus:ring-brandPrimary"
                />
                <span className="text-textPrimary font-medium">All accessories returned (Charger, bag, cables, mouse)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnForm.damageReported}
                  onChange={(e) => setReturnForm({ ...returnForm, damageReported: e.target.checked })}
                  className="rounded border-borderBase text-rose-500 focus:ring-rose-500"
                />
                <span className="text-rose-300 font-medium">Damage reported (Asset will be routed to UNDER_REPAIR queue)</span>
              </label>
            </div>

            {!returnForm.accessoriesReturned && (
              <div>
                <label className="block text-textSecondary font-medium mb-1">Missing Accessories Details</label>
                <input
                  type="text"
                  value={returnForm.missingAccessories}
                  onChange={(e) => setReturnForm({ ...returnForm, missingAccessories: e.target.value })}
                  placeholder="e.g. Missing 65W charger adapter"
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
                />
              </div>
            )}

            <div>
              <label className="block text-textSecondary font-medium mb-1">Return Handover Remarks</label>
              <textarea
                value={returnForm.remarks}
                onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                rows={2}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsReturnModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={returnLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Complete Return Handover
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 5: Cancel Assignment ────────────────────────────────────── */}
      {isCancelModalOpen && selectedAssignment && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title={`Cancel Assignment — ${selectedAssignment.assignmentCode}`}
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Revoke Active Allocation</p>
                <p className="text-rose-200/90 mt-0.5">
                  Cancelling this assignment will remove the asset from {selectedAssignment.employeeName} and return it to IT STOCK as AVAILABLE.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Mandatory Cancellation Rationale <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={cancelForm.reason}
                onChange={(e) => setCancelForm({ reason: e.target.value })}
                rows={3}
                placeholder="State reason for cancelling this assignment (e.g. Employee onboarding delayed, assigned in error)"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-rose-500 font-sans"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsCancelModalOpen(false)}>
                Keep Assignment
              </Button>
              <Button
                variant="danger"
                type="submit"
                loading={cancelLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Cancellation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
