import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  Edit,
  FileSpreadsheet,
  AlertCircle,
  Building,
  MapPin,
  User,
  ArrowRight,
  Eye,
  Ban,
  X,
  Filter,
  Check,
  Calendar,
  Laptop,
  ShieldCheck,
  AlertTriangle,
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
import { AssetTransfer } from '../types';
import { exportTransfersToExcel } from '../utils/exporters';
import api from '../services/api';

const TRANSFER_REASONS = [
  'EMPLOYEE CHANGE',
  'DEPARTMENT CHANGE',
  'LOCATION CHANGE',
  'PROJECT REQUIREMENT',
  'REPAIR / SERVICE',
  'TEMPORARY ALLOCATION',
  'BUSINESS REQUIREMENT',
  'DEALLOCATION TO STOCK',
  'ALLOCATION FROM STOCK',
  'OTHER',
];

export const Transfers: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Live PostgreSQL Counters
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  });

  // Filters from URL Search Params
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>(searchParams.get('assetType') || '');
  const [fromEmpFilter, setFromEmpFilter] = useState<string>(searchParams.get('fromEmployeeId') || '');
  const [toEmpFilter, setToEmpFilter] = useState<string>(searchParams.get('toEmployeeId') || '');
  const [fromDeptFilter, setFromDeptFilter] = useState<string>(searchParams.get('fromDepartmentId') || '');
  const [toDeptFilter, setToDeptFilter] = useState<string>(searchParams.get('toDepartmentId') || '');
  const [fromLocFilter, setFromLocFilter] = useState<string>(searchParams.get('fromLocationId') || '');
  const [toLocFilter, setToLocFilter] = useState<string>(searchParams.get('toLocationId') || '');
  const [reasonFilter, setReasonFilter] = useState<string>(searchParams.get('reason') || '');

  // Sorting
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'transferDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'desc');

  // Dynamic Options
  const [options, setOptions] = useState<{
    assets: any[];
    employees: any[];
    departments: any[];
    locations: any[];
    approvers: any[];
  }>({
    assets: [],
    employees: [],
    departments: [],
    locations: [],
    approvers: [],
  });

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  const [selectedTransfer, setSelectedTransfer] = useState<AssetTransfer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);
  const [completeLoading, setCompleteLoading] = useState<boolean>(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  const [isReverseModalOpen, setIsReverseModalOpen] = useState<boolean>(false);
  const [reverseLoading, setReverseLoading] = useState<boolean>(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    assetId: '',
    selectedAsset: null as any,
    newHolderId: '',
    newDepartmentId: '',
    newLocationId: '',
    transferDate: new Date().toISOString().slice(0, 10),
    effectiveDate: new Date().toISOString().slice(0, 10),
    conditionAfter: 'GOOD',
    reason: 'EMPLOYEE CHANGE',
    remarks: '',
    status: 'COMPLETED',
    approvedById: '',
  });

  // Edit Pending Form State
  const [editForm, setEditForm] = useState({
    newHolderId: '',
    newDepartmentId: '',
    newLocationId: '',
    effectiveDate: '',
    conditionAfter: 'GOOD',
    reason: '',
    remarks: '',
    approvedById: '',
  });

  const [cancelReason, setCancelReason] = useState<string>('');
  const [reverseReason, setReverseReason] = useState<string>('');

  // Fetch dynamic counters from PostgreSQL
  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/transfers/counts');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setCounts(data);
      }
    } catch (err) {
      console.error('Failed to load transfer counters:', err);
    }
  };

  // Fetch options for dropdowns with full current asset state
  const fetchOptions = async () => {
    try {
      const res: any = await api.get('/transfers/options');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setOptions(data);
      }
    } catch (err) {
      console.error('Failed to load transfer options:', err);
    }
  };

  // Fetch transfers with pagination, search, and combined filters
  const fetchTransfers = async (page = pagination.page, currentLimit = pagination.limit) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', currentLimit.toString());
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter && statusFilter !== 'ALL') query.set('status', statusFilter);
      if (assetTypeFilter) query.set('assetType', assetTypeFilter);
      if (fromEmpFilter) query.set('fromEmployeeId', fromEmpFilter);
      if (toEmpFilter) query.set('toEmployeeId', toEmpFilter);
      if (fromDeptFilter) query.set('fromDepartmentId', fromDeptFilter);
      if (toDeptFilter) query.set('toDepartmentId', toDeptFilter);
      if (fromLocFilter) query.set('fromLocationId', fromLocFilter);
      if (toLocFilter) query.set('toLocationId', toLocFilter);
      if (reasonFilter) query.set('reason', reasonFilter);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      // Sync URL
      setSearchParams(query, { replace: true });

      const res: any = await api.get(`/transfers?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;

      if (isSuccess && data) {
        setTransfers(data.transfers || data || []);
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
      console.error('Failed to load transfers:', err);
      addToast('Failed to load transfers from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchTransfers(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    statusFilter,
    assetTypeFilter,
    fromEmpFilter,
    toEmpFilter,
    fromDeptFilter,
    toDeptFilter,
    fromLocFilter,
    toLocFilter,
    reasonFilter,
    sortBy,
    sortOrder,
  ]);

  const handlePageChange = (newPage: number) => {
    fetchTransfers(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit }));
    fetchTransfers(1, newLimit);
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
    setAssetTypeFilter('');
    setFromEmpFilter('');
    setToEmpFilter('');
    setFromDeptFilter('');
    setToDeptFilter('');
    setFromLocFilter('');
    setToLocFilter('');
    setReasonFilter('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter && statusFilter !== 'ALL') count++;
    if (assetTypeFilter) count++;
    if (fromEmpFilter) count++;
    if (toEmpFilter) count++;
    if (fromDeptFilter) count++;
    if (toDeptFilter) count++;
    if (fromLocFilter) count++;
    if (toLocFilter) count++;
    if (reasonFilter) count++;
    return count;
  }, [
    search,
    statusFilter,
    assetTypeFilter,
    fromEmpFilter,
    toEmpFilter,
    fromDeptFilter,
    toDeptFilter,
    fromLocFilter,
    toLocFilter,
    reasonFilter,
  ]);

  // Open Create Modal with dynamic asset selection
  const handleOpenCreateModal = () => {
    fetchOptions();
    const firstAsset = options.assets[0];
    setCreateForm({
      assetId: firstAsset?.id || '',
      selectedAsset: firstAsset || null,
      newHolderId: '',
      newDepartmentId: firstAsset?.departmentId || '',
      newLocationId: firstAsset?.locationId || '',
      transferDate: new Date().toISOString().slice(0, 10),
      effectiveDate: new Date().toISOString().slice(0, 10),
      conditionAfter: firstAsset?.condition || 'GOOD',
      reason: 'EMPLOYEE CHANGE',
      remarks: '',
      status: 'COMPLETED',
      approvedById: options.approvers[0]?.id || '',
    });
    setIsCreateModalOpen(true);
  };

  const handleAssetChange = (assetId: string) => {
    const ast = options.assets.find((a: any) => a.id === assetId);
    setCreateForm((prev) => ({
      ...prev,
      assetId,
      selectedAsset: ast || null,
      conditionAfter: ast?.condition || prev.conditionAfter,
      newDepartmentId: ast?.departmentId || prev.newDepartmentId,
      newLocationId: ast?.locationId || prev.newLocationId,
    }));
  };

  const handleNewHolderChange = (empId: string) => {
    const emp = options.employees.find((e: any) => e.id === empId);
    setCreateForm((prev) => ({
      ...prev,
      newHolderId: empId,
      newDepartmentId: emp?.departmentId || prev.newDepartmentId,
      newLocationId: emp?.locationId || prev.newLocationId,
    }));
  };

  // Submit Create Transfer with Concurrency Conflict Payload
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.assetId) {
      addToast('Please select an asset to transfer.', 'warning');
      return;
    }

    const ast = createForm.selectedAsset;

    setCreateLoading(true);
    try {
      const res: any = await api.post('/transfers', {
        assetId: createForm.assetId,
        newHolderId: createForm.newHolderId || null,
        newDepartmentId: createForm.newDepartmentId || null,
        newLocationId: createForm.newLocationId || null,
        transferDate: createForm.transferDate || undefined,
        effectiveDate: createForm.effectiveDate || undefined,
        conditionBefore: ast?.condition || 'GOOD',
        conditionAfter: createForm.conditionAfter,
        reason: createForm.reason,
        remarks: createForm.remarks,
        status: createForm.status,
        approvedById: createForm.approvedById || undefined,
        expectedSourceState: {
          holderId: ast?.currentHolderId || null,
          departmentId: ast?.departmentId || null,
          locationId: ast?.locationId || null,
        },
      });

      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Asset transfer processed successfully!', 'success');
        setIsCreateModalOpen(false);
        fetchTransfers(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to process transfer.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error executing transfer.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Details Modal
  const handleOpenDetailModal = async (trf: AssetTransfer) => {
    setSelectedTransfer(trf);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res: any = await api.get(`/transfers/${trf.id}`);
      if (res?.success && res.data) {
        setSelectedTransfer(res.data);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Edit Modal for Pending transfers
  const handleOpenEditModal = (trf: AssetTransfer) => {
    setSelectedTransfer(trf);
    setEditForm({
      newHolderId: trf.newHolderId || '',
      newDepartmentId: trf.newDepartmentId || '',
      newLocationId: trf.newLocationId || '',
      effectiveDate: trf.effectiveDate ? trf.effectiveDate.slice(0, 10) : '',
      conditionAfter: (trf.conditionAfter as any) || 'GOOD',
      reason: trf.reason || '',
      remarks: trf.remarks || '',
      approvedById: trf.approvedById || '',
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    setEditLoading(true);
    try {
      const res: any = await api.put(`/transfers/${selectedTransfer.id}`, {
        newHolderId: editForm.newHolderId || null,
        newDepartmentId: editForm.newDepartmentId || null,
        newLocationId: editForm.newLocationId || null,
        effectiveDate: editForm.effectiveDate || null,
        conditionAfter: editForm.conditionAfter,
        reason: editForm.reason,
        remarks: editForm.remarks,
        approvedById: editForm.approvedById || null,
      });

      if (res?.success ?? res?.data?.success) {
        addToast('Transfer request updated successfully.', 'success');
        setIsEditModalOpen(false);
        fetchTransfers(pagination.page, pagination.limit);
      } else {
        addToast(res?.message || 'Failed to update transfer.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error updating transfer.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Complete Modal for Pending transfers
  const handleOpenCompleteModal = (trf: AssetTransfer) => {
    setSelectedTransfer(trf);
    setIsCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async () => {
    if (!selectedTransfer) return;
    setCompleteLoading(true);
    try {
      const res: any = await api.post(`/transfers/${selectedTransfer.id}/complete`);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Transfer completed successfully!', 'success');
        setIsCompleteModalOpen(false);
        fetchTransfers(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to complete transfer.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error completing transfer.', 'error');
    } finally {
      setCompleteLoading(false);
    }
  };

  // Open Cancel Modal for Pending transfers
  const handleOpenCancelModal = (trf: AssetTransfer) => {
    setSelectedTransfer(trf);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer || !cancelReason.trim()) {
      addToast('Cancellation rationale is required.', 'warning');
      return;
    }

    setCancelLoading(true);
    try {
      const res: any = await api.post(`/transfers/${selectedTransfer.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Transfer cancelled successfully.', 'success');
        setIsCancelModalOpen(false);
        fetchTransfers(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to cancel transfer.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error cancelling transfer.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Open Reverse Modal for Completed transfers
  const handleOpenReverseModal = (trf: AssetTransfer) => {
    setSelectedTransfer(trf);
    setReverseReason('');
    setIsReverseModalOpen(true);
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer || !reverseReason.trim()) {
      addToast('Reversal rationale is required.', 'warning');
      return;
    }

    setReverseLoading(true);
    try {
      const res: any = await api.post(`/transfers/${selectedTransfer.id}/reverse`, {
        reason: reverseReason.trim(),
      });
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Transfer reversed successfully.', 'success');
        setIsReverseModalOpen(false);
        fetchTransfers(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to reverse transfer.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error reversing transfer.', 'error');
    } finally {
      setReverseLoading(false);
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
      if (assetTypeFilter) query.set('assetType', assetTypeFilter);
      if (fromEmpFilter) query.set('fromEmployeeId', fromEmpFilter);
      if (toEmpFilter) query.set('toEmployeeId', toEmpFilter);
      if (fromDeptFilter) query.set('fromDepartmentId', fromDeptFilter);
      if (toDeptFilter) query.set('toDepartmentId', toDeptFilter);
      if (fromLocFilter) query.set('fromLocationId', fromLocFilter);
      if (toLocFilter) query.set('toLocationId', toLocFilter);
      if (reasonFilter) query.set('reason', reasonFilter);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      const res: any = await api.get(`/transfers?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      const exportList = data?.transfers || [];

      if (exportList.length === 0) {
        addToast('No transfer records match active filters to export.', 'warning');
        return;
      }

      exportTransfersToExcel(exportList);
      addToast(`Exported ${exportList.length} transfers to Excel successfully.`, 'success');
    } catch (err: any) {
      console.error('Export failed:', err);
      addToast('Failed to export transfers to Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Asset Transfers & Movement"
        subtitle="Auditable chain-of-custody tracking across employees, departments, operating locations, and IT stock."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              loading={exporting}
              onClick={handleExportExcel}
              title="Export all matching transfers to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Export Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() => { fetchTransfers(); fetchCounts(); }}
              title="Refresh records from database"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {hasPermission('TRANSFER_CREATE') && (
              <Button
                variant="primary"
                onClick={handleOpenCreateModal}
                icon={<Plus className="w-4 h-4" />}
                className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-md"
              >
                New Transfer
              </Button>
            )}
          </div>
        }
      />

      {/* Dynamic PostgreSQL Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-bgElevated border rounded-xl p-3.5 transition-all cursor-pointer shadow-card ${
            statusFilter === 'ALL' ? 'border-brandPrimary ring-1 ring-brandPrimary/40' : 'border-borderBase hover:border-brandPrimary/40'
          }`}
        >
          <div className="flex items-center justify-between text-textSecondary text-xs">
            <span>All Movements</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-brandPrimary" />
          </div>
          <p className="text-xl font-bold font-mono text-textPrimary mt-1.5">{counts.all}</p>
          <span className="text-[10px] text-textSecondary">Chain of custody archive</span>
        </div>

        <div
          onClick={() => setStatusFilter('COMPLETED')}
          className={`bg-bgElevated border rounded-xl p-3.5 transition-all cursor-pointer shadow-card ${
            statusFilter === 'COMPLETED' ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-borderBase hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1.5">{counts.completed}</p>
          <span className="text-[10px] text-textSecondary">Executed asset transfers</span>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-bgElevated border rounded-xl p-3.5 transition-all cursor-pointer shadow-card ${
            statusFilter === 'PENDING' ? 'border-amber-500 ring-1 ring-amber-500/40' : 'border-borderBase hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-xs">
            <span>Pending Approval</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1.5">{counts.pending}</p>
          <span className="text-[10px] text-textSecondary">Awaiting authorization</span>
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
          <span className="text-[10px] text-textSecondary">Revoked movement requests</span>
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
              placeholder="Search Transfer ID, Asset, Custodian, Dept, Location..."
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'COMPLETED', label: `Completed (${counts.completed})` },
              { value: 'PENDING', label: `Pending (${counts.pending})` },
              { value: 'CANCELLED', label: `Cancelled (${counts.cancelled})` },
            ]}
          />

          {/* Reason Filter */}
          <Select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            options={[
              { value: '', label: 'All Transfer Reasons' },
              ...TRANSFER_REASONS.map((r) => ({ value: r, label: r })),
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

          {/* Target Location Filter */}
          <Select
            value={toLocFilter}
            onChange={(e) => setToLocFilter(e.target.value)}
            options={[
              { value: '', label: 'All To Locations' },
              ...options.locations.map((l: any) => ({ value: l.id, label: l.name })),
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
              <span className="text-textSecondary/60 italic text-[11px]">None (Showing all movements)</span>
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[11px]">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {reasonFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-[11px]">
                Reason: {reasonFilter}
                <button type="button" onClick={() => setReasonFilter('')} className="hover:text-white">
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
            Total Movements: <strong className="text-textPrimary font-mono">{pagination.total}</strong>
          </div>
        </div>
      </div>

      {/* 15 Standard Columns Table with Internal Horizontal Scrolling */}
      <div className="relative">
        <div className="w-full overflow-x-auto rounded-xl border border-borderBase shadow-card">
          <table className="w-full text-left border-collapse text-sm min-w-[1400px]">
            <thead>
              <tr className="bg-surfaceElevated/80 border-b border-borderBase text-xs font-semibold text-textSecondary uppercase tracking-wider select-none font-mono">
                <th
                  onClick={() => handleSort('transferCode')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Transfer ID</span>
                    {sortBy === 'transferCode' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
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
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[150px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Asset Name</span>
                    {sortBy === 'assetName' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[140px]">From Employee</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[140px]">To Employee</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[130px]">From Dept / Area</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[130px]">To Dept / Area</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[110px]">From Location</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[110px]">To Location</th>
                <th
                  onClick={() => handleSort('transferDate')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Transfer Date</span>
                    {sortBy === 'transferDate' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[140px]">Reason</th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortBy === 'status' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[100px]">Performed By</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[100px]">Approved By</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[130px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase/60 text-textPrimary">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(15)].map((__, j) => (
                      <td key={j} className="px-3.5 py-3.5">
                        <div className="h-4 bg-slate-800/80 rounded w-4/5" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-textSecondary">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ArrowRightLeft className="w-8 h-8 text-zinc-600" />
                      <p className="font-semibold text-textPrimary text-sm">No asset transfers found</p>
                      <p className="text-xs text-textSecondary max-w-sm">
                        No asset movement records match the active search or filters in PostgreSQL database.
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
                transfers.map((item) => {
                  const isComp = item.status === 'COMPLETED';
                  const isPend = item.status === 'PENDING';
                  const isCanc = item.status === 'CANCELLED';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetailModal(item)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
                    >
                      {/* Transfer Code */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono font-bold text-brandPrimary">
                        {item.transferCode}
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
                        </span>
                      </td>

                      {/* Asset Name */}
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-textPrimary leading-snug">{item.assetName}</p>
                        <p className="text-[10px] text-textSecondary font-mono mt-0.5">
                          {item.model}
                        </p>
                      </td>

                      {/* From Employee */}
                      <td className="px-3.5 py-3">
                        <span className="text-slate-400 font-medium">{item.previousHolderName}</span>
                      </td>

                      {/* To Employee */}
                      <td className="px-3.5 py-3">
                        <span className="text-emerald-400 font-semibold">{item.newHolderName}</span>
                      </td>

                      {/* From Department */}
                      <td className="px-3.5 py-3 text-textSecondary whitespace-nowrap">
                        {item.previousDepartmentName}
                      </td>

                      {/* To Department */}
                      <td className="px-3.5 py-3 text-textPrimary font-medium whitespace-nowrap">
                        {item.newDepartmentName}
                      </td>

                      {/* From Location */}
                      <td className="px-3.5 py-3 text-textSecondary font-mono whitespace-nowrap">
                        {item.previousLocationName}
                      </td>

                      {/* To Location */}
                      <td className="px-3.5 py-3 text-cyan-400 font-mono whitespace-nowrap">
                        {item.newLocationName}
                      </td>

                      {/* Transfer Date */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-textSecondary">
                        {item.transferDate ? new Date(item.transferDate).toISOString().slice(0, 10) : '—'}
                      </td>

                      {/* Reason */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-textSecondary font-mono text-[11px]">
                        {item.reason}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {isComp ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                            COMPLETED
                          </span>
                        ) : isPend ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/40 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            PENDING
                          </span>
                        ) : isCanc ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-950/40 text-rose-400 border border-rose-500/20">
                            CANCELLED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-400">
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Performed By */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-textSecondary font-mono text-[11px]">
                        {item.performedByName || 'admin'}
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
                            title="View Transfer Details"
                            className="p-1.5 hover:text-brandPrimary hover:bg-slate-800"
                            icon={<Eye className="w-4 h-4" />}
                          />
                          {isPend && hasPermission('TRANSFER_APPROVE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCompleteModal(item)}
                              title="Authorize / Complete Movement"
                              className="p-1.5 text-emerald-400 hover:bg-emerald-950/40"
                              icon={<CheckCircle2 className="w-4 h-4" />}
                            />
                          )}
                          {isPend && hasPermission('TRANSFER_CREATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Pending Request"
                              className="p-1.5 hover:text-amber-400 hover:bg-slate-800"
                              icon={<Edit className="w-4 h-4" />}
                            />
                          )}
                          {isPend && hasPermission('TRANSFER_CREATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCancelModal(item)}
                              title="Cancel Request"
                              className="p-1.5 hover:text-rose-400 hover:bg-rose-950/40"
                              icon={<Ban className="w-4 h-4" />}
                            />
                          )}
                          {isComp && hasPermission('TRANSFER_APPROVE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReverseModal(item)}
                              title="Reverse Movement (B → A)"
                              className="p-1.5 hover:text-indigo-400 hover:bg-indigo-950/40"
                              icon={<RotateCcw className="w-4 h-4" />}
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

      {/* ── MODAL 1: Create Transfer (CURRENT STATE → NEW STATE Preview) ──── */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="New Asset Transfer & Movement"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
            {/* Step A: Select Asset */}
            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Select Hardware Device to Move <span className="text-rose-400">*</span>
              </label>
              <select
                value={createForm.assetId}
                onChange={(e) => handleAssetChange(e.target.value)}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                required
              >
                <option value="">-- Choose Asset --</option>
                {options.assets.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.companyAssetId || a.assetCode} — {a.assetName || a.model} | Current Holder: {a.currentHolder?.fullName || 'IT STOCK'}
                  </option>
                ))}
              </select>
            </div>

            {/* Step B: Visual State Transition Comparison (CURRENT STATE → NEW STATE) */}
            {createForm.selectedAsset && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-bgBase border border-borderBase">
                {/* Current State Panel */}
                <div className="space-y-2 p-3 rounded-lg bg-bgElevated/70 border border-slate-700/60">
                  <div className="flex items-center justify-between pb-1.5 border-b border-borderBase">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] font-mono">
                      Current State (Source)
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                      {createForm.selectedAsset.allocationStatus}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Current Holder:</span>
                      <strong className="text-textPrimary">{createForm.selectedAsset.currentHolder?.fullName || 'IT STOCK'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Department:</span>
                      <span className="text-textPrimary">{createForm.selectedAsset.department?.name || 'IT STOCK'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Location:</span>
                      <span className="font-mono text-cyan-400">{createForm.selectedAsset.locationRel?.name || createForm.selectedAsset.location || 'HQ'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Condition:</span>
                      <span className="font-mono text-textPrimary">{createForm.selectedAsset.condition || 'GOOD'}</span>
                    </div>
                  </div>
                </div>

                {/* Target Destination Panel */}
                <div className="space-y-2 p-3 rounded-lg bg-brandPrimary/10 border border-brandPrimary/30">
                  <div className="flex items-center justify-between pb-1.5 border-b border-brandPrimary/30">
                    <span className="font-bold text-brandPrimary uppercase tracking-wider text-[11px] font-mono flex items-center gap-1">
                      New State (Destination)
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/20">
                      {createForm.newHolderId ? 'ALLOCATED' : 'NOT ALLOCATED (STOCK)'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-textSecondary font-medium mb-1">To Employee Custodian</label>
                      <select
                        value={createForm.newHolderId}
                        onChange={(e) => handleNewHolderChange(e.target.value)}
                        className="w-full bg-bgBase border border-borderBase rounded px-2.5 py-1.5 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                      >
                        <option value="">-- IT STOCK (No Personal Custodian) --</option>
                        {options.employees.map((emp: any) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.fullName} ({emp.employeeCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-textSecondary font-medium mb-1">To Department</label>
                        <select
                          value={createForm.newDepartmentId}
                          onChange={(e) => setCreateForm({ ...createForm, newDepartmentId: e.target.value })}
                          className="w-full bg-bgBase border border-borderBase rounded px-2 py-1.5 text-textPrimary focus:outline-none focus:border-brandPrimary"
                        >
                          <option value="">-- Same / None --</option>
                          {options.departments.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-textSecondary font-medium mb-1">To Location</label>
                        <select
                          value={createForm.newLocationId}
                          onChange={(e) => setCreateForm({ ...createForm, newLocationId: e.target.value })}
                          className="w-full bg-bgBase border border-borderBase rounded px-2 py-1.5 text-textPrimary focus:outline-none focus:border-brandPrimary"
                        >
                          <option value="">-- Same / None --</option>
                          {options.locations.map((l: any) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step C: Movement Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Transfer Reason</label>
                <select
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
                >
                  {TRANSFER_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Effective Date</label>
                <input
                  type="date"
                  value={createForm.effectiveDate}
                  onChange={(e) => setCreateForm({ ...createForm, effectiveDate: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                />
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Condition After Transfer</label>
                <select
                  value={createForm.conditionAfter}
                  onChange={(e) => setCreateForm({ ...createForm, conditionAfter: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="EXCELLENT">EXCELLENT (Like New)</option>
                  <option value="GOOD">GOOD (Standard Operational)</option>
                  <option value="FAIR">FAIR (Noticeable Wear)</option>
                  <option value="DAMAGED">DAMAGED (Requires Repair)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Authorizing Approver</label>
                <select
                  value={createForm.approvedById}
                  onChange={(e) => setCreateForm({ ...createForm, approvedById: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="">-- Self / Direct Transfer --</option>
                  {options.approvers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Execution Mode</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="COMPLETED">Execute Immediately (COMPLETED)</option>
                  <option value="PENDING">Submit for Approval (PENDING)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Handover Notes & Remarks</label>
              <textarea
                value={createForm.remarks}
                onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                rows={2}
                placeholder="e.g. Device physically checked, accessories intact, reassigned for client project"
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
                Confirm & Record Movement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 2: Transfer Details ────────────────────────────────────── */}
      {isDetailModalOpen && selectedTransfer && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Movement Audit Details — ${selectedTransfer.transferCode}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-sans">
            {detailLoading && (
              <div className="flex items-center justify-center p-3 text-brandPrimary">
                <RotateCcw className="w-5 h-5 animate-spin mr-2" />
                Loading latest details…
              </div>
            )}

            {/* Top Status Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-bgBase border border-borderBase">
              <div>
                <span className="text-[10px] text-textSecondary uppercase font-mono block">Status</span>
                <div className="mt-1">
                  {selectedTransfer.status === 'COMPLETED' ? (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                      COMPLETED
                    </span>
                  ) : selectedTransfer.status === 'PENDING' ? (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-950/40 text-amber-400 border border-amber-500/30">
                      PENDING APPROVAL
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-950/40 text-rose-400 border border-rose-500/20">
                      CANCELLED
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-textSecondary uppercase font-mono block">Transfer Code</span>
                <span className="text-base font-bold font-mono text-brandPrimary">{selectedTransfer.transferCode}</span>
              </div>
            </div>

            {/* Asset Device Card */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs border-b border-borderBase pb-2">
                <Laptop className="w-4 h-4" />
                <span>Transferred Device</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Asset ID</span>
                  <span
                    onClick={() => navigate(`/assets/${selectedTransfer.assetId}`)}
                    className="font-mono font-bold text-cyan-400 cursor-pointer hover:underline"
                  >
                    {selectedTransfer.assetCode}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Device Model</span>
                  <span className="font-semibold text-textPrimary">{selectedTransfer.assetName}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Serial Number</span>
                  <span className="font-mono text-textPrimary">{selectedTransfer.serialNumber}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Asset Type</span>
                  <span className="font-mono text-textSecondary">{selectedTransfer.assetType}</span>
                </div>
              </div>
            </div>

            {/* Side-by-Side FROM vs TO Transition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-bgBase border border-borderBase space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block border-b border-borderBase pb-1">
                  FROM (Previous State)
                </span>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Employee:</span>
                  <span className="text-slate-300 font-medium">{selectedTransfer.previousHolderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Department:</span>
                  <span className="text-textPrimary">{selectedTransfer.previousDepartmentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Location:</span>
                  <span className="font-mono text-textSecondary">{selectedTransfer.previousLocationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Condition:</span>
                  <span className="font-mono text-textPrimary">{selectedTransfer.conditionBefore || 'GOOD'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-brandPrimary/10 border border-brandPrimary/30 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-brandPrimary uppercase block border-b border-brandPrimary/30 pb-1 flex items-center gap-1">
                  TO (New State)
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Employee:</span>
                  <span className="text-emerald-400 font-bold">{selectedTransfer.newHolderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Department:</span>
                  <span className="text-textPrimary">{selectedTransfer.newDepartmentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Location:</span>
                  <span className="font-mono text-cyan-400">{selectedTransfer.newLocationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Condition:</span>
                  <span className="font-mono text-textPrimary">{selectedTransfer.conditionAfter || 'GOOD'}</span>
                </div>
              </div>
            </div>

            {/* Governance & Dates */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Transfer Date</span>
                  <span className="font-mono text-textPrimary">
                    {selectedTransfer.transferDate ? new Date(selectedTransfer.transferDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Effective Date</span>
                  <span className="font-mono text-textPrimary">
                    {selectedTransfer.effectiveDate ? new Date(selectedTransfer.effectiveDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Performed By</span>
                  <span className="font-mono text-textPrimary">{selectedTransfer.performedByName || 'admin'}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Approved By</span>
                  <span className="font-mono text-textPrimary">{selectedTransfer.approvedByName || '—'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-borderBase/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-textSecondary">Movement Reason:</span>
                  <p className="text-textPrimary mt-0.5">{selectedTransfer.reason || '—'}</p>
                </div>
                <div>
                  <span className="text-textSecondary">Handover Remarks:</span>
                  <p className="text-textPrimary mt-0.5">{selectedTransfer.remarks || '—'}</p>
                </div>
              </div>
            </div>

            {/* History Trail */}
            {selectedTransfer.historyEvents && selectedTransfer.historyEvents.length > 0 && (
              <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
                <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-xs border-b border-borderBase pb-2">
                  <History className="w-4 h-4" />
                  <span>Asset Movement Audit Trail</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedTransfer.historyEvents.map((evt: any) => (
                    <div key={evt.id} className="flex items-start justify-between text-[11px] p-1.5 rounded bg-bgElevated/60">
                      <div>
                        <span className="font-semibold text-textPrimary font-mono">{evt.action}</span>
                        <p className="text-textSecondary">{evt.remarks || 'State transition'}</p>
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
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: Edit Pending Transfer ────────────────────────────────── */}
      {isEditModalOpen && selectedTransfer && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Pending Transfer — ${selectedTransfer.transferCode}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-textSecondary font-medium mb-1">To Employee Custodian</label>
              <select
                value={editForm.newHolderId}
                onChange={(e) => setEditForm({ ...editForm, newHolderId: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
              >
                <option value="">-- IT STOCK (Deallocate) --</option>
                {options.employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">To Department</label>
                <select
                  value={editForm.newDepartmentId}
                  onChange={(e) => setEditForm({ ...editForm, newDepartmentId: e.target.value })}
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
                <label className="block text-textSecondary font-medium mb-1">To Location</label>
                <select
                  value={editForm.newLocationId}
                  onChange={(e) => setEditForm({ ...editForm, newLocationId: e.target.value })}
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
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Transfer Reason</label>
              <select
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
              >
                {TRANSFER_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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

      {/* ── MODAL 4: Complete Pending Transfer ────────────────────────────── */}
      {isCompleteModalOpen && selectedTransfer && (
        <Modal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          title={`Authorize Transfer — ${selectedTransfer.transferCode}`}
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300">Authorize Asset Relocation</p>
                <p className="text-emerald-200/90 mt-0.5">
                  Confirming will execute this movement in PostgreSQL, update device custody to{' '}
                  <strong className="text-white">{selectedTransfer.newHolderName}</strong>, update the asset inventory location, and synchronize accountability.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" onClick={() => setIsCompleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCompleteSubmit}
                loading={completeLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirm & Complete Transfer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 5: Cancel Pending Transfer ──────────────────────────────── */}
      {isCancelModalOpen && selectedTransfer && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title={`Cancel Transfer Request — ${selectedTransfer.transferCode}`}
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Revoke Pending Movement</p>
                <p className="text-rose-200/90 mt-0.5">
                  This pending movement will be marked as CANCELLED. The device remains with its current custodian without interruption.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Mandatory Cancellation Rationale <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="State reason for cancelling this transfer request..."
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsCancelModalOpen(false)}>
                Keep Pending
              </Button>
              <Button variant="danger" type="submit" loading={cancelLoading}>
                Confirm Cancellation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 6: Reverse Completed Transfer ───────────────────────────── */}
      {isReverseModalOpen && selectedTransfer && (
        <Modal
          isOpen={isReverseModalOpen}
          onClose={() => setIsReverseModalOpen(false)}
          title={`Reverse Movement — ${selectedTransfer.transferCode}`}
        >
          <form onSubmit={handleReverseSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/30 rounded-xl flex items-start gap-2.5 text-indigo-200">
              <RotateCcw className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-300">Controlled Chain-of-Custody Reversal</p>
                <p className="text-indigo-200/90 mt-0.5">
                  Reversing will create a new reverse transfer moving the asset back from{' '}
                  <strong className="text-white">{selectedTransfer.newHolderName}</strong> to{' '}
                  <strong className="text-white">{selectedTransfer.previousHolderName}</strong>. Both movement records are preserved in the permanent chain of custody.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Mandatory Reversal Rationale <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                rows={3}
                placeholder="State why this transfer is being reversed (e.g. Project reassignment cancelled, device sent to wrong site)..."
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsReverseModalOpen(false)}>
                Keep Transfer
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={reverseLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Execute Reversal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
