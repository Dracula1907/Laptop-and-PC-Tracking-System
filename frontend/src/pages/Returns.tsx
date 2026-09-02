import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Undo2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  Edit,
  FileSpreadsheet,
  AlertTriangle,
  Building,
  MapPin,
  User,
  Eye,
  Ban,
  X,
  Filter,
  Check,
  Calendar,
  Laptop,
  ShieldCheck,
  PackageCheck,
  HardDrive,
  Wrench,
  CheckSquare,
  AlertOctagon,
  History,
  Archive,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AssetReturn } from '../types';
import { exportReturnsToExcel } from '../utils/exporters';
import api from '../services/api';

const RETURN_REASONS = [
  'EMPLOYEE EXIT',
  'ROLE CHANGE',
  'DEPARTMENT CHANGE',
  'ASSET REPLACEMENT',
  'UPGRADE',
  'PROJECT COMPLETION',
  'TEMPORARY ALLOCATION END',
  'DAMAGED',
  'REPAIR',
  'ROUTINE RETURN',
  'OTHER',
];

const DAMAGE_CATEGORIES = [
  'SCREEN_CRACK',
  'CASING_DENT',
  'KEYBOARD_SPILL',
  'MOTHERBOARD_FAULT',
  'BATTERY_BULGE',
  'PORT_DAMAGE',
  'OVERHEATING',
  'OTHER',
];

export const Returns: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [returns, setReturns] = useState<AssetReturn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Live PostgreSQL Counters
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    received: 0,
    inspected: 0,
    completed: 0,
    cancelled: 0,
  });

  // Filters from URL Search Params
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>(searchParams.get('assetType') || '');
  const [empFilter, setEmpFilter] = useState<string>(searchParams.get('employeeId') || '');
  const [deptFilter, setDeptFilter] = useState<string>(searchParams.get('departmentId') || '');
  const [locFilter, setLocFilter] = useState<string>(searchParams.get('locationId') || '');
  const [reasonFilter, setReasonFilter] = useState<string>(searchParams.get('reason') || '');
  const [conditionFilter, setConditionFilter] = useState<string>(searchParams.get('condition') || 'ALL');
  const [inspectionFilter, setInspectionFilter] = useState<string>(searchParams.get('inspection') || '');
  const [maintenanceFilter, setMaintenanceFilter] = useState<string>(searchParams.get('maintenance') || '');
  const [dispositionFilter, setDispositionFilter] = useState<string>(searchParams.get('disposition') || '');

  // Sorting
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'returnDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'desc');

  // Options
  const [options, setOptions] = useState<{
    assets: any[];
    employees: any[];
    departments: any[];
    locations: any[];
    users: any[];
  }>({
    assets: [],
    employees: [],
    departments: [],
    locations: [],
    users: [],
  });

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  const [selectedReturn, setSelectedReturn] = useState<AssetReturn | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState<boolean>(false);
  const [receiveLoading, setReceiveLoading] = useState<boolean>(false);

  const [isInspectModalOpen, setIsInspectModalOpen] = useState<boolean>(false);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);
  const [completeLoading, setCompleteLoading] = useState<boolean>(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Forms
  const [createForm, setCreateForm] = useState({
    assetId: '',
    selectedAsset: null as any,
    employeeId: '',
    departmentId: '',
    locationId: '',
    returnDate: new Date().toISOString().slice(0, 10),
    returnReason: 'ROUTINE RETURN',
    conditionAtReturn: 'GOOD',
    accessoriesReturned: true,
    damageReported: false,
    damageCategory: '',
    damageDescription: '',
    missingAccessories: '',
    dataWipeStatus: 'NOT_REQUIRED',
    inspectionRequired: true,
    maintenanceRequired: false,
    disposition: 'AVAILABLE',
    status: 'COMPLETED',
    remarks: '',
  });

  const [receiveForm, setReceiveForm] = useState({
    locationId: '',
    remarks: '',
  });

  const [inspectForm, setInspectForm] = useState({
    conditionAtReturn: 'GOOD',
    inspectionResult: 'PASS',
    damageReported: false,
    damageCategory: '',
    damageDescription: '',
    accessoriesChecklist: {
      charger: 'PRESENT',
      monitor: 'NOT_APPLICABLE',
      keyboard: 'NOT_APPLICABLE',
      mouse: 'NOT_APPLICABLE',
      otherHardware: 'NOT_APPLICABLE',
    },
    missingAccessories: '',
    dataWipeStatus: 'NOT_REQUIRED',
    maintenanceRequired: false,
    disposition: 'AVAILABLE',
    inspectionRemarks: '',
  });

  const [completeForm, setCompleteForm] = useState({
    disposition: 'AVAILABLE',
    maintenanceRequired: false,
    locationId: '',
    conditionAtReturn: 'GOOD',
    remarks: '',
    approvedById: '',
  });

  const [cancelReason, setCancelReason] = useState<string>('');

  const [editForm, setEditForm] = useState({
    returnReason: '',
    locationId: '',
    conditionAtReturn: 'GOOD',
    damageReported: false,
    damageCategory: '',
    damageDescription: '',
    missingAccessories: '',
    dataWipeStatus: 'NOT_REQUIRED',
    maintenanceRequired: false,
    disposition: 'AVAILABLE',
    remarks: '',
    approvedById: '',
  });

  // Fetch real-time PostgreSQL counts
  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/returns/counts');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setCounts(data);
      }
    } catch (err) {
      console.error('Failed to load return counts:', err);
    }
  };

  // Fetch options with current asset state preview
  const fetchOptions = async () => {
    try {
      const res: any = await api.get('/returns/options');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setOptions(data);
      }
    } catch (err) {
      console.error('Failed to load return options:', err);
    }
  };

  // Fetch returns with server pagination, search, and filters
  const fetchReturns = async (page = pagination.page, currentLimit = pagination.limit) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', currentLimit.toString());
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter && statusFilter !== 'ALL') query.set('status', statusFilter);
      if (assetTypeFilter) query.set('assetType', assetTypeFilter);
      if (empFilter) query.set('employeeId', empFilter);
      if (deptFilter) query.set('departmentId', deptFilter);
      if (locFilter) query.set('locationId', locFilter);
      if (reasonFilter) query.set('returnReason', reasonFilter);
      if (conditionFilter && conditionFilter !== 'ALL') query.set('condition', conditionFilter);
      if (inspectionFilter) query.set('inspectionResult', inspectionFilter);
      if (maintenanceFilter) query.set('maintenanceRequired', maintenanceFilter);
      if (dispositionFilter) query.set('disposition', dispositionFilter);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      // Sync URL
      setSearchParams(query, { replace: true });

      const res: any = await api.get(`/returns?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;

      if (isSuccess && data) {
        setReturns(data.returns || data || []);
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
      console.error('Failed to load returns:', err);
      addToast('Failed to load asset returns from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchReturns(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    statusFilter,
    assetTypeFilter,
    empFilter,
    deptFilter,
    locFilter,
    reasonFilter,
    conditionFilter,
    inspectionFilter,
    maintenanceFilter,
    dispositionFilter,
    sortBy,
    sortOrder,
  ]);

  const handlePageChange = (newPage: number) => {
    fetchReturns(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit }));
    fetchReturns(1, newLimit);
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
    setEmpFilter('');
    setDeptFilter('');
    setLocFilter('');
    setReasonFilter('');
    setConditionFilter('ALL');
    setInspectionFilter('');
    setMaintenanceFilter('');
    setDispositionFilter('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter && statusFilter !== 'ALL') count++;
    if (assetTypeFilter) count++;
    if (empFilter) count++;
    if (deptFilter) count++;
    if (locFilter) count++;
    if (reasonFilter) count++;
    if (conditionFilter && conditionFilter !== 'ALL') count++;
    if (inspectionFilter) count++;
    if (maintenanceFilter) count++;
    if (dispositionFilter) count++;
    return count;
  }, [
    search,
    statusFilter,
    assetTypeFilter,
    empFilter,
    deptFilter,
    locFilter,
    reasonFilter,
    conditionFilter,
    inspectionFilter,
    maintenanceFilter,
    dispositionFilter,
  ]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    fetchOptions();
    const firstAsset = options.assets[0];
    setCreateForm({
      assetId: firstAsset?.id || '',
      selectedAsset: firstAsset || null,
      employeeId: firstAsset?.currentHolderId || '',
      departmentId: firstAsset?.departmentId || '',
      locationId: firstAsset?.locationId || '',
      returnDate: new Date().toISOString().slice(0, 10),
      returnReason: 'ROUTINE RETURN',
      conditionAtReturn: firstAsset?.condition || 'GOOD',
      accessoriesReturned: true,
      damageReported: false,
      damageCategory: '',
      damageDescription: '',
      missingAccessories: '',
      dataWipeStatus: 'NOT_REQUIRED',
      inspectionRequired: true,
      maintenanceRequired: false,
      disposition: 'AVAILABLE',
      status: 'COMPLETED',
      remarks: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleAssetSelectChange = (assetId: string) => {
    const ast = options.assets.find((a: any) => a.id === assetId);
    setCreateForm((prev) => ({
      ...prev,
      assetId,
      selectedAsset: ast || null,
      employeeId: ast?.currentHolderId || '',
      departmentId: ast?.departmentId || '',
      locationId: ast?.locationId || '',
      conditionAtReturn: ast?.condition || prev.conditionAtReturn,
    }));
  };

  // Submit Create Return with Concurrency Conflict Payload
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.assetId) {
      addToast('Please select an asset to return.', 'warning');
      return;
    }

    const ast = createForm.selectedAsset;

    setCreateLoading(true);
    try {
      const res: any = await api.post('/returns', {
        assetId: createForm.assetId,
        employeeId: createForm.employeeId || null,
        departmentId: createForm.departmentId || null,
        locationId: createForm.locationId || null,
        returnDate: createForm.returnDate || undefined,
        returnReason: createForm.returnReason,
        conditionAtReturn: createForm.conditionAtReturn,
        accessoriesReturned: createForm.accessoriesReturned,
        damageReported: createForm.damageReported,
        damageCategory: createForm.damageCategory || null,
        damageDescription: createForm.damageDescription || null,
        missingAccessories: createForm.missingAccessories || null,
        dataWipeStatus: createForm.dataWipeStatus,
        inspectionRequired: createForm.inspectionRequired,
        maintenanceRequired: createForm.maintenanceRequired,
        disposition: createForm.disposition,
        status: createForm.status,
        remarks: createForm.remarks,
        expectedSourceState: {
          holderId: ast?.currentHolderId || null,
          departmentId: ast?.departmentId || null,
          locationId: ast?.locationId || null,
        },
      });

      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Asset return recorded successfully!', 'success');
        setIsCreateModalOpen(false);
        fetchReturns(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to record return.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error processing return.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Details Modal
  const handleOpenDetailModal = async (ret: AssetReturn) => {
    setSelectedReturn(ret);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res: any = await api.get(`/returns/${ret.id}`);
      if (res?.success && res.data) {
        setSelectedReturn(res.data);
      }
    } catch (err) {
      console.error('Error loading details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Receive Modal (PENDING -> RECEIVED)
  const handleOpenReceiveModal = (ret: AssetReturn) => {
    setSelectedReturn(ret);
    setReceiveForm({
      locationId: ret.locationId || '',
      remarks: '',
    });
    setIsReceiveModalOpen(true);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setReceiveLoading(true);
    try {
      const res: any = await api.post(`/returns/${selectedReturn.id}/receive`, receiveForm);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Asset marked as received at facility.', 'success');
        setIsReceiveModalOpen(false);
        fetchReturns(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to receive asset.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error receiving return.', 'error');
    } finally {
      setReceiveLoading(false);
    }
  };

  // Open Inspect Modal (RECEIVED -> INSPECTED)
  const handleOpenInspectModal = (ret: AssetReturn) => {
    setSelectedReturn(ret);
    setInspectForm({
      conditionAtReturn: (ret.conditionAtReturn as any) || 'GOOD',
      inspectionResult: ret.inspectionResult || 'PASS',
      damageReported: ret.damageReported || false,
      damageCategory: ret.damageCategory || '',
      damageDescription: ret.damageDescription || '',
      accessoriesChecklist: ret.accessoriesChecklist || {
        charger: ret.accessoriesReturned ? 'PRESENT' : 'MISSING',
        monitor: 'NOT_APPLICABLE',
        keyboard: 'NOT_APPLICABLE',
        mouse: 'NOT_APPLICABLE',
        otherHardware: 'NOT_APPLICABLE',
      },
      missingAccessories: ret.missingAccessories || '',
      dataWipeStatus: ret.dataWipeStatus || 'NOT_REQUIRED',
      maintenanceRequired: ret.maintenanceRequired || false,
      disposition: ret.disposition || 'AVAILABLE',
      inspectionRemarks: ret.inspectionRemarks || '',
    });
    setIsInspectModalOpen(true);
  };

  const handleInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setInspectLoading(true);
    try {
      const res: any = await api.post(`/returns/${selectedReturn.id}/inspect`, inspectForm);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Physical diagnostic inspection recorded!', 'success');
        setIsInspectModalOpen(false);
        fetchReturns(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to record inspection.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error recording inspection.', 'error');
    } finally {
      setInspectLoading(false);
    }
  };

  // Open Complete Modal (INSPECTED -> COMPLETED)
  const handleOpenCompleteModal = (ret: AssetReturn) => {
    setSelectedReturn(ret);
    setCompleteForm({
      disposition: ret.disposition || (ret.maintenanceRequired ? 'MAINTENANCE' : 'AVAILABLE'),
      maintenanceRequired: ret.maintenanceRequired || false,
      locationId: ret.locationId || '',
      conditionAtReturn: (ret.conditionAtReturn as any) || 'GOOD',
      remarks: '',
      approvedById: options.users[0]?.id || '',
    });
    setIsCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setCompleteLoading(true);
    try {
      const res: any = await api.post(`/returns/${selectedReturn.id}/complete`, completeForm);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Asset return finalized! Custody and stock synchronized.', 'success');
        setIsCompleteModalOpen(false);
        fetchReturns(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to complete return.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error completing return.', 'error');
    } finally {
      setCompleteLoading(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (ret: AssetReturn) => {
    setSelectedReturn(ret);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn || !cancelReason.trim()) {
      addToast('Mandatory cancellation rationale is required.', 'warning');
      return;
    }

    setCancelLoading(true);
    try {
      const res: any = await api.post(`/returns/${selectedReturn.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Return request cancelled.', 'success');
        setIsCancelModalOpen(false);
        fetchReturns(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to cancel return.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error cancelling return.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (ret: AssetReturn) => {
    setSelectedReturn(ret);
    setEditForm({
      returnReason: ret.returnReason || '',
      locationId: ret.locationId || '',
      conditionAtReturn: (ret.conditionAtReturn as any) || 'GOOD',
      damageReported: ret.damageReported || false,
      damageCategory: ret.damageCategory || '',
      damageDescription: ret.damageDescription || '',
      missingAccessories: ret.missingAccessories || '',
      dataWipeStatus: ret.dataWipeStatus || 'NOT_REQUIRED',
      maintenanceRequired: ret.maintenanceRequired || false,
      disposition: ret.disposition || 'AVAILABLE',
      remarks: ret.remarks || '',
      approvedById: ret.approvedById || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setEditLoading(true);
    try {
      const res: any = await api.put(`/returns/${selectedReturn.id}`, editForm);
      if (res?.success ?? res?.data?.success) {
        addToast('Return record updated successfully.', 'success');
        setIsEditModalOpen(false);
        fetchReturns(pagination.page, pagination.limit);
      } else {
        addToast(res?.message || 'Failed to update return.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error updating return.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Export Excel (21 Columns)
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams();
      query.set('limit', '10000');
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter && statusFilter !== 'ALL') query.set('status', statusFilter);
      if (assetTypeFilter) query.set('assetType', assetTypeFilter);
      if (empFilter) query.set('employeeId', empFilter);
      if (deptFilter) query.set('departmentId', deptFilter);
      if (locFilter) query.set('locationId', locFilter);
      if (reasonFilter) query.set('returnReason', reasonFilter);
      if (conditionFilter && conditionFilter !== 'ALL') query.set('condition', conditionFilter);
      if (inspectionFilter) query.set('inspectionResult', inspectionFilter);
      if (maintenanceFilter) query.set('maintenanceRequired', maintenanceFilter);
      if (dispositionFilter) query.set('disposition', dispositionFilter);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      const res: any = await api.get(`/returns?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      const exportList = data?.returns || [];

      if (exportList.length === 0) {
        addToast('No return records match active filters to export.', 'warning');
        return;
      }

      exportReturnsToExcel(exportList);
      addToast(`Exported ${exportList.length} return records to Excel (.xlsx) successfully.`, 'success');
    } catch (err: any) {
      console.error('Export failed:', err);
      addToast('Failed to export returns to Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Asset Returns & Recovery"
        subtitle="End-to-end equipment handover, physical diagnostics, accessories checklist, and stock reallocation governance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              loading={exporting}
              onClick={handleExportExcel}
              title="Export all matching returns to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Export Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() => { fetchReturns(); fetchCounts(); }}
              title="Refresh return records from database"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {hasPermission('RETURN_CREATE') && (
              <Button
                variant="primary"
                onClick={handleOpenCreateModal}
                icon={<Plus className="w-4 h-4" />}
                className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-md"
              >
                New Return
              </Button>
            )}
          </div>
        }
      />

      {/* Dynamic PostgreSQL Summary Cards (6 Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Card 1: All */}
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'ALL' ? 'border-brandPrimary ring-1 ring-brandPrimary/40' : 'border-borderBase hover:border-brandPrimary/40'
          }`}
        >
          <div className="flex items-center justify-between text-textSecondary text-[11px]">
            <span>All Returns</span>
            <Undo2 className="w-3.5 h-3.5 text-brandPrimary" />
          </div>
          <p className="text-xl font-bold font-mono text-textPrimary mt-1">{counts.all}</p>
          <span className="text-[10px] text-textSecondary">Total return pool</span>
        </div>

        {/* Card 2: Pending */}
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'PENDING' ? 'border-amber-500 ring-1 ring-amber-500/40' : 'border-borderBase hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-[11px]">
            <span>Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">{counts.pending}</p>
          <span className="text-[10px] text-textSecondary">Awaiting handover</span>
        </div>

        {/* Card 3: Received */}
        <div
          onClick={() => setStatusFilter('RECEIVED')}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'RECEIVED' ? 'border-cyan-500 ring-1 ring-cyan-500/40' : 'border-borderBase hover:border-cyan-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-cyan-400 text-[11px]">
            <span>Received</span>
            <PackageCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-xl font-bold font-mono text-cyan-400 mt-1">{counts.received}</p>
          <span className="text-[10px] text-textSecondary">Physical receipt done</span>
        </div>

        {/* Card 4: Inspected */}
        <div
          onClick={() => setStatusFilter('INSPECTED')}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'INSPECTED' ? 'border-indigo-500 ring-1 ring-indigo-500/40' : 'border-borderBase hover:border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-400 text-[11px]">
            <span>Inspected</span>
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-xl font-bold font-mono text-indigo-400 mt-1">{counts.inspected}</p>
          <span className="text-[10px] text-textSecondary">Diagnostics completed</span>
        </div>

        {/* Card 5: Completed */}
        <div
          onClick={() => setStatusFilter('COMPLETED')}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'COMPLETED' ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-borderBase hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-[11px]">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{counts.completed}</p>
          <span className="text-[10px] text-textSecondary">Restocked / Repaired</span>
        </div>

        {/* Card 6: Cancelled */}
        <div
          onClick={() => setStatusFilter('CANCELLED')}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'CANCELLED' ? 'border-rose-500 ring-1 ring-rose-500/40' : 'border-borderBase hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 text-[11px]">
            <span>Cancelled</span>
            <Ban className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-xl font-bold font-mono text-rose-400 mt-1">{counts.cancelled}</p>
          <span className="text-[10px] text-textSecondary">Revoked requests</span>
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
              placeholder="Search Return ID, Asset, Employee, Serial, Reason..."
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'PENDING', label: `Pending (${counts.pending})` },
              { value: 'RECEIVED', label: `Received (${counts.received})` },
              { value: 'INSPECTED', label: `Inspected (${counts.inspected})` },
              { value: 'COMPLETED', label: `Completed (${counts.completed})` },
              { value: 'CANCELLED', label: `Cancelled (${counts.cancelled})` },
            ]}
          />

          {/* Condition Filter */}
          <Select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Conditions' },
              { value: 'NEW', label: 'NEW' },
              { value: 'EXCELLENT', label: 'EXCELLENT' },
              { value: 'GOOD', label: 'GOOD' },
              { value: 'FAIR', label: 'FAIR' },
              { value: 'DAMAGED', label: 'DAMAGED' },
            ]}
          />

          {/* Reason Filter */}
          <Select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            options={[
              { value: '', label: 'All Return Reasons' },
              ...RETURN_REASONS.map((r) => ({ value: r, label: r })),
            ]}
          />

          {/* Disposition Filter */}
          <Select
            value={dispositionFilter}
            onChange={(e) => setDispositionFilter(e.target.value)}
            options={[
              { value: '', label: 'All Dispositions' },
              { value: 'AVAILABLE', label: 'AVAILABLE' },
              { value: 'MAINTENANCE', label: 'MAINTENANCE' },
              { value: 'REASSIGNABLE', label: 'REASSIGNABLE' },
              { value: 'RETIRED', label: 'RETIRED' },
              { value: 'PENDING REVIEW', label: 'PENDING REVIEW' },
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
              <span className="text-textSecondary/60 italic text-[11px]">None (Showing all return records)</span>
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

            {conditionFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-[11px]">
                Condition: {conditionFilter}
                <button type="button" onClick={() => setConditionFilter('ALL')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {reasonFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px]">
                Reason: {reasonFilter}
                <button type="button" onClick={() => setReasonFilter('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dispositionFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/50 border border-purple-500/30 text-purple-300 text-[11px]">
                Disposition: {dispositionFilter}
                <button type="button" onClick={() => setDispositionFilter('')} className="hover:text-white">
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
            Total Returns: <strong className="text-textPrimary font-mono">{pagination.total}</strong>
          </div>
        </div>
      </div>

      {/* 15 Standard Columns Table with Internal Horizontal Scrolling */}
      <div className="relative">
        <div className="w-full overflow-x-auto rounded-xl border border-borderBase shadow-card">
          <table className="w-full text-left border-collapse text-sm min-w-[1450px]">
            <thead>
              <tr className="bg-surfaceElevated/80 border-b border-borderBase text-xs font-semibold text-textSecondary uppercase tracking-wider select-none font-mono">
                <th
                  onClick={() => handleSort('returnCode')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Return ID</span>
                    {sortBy === 'returnCode' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
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
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[150px]">Asset Name</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[140px]">Employee</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[130px]">Dept / Area</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[110px]">Return Location</th>
                <th
                  onClick={() => handleSort('returnDate')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Return Date</span>
                    {sortBy === 'returnDate' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[140px]">Reason</th>
                <th
                  onClick={() => handleSort('condition')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Condition</span>
                    {sortBy === 'condition' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[110px]">Inspection</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[100px]">Maintenance</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[110px]">Disposition</th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortBy === 'status' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[100px]">Received By</th>
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
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-textSecondary">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Undo2 className="w-8 h-8 text-zinc-600" />
                      <p className="font-semibold text-textPrimary text-sm">No asset returns found</p>
                      <p className="text-xs text-textSecondary max-w-sm">
                        No equipment return records match the active search or filters in PostgreSQL database.
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
                returns.map((item) => {
                  const isComp = item.status === 'COMPLETED';
                  const isPend = item.status === 'PENDING';
                  const isRec = item.status === 'RECEIVED';
                  const isInsp = item.status === 'INSPECTED';
                  const isCanc = item.status === 'CANCELLED';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetailModal(item)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
                    >
                      {/* Return Code */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono font-bold text-brandPrimary">
                        {item.returnCode}
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

                      {/* Employee */}
                      <td className="px-3.5 py-3">
                        <span className="text-textPrimary font-medium">{item.employeeName}</span>
                        {item.employeeCode && (
                          <span className="text-[10px] text-textSecondary font-mono block">
                            {item.employeeCode}
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-3.5 py-3 text-textSecondary whitespace-nowrap">
                        {item.departmentName}
                      </td>

                      {/* Return Location */}
                      <td className="px-3.5 py-3 text-cyan-400 font-mono whitespace-nowrap">
                        {item.locationName}
                      </td>

                      {/* Return Date */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-textSecondary">
                        {item.returnDate ? new Date(item.returnDate).toISOString().slice(0, 10) : '—'}
                      </td>

                      {/* Reason */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-textSecondary font-mono text-[11px]">
                        {item.returnReason}
                      </td>

                      {/* Condition */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            item.conditionAtReturn === 'EXCELLENT' || item.conditionAtReturn === 'NEW'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                              : item.conditionAtReturn === 'GOOD'
                              ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20'
                              : item.conditionAtReturn === 'FAIR'
                              ? 'bg-amber-950/40 text-amber-400 border-amber-500/20'
                              : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {item.conditionAtReturn}
                        </span>
                      </td>

                      {/* Inspection */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            item.inspectionResult === 'PASS'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                              : item.inspectionResult === 'PASS_WITH_ISSUES' || item.inspectionResult === 'PASS WITH ISSUES'
                              ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                              : item.inspectionResult === 'FAIL'
                              ? 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {item.inspectionResult || 'PENDING'}
                        </span>
                      </td>

                      {/* Maintenance */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-[11px]">
                        {item.maintenanceRequired ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            REQUIRED
                          </span>
                        ) : (
                          <span className="text-slate-500">NO</span>
                        )}
                      </td>

                      {/* Disposition */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            item.disposition === 'AVAILABLE'
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20'
                              : item.disposition === 'MAINTENANCE'
                              ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                              : item.disposition === 'RETIRED'
                              ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              : 'bg-indigo-950/40 text-indigo-300 border-indigo-500/20'
                          }`}
                        >
                          {item.disposition || 'AVAILABLE'}
                        </span>
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
                        ) : isRec ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 inline-flex items-center gap-1">
                            <PackageCheck className="w-3 h-3" />
                            RECEIVED
                          </span>
                        ) : isInsp ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950/40 text-indigo-400 border border-indigo-500/30 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            INSPECTED
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

                      {/* Received By */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-textSecondary font-mono text-[11px]">
                        {item.receivedByName || 'admin'}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-right font-sans" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetailModal(item)}
                            title="View Return Audit Details"
                            className="p-1.5 hover:text-brandPrimary hover:bg-slate-800"
                            icon={<Eye className="w-4 h-4" />}
                          />
                          {isPend && hasPermission('RETURN_CREATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReceiveModal(item)}
                              title="Mark Physically Received"
                              className="p-1.5 text-cyan-400 hover:bg-cyan-950/40"
                              icon={<PackageCheck className="w-4 h-4" />}
                            />
                          )}
                          {(isRec || isPend) && hasPermission('RETURN_CREATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenInspectModal(item)}
                              title="Perform Physical Diagnostics / Inspection"
                              className="p-1.5 text-indigo-400 hover:bg-indigo-950/40"
                              icon={<CheckSquare className="w-4 h-4" />}
                            />
                          )}
                          {(isInsp || isRec) && hasPermission('RETURN_CREATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCompleteModal(item)}
                              title="Complete Return & Update Stock"
                              className="p-1.5 text-emerald-400 hover:bg-emerald-950/40"
                              icon={<CheckCircle2 className="w-4 h-4" />}
                            />
                          )}
                          {!isComp && !isCanc && hasPermission('RETURN_UPDATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Return Information"
                              className="p-1.5 hover:text-amber-400 hover:bg-slate-800"
                              icon={<Edit className="w-4 h-4" />}
                            />
                          )}
                          {!isComp && !isCanc && hasPermission('RETURN_CREATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCancelModal(item)}
                              title="Cancel Return Request"
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

      {/* ── MODAL 1: Create Return (With Live CURRENT ASSET STATE Preview) ── */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="New Asset Return & Equipment Handover"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
            {/* Step 1: Select Asset */}
            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Select Hardware Device Being Returned <span className="text-rose-400">*</span>
              </label>
              <select
                value={createForm.assetId}
                onChange={(e) => handleAssetSelectChange(e.target.value)}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                required
              >
                <option value="">-- Choose Asset --</option>
                {options.assets.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.companyAssetId || a.assetCode} — {a.assetName || a.model} | Custodian: {a.currentHolder?.fullName || 'IT STOCK'}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: CURRENT ASSET STATE Preview */}
            {createForm.selectedAsset && (
              <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-borderBase text-[11px]">
                  <span className="font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                    Current Asset State
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                    {createForm.selectedAsset.allocationStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-textSecondary block text-[10px] font-mono">Current Holder</span>
                    <strong className="text-textPrimary">
                      {createForm.selectedAsset.currentHolder?.fullName || 'IT STOCK (No Active Custodian)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-textSecondary block text-[10px] font-mono">Department</span>
                    <span className="text-textPrimary">{createForm.selectedAsset.department?.name || 'IT STOCK'}</span>
                  </div>
                  <div>
                    <span className="text-textSecondary block text-[10px] font-mono">Location</span>
                    <span className="font-mono text-cyan-400">{createForm.selectedAsset.locationRel?.name || createForm.selectedAsset.location || 'HQ'}</span>
                  </div>
                  <div>
                    <span className="text-textSecondary block text-[10px] font-mono">Condition</span>
                    <span className="font-mono text-textPrimary">{createForm.selectedAsset.condition || 'GOOD'}</span>
                  </div>
                </div>

                {createForm.selectedAsset.assignments && createForm.selectedAsset.assignments.length > 0 ? (
                  <div className="pt-2 border-t border-borderBase/60 text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Active Assignment detected: <strong>{createForm.selectedAsset.assignments[0].assignmentCode}</strong> (Assigned: {new Date(createForm.selectedAsset.assignments[0].assignedAt).toLocaleDateString()}). It will be automatically closed upon return.
                    </span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-borderBase/60 text-[11px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Notice: No active individual assignment found for this device. Return will check it back into central stock.</span>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Return Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Return Reason</label>
                <select
                  value={createForm.returnReason}
                  onChange={(e) => setCreateForm({ ...createForm, returnReason: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Return Date</label>
                <input
                  type="date"
                  value={createForm.returnDate}
                  onChange={(e) => setCreateForm({ ...createForm, returnDate: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                />
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Return Destination Location</label>
                <select
                  value={createForm.locationId}
                  onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="">-- Central IT Stock / Depot --</option>
                  {options.locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 4: Condition & Diagnostic Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Physical Condition at Return</label>
                <select
                  value={createForm.conditionAtReturn}
                  onChange={(e) => setCreateForm({ ...createForm, conditionAtReturn: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="EXCELLENT">EXCELLENT (Like New)</option>
                  <option value="GOOD">GOOD (Standard Operational)</option>
                  <option value="FAIR">FAIR (Noticeable Cosmetic Wear)</option>
                  <option value="DAMAGED">DAMAGED (Hardware Fault / Crack)</option>
                  <option value="CRITICAL">CRITICAL / SEVERELY DAMAGED</option>
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Workflow Initiation Mode</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="COMPLETED">Immediate Complete Return (Device Received & Stocked)</option>
                  <option value="PENDING">Initiate Handover Request (PENDING Physical Receipt)</option>
                </select>
              </div>
            </div>

            {/* Conditional Damage Assessment */}
            {(createForm.conditionAtReturn === 'DAMAGED' || createForm.conditionAtReturn === 'CRITICAL' || createForm.damageReported) && (
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs border-b border-rose-500/20 pb-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  <span>Damage Diagnostic Assessment</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-textSecondary font-medium mb-1">Damage Category</label>
                    <select
                      value={createForm.damageCategory}
                      onChange={(e) => setCreateForm({ ...createForm, damageCategory: e.target.value })}
                      className="w-full bg-bgBase border border-borderBase rounded px-2.5 py-1.5 text-textPrimary focus:outline-none focus:border-rose-500 font-mono"
                    >
                      <option value="">-- Choose Category --</option>
                      {DAMAGE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-textSecondary font-medium mb-1">Flag for Maintenance</label>
                    <div className="flex items-center gap-3 pt-1.5">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createForm.maintenanceRequired}
                          onChange={(e) => setCreateForm({ ...createForm, maintenanceRequired: e.target.checked })}
                          className="rounded text-brandPrimary"
                        />
                        <span className="text-textPrimary font-medium">Create Maintenance Record</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-textSecondary font-medium mb-1">Damage Description</label>
                  <input
                    type="text"
                    value={createForm.damageDescription}
                    onChange={(e) => setCreateForm({ ...createForm, damageDescription: e.target.value })}
                    placeholder="e.g. Cracked hinge, damaged trackpad, display flicker"
                    className="w-full bg-bgBase border border-borderBase rounded px-2.5 py-1.5 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-textSecondary font-medium mb-1">Handover Remarks</label>
              <textarea
                value={createForm.remarks}
                onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                rows={2}
                placeholder="e.g. Returned with original charger, verified physical serial number"
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
                Confirm & Process Return
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 2: Receive Return (PENDING -> RECEIVED) ─────────────────── */}
      {isReceiveModalOpen && selectedReturn && (
        <Modal
          isOpen={isReceiveModalOpen}
          onClose={() => setIsReceiveModalOpen(false)}
          title={`Mark Equipment Received — ${selectedReturn.returnCode}`}
        >
          <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-start gap-2.5 text-cyan-200">
              <PackageCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-cyan-300">Confirm Physical Asset Receipt</p>
                <p className="text-cyan-200/90 mt-0.5">
                  Confirm that device <strong className="text-white">{selectedReturn.assetCode}</strong> ({selectedReturn.assetName}) has been physically surrendered by <strong className="text-white">{selectedReturn.employeeName}</strong> at the depot.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Depot / Receiving Facility Location</label>
              <select
                value={receiveForm.locationId}
                onChange={(e) => setReceiveForm({ ...receiveForm, locationId: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="">-- Central IT Stock / Same Location --</option>
                {options.locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Receipt Notes</label>
              <textarea
                value={receiveForm.remarks}
                onChange={(e) => setReceiveForm({ ...receiveForm, remarks: e.target.value })}
                rows={2}
                placeholder="e.g. Received in person at IT helpdesk counter"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsReceiveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={receiveLoading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Confirm Physical Receipt
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 3: Inspect Return (Diagnostic & Checklist) ──────────────── */}
      {isInspectModalOpen && selectedReturn && (
        <Modal
          isOpen={isInspectModalOpen}
          onClose={() => setIsInspectModalOpen(false)}
          title={`Physical Diagnostics & Inspection — ${selectedReturn.returnCode}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleInspectSubmit} className="space-y-4 text-xs font-sans">
            {/* Top diagnostic alert */}
            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between text-indigo-300">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Diagnostic Evaluation for {selectedReturn.assetCode} ({selectedReturn.assetName})
              </span>
              <span className="text-[10px] font-mono text-textSecondary">Inspector: Active Admin</span>
            </div>

            {/* Accessories Checklist (Section 12) */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2.5">
              <span className="text-[10px] font-mono font-bold text-slate-300 uppercase block border-b border-borderBase pb-1">
                Accessories Verification Checklist
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-textSecondary font-medium mb-0.5">Charger / Power Adapter</label>
                  <select
                    value={inspectForm.accessoriesChecklist.charger}
                    onChange={(e) =>
                      setInspectForm({
                        ...inspectForm,
                        accessoriesChecklist: { ...inspectForm.accessoriesChecklist, charger: e.target.value },
                      })
                    }
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  >
                    <option value="PRESENT">PRESENT (Intact)</option>
                    <option value="MISSING">MISSING</option>
                    <option value="DAMAGED">DAMAGED</option>
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-textSecondary font-medium mb-0.5">Keyboard</label>
                  <select
                    value={inspectForm.accessoriesChecklist.keyboard}
                    onChange={(e) =>
                      setInspectForm({
                        ...inspectForm,
                        accessoriesChecklist: { ...inspectForm.accessoriesChecklist, keyboard: e.target.value },
                      })
                    }
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  >
                    <option value="NOT_APPLICABLE">NOT APPLICABLE (Built-in / None)</option>
                    <option value="PRESENT">PRESENT</option>
                    <option value="MISSING">MISSING</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-textSecondary font-medium mb-0.5">Mouse / Pointer</label>
                  <select
                    value={inspectForm.accessoriesChecklist.mouse}
                    onChange={(e) =>
                      setInspectForm({
                        ...inspectForm,
                        accessoriesChecklist: { ...inspectForm.accessoriesChecklist, mouse: e.target.value },
                      })
                    }
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  >
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                    <option value="PRESENT">PRESENT</option>
                    <option value="MISSING">MISSING</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-textSecondary font-medium mb-0.5">External Monitor (If bundled)</label>
                  <select
                    value={inspectForm.accessoriesChecklist.monitor}
                    onChange={(e) =>
                      setInspectForm({
                        ...inspectForm,
                        accessoriesChecklist: { ...inspectForm.accessoriesChecklist, monitor: e.target.value },
                      })
                    }
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  >
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                    <option value="PRESENT">PRESENT</option>
                    <option value="MISSING">MISSING</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Condition, Wipe & Inspection Result */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Hardware Condition</label>
                <select
                  value={inspectForm.conditionAtReturn}
                  onChange={(e) => setInspectForm({ ...inspectForm, conditionAtReturn: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="EXCELLENT">EXCELLENT</option>
                  <option value="GOOD">GOOD</option>
                  <option value="FAIR">FAIR</option>
                  <option value="DAMAGED">DAMAGED</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Inspection Result</label>
                <select
                  value={inspectForm.inspectionResult}
                  onChange={(e) => setInspectForm({ ...inspectForm, inspectionResult: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="PASS">PASS (Ready for Stock)</option>
                  <option value="PASS_WITH_ISSUES">PASS WITH ISSUES (Minor wear)</option>
                  <option value="FAIL">FAIL (Defective / Broken)</option>
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Data Wipe Verification</label>
                <select
                  value={inspectForm.dataWipeStatus}
                  onChange={(e) => setInspectForm({ ...inspectForm, dataWipeStatus: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="NOT_REQUIRED">NOT REQUIRED</option>
                  <option value="PENDING">PENDING WIPE</option>
                  <option value="COMPLETED">COMPLETED (Verified Clean)</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
            </div>

            {/* Damage & Maintenance Flag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Recommended Disposition</label>
                <select
                  value={inspectForm.disposition}
                  onChange={(e) => setInspectForm({ ...inspectForm, disposition: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="AVAILABLE">AVAILABLE (Restock to IT Pool)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Send for Servicing)</option>
                  <option value="REASSIGNABLE">REASSIGNABLE (Immediate handover)</option>
                  <option value="RETIRED">RETIRED (Scrap / End of Life)</option>
                  <option value="PENDING REVIEW">PENDING REVIEW</option>
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Maintenance Flag</label>
                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inspectForm.maintenanceRequired}
                      onChange={(e) => setInspectForm({ ...inspectForm, maintenanceRequired: e.target.checked })}
                      className="rounded text-rose-500"
                    />
                    <span className="text-textPrimary font-semibold text-xs">Require Technical Repair / Servicing</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Inspection Diagnostic Remarks</label>
              <textarea
                value={inspectForm.inspectionRemarks}
                onChange={(e) => setInspectForm({ ...inspectForm, inspectionRemarks: e.target.value })}
                rows={2}
                placeholder="Detail battery health, screen condition, storage SMART status, etc."
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsInspectModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={inspectLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Record Diagnostic Inspection
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 4: Complete Return (Finalize & Restock) ──────────────────── */}
      {isCompleteModalOpen && selectedReturn && (
        <Modal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          title={`Finalize Return & Synchronize Stock — ${selectedReturn.returnCode}`}
        >
          <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300">Authorize Return & Reclaim Equipment</p>
                <p className="text-emerald-200/90 mt-0.5">
                  Confirming will finalize the return of <strong className="text-white">{selectedReturn.assetCode}</strong>. The active employee assignment will be permanently closed, the device marked as <strong>NOT ALLOCATED</strong> in IT Stock, and the asset state synchronized across all modules.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Final Disposition</label>
                <select
                  value={completeForm.disposition}
                  onChange={(e) => setCompleteForm({ ...completeForm, disposition: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="AVAILABLE">AVAILABLE (IT Stock)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Repair)</option>
                  <option value="REASSIGNABLE">REASSIGNABLE</option>
                  <option value="RETIRED">RETIRED (Disposed)</option>
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Maintenance Integration</label>
                <div className="pt-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completeForm.maintenanceRequired}
                      onChange={(e) => setCompleteForm({ ...completeForm, maintenanceRequired: e.target.checked })}
                      className="rounded text-brandPrimary"
                    />
                    <span className="text-textPrimary font-medium">Create Maintenance Ticket</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Final Restock Location</label>
              <select
                value={completeForm.locationId}
                onChange={(e) => setCompleteForm({ ...completeForm, locationId: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="">-- Central IT Stock Facility --</option>
                {options.locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Authorizing Approver</label>
              <select
                value={completeForm.approvedById}
                onChange={(e) => setCompleteForm({ ...completeForm, approvedById: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="">-- Direct Authorization (Admin) --</option>
                {options.users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role?.name || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsCompleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={completeLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Finalize Return & Reclaim
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 5: Cancel Return ────────────────────────────────────────── */}
      {isCancelModalOpen && selectedReturn && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title={`Cancel Return Request — ${selectedReturn.returnCode}`}
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Revoke Return Process</p>
                <p className="text-rose-200/90 mt-0.5">
                  This return request will be marked as CANCELLED. The device and active assignment remain unchanged with current custodian <strong className="text-white">{selectedReturn.employeeName}</strong>.
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
                placeholder="State why this return is being cancelled..."
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsCancelModalOpen(false)}>
                Keep Return Active
              </Button>
              <Button variant="danger" type="submit" loading={cancelLoading}>
                Confirm Cancellation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 6: Return Audit Details ─────────────────────────────────── */}
      {isDetailModalOpen && selectedReturn && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Return Audit File — ${selectedReturn.returnCode}`}
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
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                      selectedReturn.status === 'COMPLETED'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                        : selectedReturn.status === 'PENDING'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                        : selectedReturn.status === 'RECEIVED'
                        ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'
                        : selectedReturn.status === 'INSPECTED'
                        ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/30'
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {selectedReturn.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-textSecondary uppercase font-mono block">Return Code</span>
                <span className="text-base font-bold font-mono text-brandPrimary">{selectedReturn.returnCode}</span>
              </div>
            </div>

            {/* Transferred Device Card */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs border-b border-borderBase pb-2">
                <Laptop className="w-4 h-4" />
                <span>Returned Hardware Asset</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Asset ID</span>
                  <span
                    onClick={() => navigate(`/assets/${selectedReturn.assetId}`)}
                    className="font-mono font-bold text-cyan-400 cursor-pointer hover:underline"
                  >
                    {selectedReturn.assetCode}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Device Model</span>
                  <span className="font-semibold text-textPrimary">{selectedReturn.assetName}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Serial Number</span>
                  <span className="font-mono text-textPrimary">{selectedReturn.serialNumber}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Asset Type</span>
                  <span className="font-mono text-textSecondary">{selectedReturn.assetType}</span>
                </div>
              </div>
            </div>

            {/* Custodian & Facility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-bgBase border border-borderBase space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block border-b border-borderBase pb-1">
                  Surrendering Custodian
                </span>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Employee:</span>
                  <span className="text-textPrimary font-semibold">{selectedReturn.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Code:</span>
                  <span className="font-mono text-textSecondary">{selectedReturn.employeeCode || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Department:</span>
                  <span className="text-textPrimary">{selectedReturn.departmentName}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-bgBase border border-borderBase space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block border-b border-borderBase pb-1">
                  Stock Destination
                </span>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Return Location:</span>
                  <span className="font-mono text-cyan-400">{selectedReturn.locationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Final Disposition:</span>
                  <span className="font-mono text-emerald-400 font-bold">{selectedReturn.disposition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Maintenance:</span>
                  <span className="font-mono">{selectedReturn.maintenanceRequired ? 'REQUIRED' : 'NO'}</span>
                </div>
              </div>
            </div>

            {/* Condition, Damage & Accessories Checklist */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs border-b border-borderBase pb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Diagnostics & Accessories Inspection</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Condition</span>
                  <span className="font-mono font-bold text-textPrimary">{selectedReturn.conditionAtReturn}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Inspection</span>
                  <span className="font-mono text-textPrimary">{selectedReturn.inspectionResult || 'PENDING'}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Data Wipe</span>
                  <span className="font-mono text-textPrimary">{selectedReturn.dataWipeStatus}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Damage Flag</span>
                  <span className="font-mono text-textPrimary">{selectedReturn.damageReported ? 'YES' : 'NONE'}</span>
                </div>
              </div>

              {selectedReturn.damageReported && (
                <div className="p-2 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs">
                  <strong>Damage Detail:</strong> {selectedReturn.damageCategory ? `[${selectedReturn.damageCategory}] ` : ''}
                  {selectedReturn.damageDescription}
                </div>
              )}

              {selectedReturn.accessoriesChecklist && (
                <div className="pt-2 border-t border-borderBase/60 text-xs">
                  <span className="text-textSecondary font-medium block mb-1">Accessories Check:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                    <div className="p-1 rounded bg-bgElevated">
                      Charger: <strong className="text-textPrimary">{selectedReturn.accessoriesChecklist.charger || 'PRESENT'}</strong>
                    </div>
                    <div className="p-1 rounded bg-bgElevated">
                      Monitor: <strong className="text-textPrimary">{selectedReturn.accessoriesChecklist.monitor || 'N/A'}</strong>
                    </div>
                    <div className="p-1 rounded bg-bgElevated">
                      Keyboard: <strong className="text-textPrimary">{selectedReturn.accessoriesChecklist.keyboard || 'N/A'}</strong>
                    </div>
                    <div className="p-1 rounded bg-bgElevated">
                      Mouse: <strong className="text-textPrimary">{selectedReturn.accessoriesChecklist.mouse || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Governance & Dates */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Return Date</span>
                  <span className="font-mono text-textPrimary">
                    {selectedReturn.returnDate ? new Date(selectedReturn.returnDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Received By</span>
                  <span className="font-mono text-textPrimary">{selectedReturn.receivedByName || 'admin'}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Inspected By</span>
                  <span className="font-mono text-textPrimary">{selectedReturn.inspectedByName || '—'}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Approved By</span>
                  <span className="font-mono text-textPrimary">{selectedReturn.approvedByName || '—'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-borderBase/60 text-xs">
                <span className="text-textSecondary">Handover Remarks:</span>
                <p className="text-textPrimary mt-0.5">{selectedReturn.remarks || '—'}</p>
              </div>
            </div>

            {/* History Trail */}
            {selectedReturn.historyEvents && selectedReturn.historyEvents.length > 0 && (
              <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
                <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-xs border-b border-borderBase pb-2">
                  <History className="w-4 h-4" />
                  <span>Asset Movement Audit Trail</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedReturn.historyEvents.map((evt: any) => (
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

      {/* ── MODAL 7: Edit Return ──────────────────────────────────────────── */}
      {isEditModalOpen && selectedReturn && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Return Record — ${selectedReturn.returnCode}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Return Reason</label>
              <select
                value={editForm.returnReason}
                onChange={(e) => setEditForm({ ...editForm, returnReason: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Return Location</label>
                <select
                  value={editForm.locationId}
                  onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="">-- Central IT Stock --</option>
                  {options.locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Physical Condition</label>
                <select
                  value={editForm.conditionAtReturn}
                  onChange={(e) => setEditForm({ ...editForm, conditionAtReturn: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="EXCELLENT">EXCELLENT</option>
                  <option value="GOOD">GOOD</option>
                  <option value="FAIR">FAIR</option>
                  <option value="DAMAGED">DAMAGED</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
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
    </div>
  );
};
