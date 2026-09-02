import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Wrench,
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
  CheckSquare,
  AlertOctagon,
  History,
  Archive,
  DollarSign,
  Activity,
  UserCheck,
  ShieldAlert,
  HelpCircle,
  Truck,
  Cpu,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { MaintenanceRecord } from '../types';
import { exportMaintenanceToExcel } from '../utils/exporters';
import api from '../services/api';

const MAINTENANCE_TYPES = [
  'CORRECTIVE',
  'PREVENTIVE',
  'INSPECTION',
  'UPGRADE',
  'REPAIR',
  'DIAGNOSTIC',
];

const COMMON_SERVICE_PROVIDERS = [
  'Internal IT Helpdesk',
  'Dell Authorized Service',
  'Lenovo Premier Support',
  'HP Enterprise Care',
  'Apple Genius Support',
  'Third-Party Workshop',
];

export const Maintenance: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Live PostgreSQL Counters
  const [counts, setCounts] = useState({
    all: 0,
    open: 0,
    assigned: 0,
    inProgress: 0,
    waitingParts: 0,
    waitingVendor: 0,
    completed: 0,
    cancelled: 0,
    critical: 0,
    overdue: 0,
  });

  // Filters from URL Search Params
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'ALL');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('maintenanceType') || '');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>(searchParams.get('assetType') || '');
  const [deptFilter, setDeptFilter] = useState<string>(searchParams.get('departmentId') || '');
  const [locFilter, setLocFilter] = useState<string>(searchParams.get('locationId') || '');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(searchParams.get('isOverdue') === 'true');

  // Sorting
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'reportedAt');
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

  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assignLoading, setAssignLoading] = useState<boolean>(false);

  const [isDiagnoseModalOpen, setIsDiagnoseModalOpen] = useState<boolean>(false);
  const [diagnoseLoading, setDiagnoseLoading] = useState<boolean>(false);

  const [isRepairModalOpen, setIsRepairModalOpen] = useState<boolean>(false);
  const [repairLoading, setRepairLoading] = useState<boolean>(false);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);
  const [completeLoading, setCompleteLoading] = useState<boolean>(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Form States
  const [createForm, setCreateForm] = useState({
    assetId: '',
    selectedAsset: null as any,
    maintenanceType: 'CORRECTIVE',
    issueTitle: '',
    issueDescription: '',
    priority: 'MEDIUM',
    technician: '',
    technicianId: '',
    serviceProvider: 'Internal IT Helpdesk',
    assignedToId: '',
    reportedAt: new Date().toISOString().slice(0, 10),
    expectedCompletionDate: '',
    underWarranty: false,
    warrantyProvider: '',
    warrantyReference: '',
    warrantyClaimNumber: '',
    conditionBefore: 'GOOD',
    laborCost: 0,
    partsCost: 0,
    serviceCost: 0,
    otherCost: 0,
    repairStatus: 'OPEN',
    remarks: '',
  });

  const [assignForm, setAssignForm] = useState({
    technicianType: 'INTERNAL', // INTERNAL | EXTERNAL
    technician: '',
    technicianId: '',
    serviceProvider: 'Internal IT Helpdesk',
    assignedToId: '',
    repairStartDate: new Date().toISOString().slice(0, 10),
    expectedCompletionDate: '',
    remarks: '',
  });

  const [diagnoseForm, setDiagnoseForm] = useState({
    diagnosis: '',
    rootCause: '',
    recommendedAction: '',
    priority: 'MEDIUM',
    conditionBefore: 'GOOD',
    remarks: '',
  });

  const [repairForm, setRepairForm] = useState({
    repairAction: '',
    partsReplaced: '',
    parts: [] as Array<{ partName: string; quantity: number; cost: number; remarks?: string }>,
    laborCost: 0,
    partsCost: 0,
    serviceCost: 0,
    otherCost: 0,
    repairStatus: 'IN_PROGRESS',
    remarks: '',
  });

  const [newPartInput, setNewPartInput] = useState({ partName: '', quantity: 1, cost: 0, remarks: '' });

  const [completeForm, setCompleteForm] = useState({
    resolution: '',
    conditionAfter: 'GOOD',
    finalDisposition: 'AVAILABLE',
    repairEndDate: new Date().toISOString().slice(0, 10),
    laborCost: 0,
    partsCost: 0,
    serviceCost: 0,
    otherCost: 0,
    approvedById: '',
    remarks: '',
  });

  const [cancelReason, setCancelReason] = useState<string>('');

  const [editForm, setEditForm] = useState({
    issueTitle: '',
    issueDescription: '',
    maintenanceType: 'CORRECTIVE',
    priority: 'MEDIUM',
    technician: '',
    serviceProvider: '',
    repairStartDate: '',
    expectedCompletionDate: '',
    repairEndDate: '',
    diagnosis: '',
    repairAction: '',
    laborCost: 0,
    partsCost: 0,
    serviceCost: 0,
    otherCost: 0,
    underWarranty: false,
    warrantyProvider: '',
    remarks: '',
  });

  // Fetch PostgreSQL dynamic counts
  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/maintenance/counts');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setCounts(data);
      }
    } catch (err) {
      console.error('Failed to load maintenance counts:', err);
    }
  };

  // Fetch options with current asset state preview
  const fetchOptions = async () => {
    try {
      const res: any = await api.get('/maintenance/options');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setOptions(data);
      }
    } catch (err) {
      console.error('Failed to load maintenance options:', err);
    }
  };

  // Fetch records with server pagination, search, and combined filters
  const fetchRecords = async (page = pagination.page, currentLimit = pagination.limit) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', currentLimit.toString());
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter && statusFilter !== 'ALL') query.set('status', statusFilter);
      if (priorityFilter && priorityFilter !== 'ALL') query.set('priority', priorityFilter);
      if (typeFilter) query.set('maintenanceType', typeFilter);
      if (assetTypeFilter) query.set('assetType', assetTypeFilter);
      if (deptFilter) query.set('departmentId', deptFilter);
      if (locFilter) query.set('locationId', locFilter);
      if (overdueOnly) query.set('isOverdue', 'true');
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      // Sync URL
      setSearchParams(query, { replace: true });

      const res: any = await api.get(`/maintenance?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;

      if (isSuccess && data) {
        setRecords(data.records || []);
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
      console.error('Failed to load maintenance:', err);
      addToast('Failed to load maintenance records from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchRecords(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    statusFilter,
    priorityFilter,
    typeFilter,
    assetTypeFilter,
    deptFilter,
    locFilter,
    overdueOnly,
    sortBy,
    sortOrder,
  ]);

  const handlePageChange = (newPage: number) => {
    fetchRecords(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit }));
    fetchRecords(1, newLimit);
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
    setPriorityFilter('ALL');
    setTypeFilter('');
    setAssetTypeFilter('');
    setDeptFilter('');
    setLocFilter('');
    setOverdueOnly(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter && statusFilter !== 'ALL') count++;
    if (priorityFilter && priorityFilter !== 'ALL') count++;
    if (typeFilter) count++;
    if (assetTypeFilter) count++;
    if (deptFilter) count++;
    if (locFilter) count++;
    if (overdueOnly) count++;
    return count;
  }, [search, statusFilter, priorityFilter, typeFilter, assetTypeFilter, deptFilter, locFilter, overdueOnly]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    fetchOptions();
    const firstAsset = options.assets[0];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 5);

    setCreateForm({
      assetId: firstAsset?.id || '',
      selectedAsset: firstAsset || null,
      maintenanceType: 'CORRECTIVE',
      issueTitle: '',
      issueDescription: '',
      priority: 'MEDIUM',
      technician: '',
      technicianId: '',
      serviceProvider: 'Internal IT Helpdesk',
      assignedToId: '',
      reportedAt: new Date().toISOString().slice(0, 10),
      expectedCompletionDate: expDate.toISOString().slice(0, 10),
      underWarranty: false,
      warrantyProvider: '',
      warrantyReference: '',
      warrantyClaimNumber: '',
      conditionBefore: firstAsset?.condition || 'GOOD',
      laborCost: 0,
      partsCost: 0,
      serviceCost: 0,
      otherCost: 0,
      repairStatus: 'OPEN',
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
      conditionBefore: ast?.condition || prev.conditionBefore,
    }));
  };

  // Submit Create Ticket with Concurrency Conflict Payload
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.assetId) {
      addToast('Please select an asset requiring service.', 'warning');
      return;
    }
    if (!createForm.issueTitle.trim()) {
      addToast('Issue title is required.', 'warning');
      return;
    }

    const ast = createForm.selectedAsset;

    setCreateLoading(true);
    try {
      const res: any = await api.post('/maintenance', {
        assetId: createForm.assetId,
        maintenanceType: createForm.maintenanceType,
        issueTitle: createForm.issueTitle.trim(),
        issueDescription: createForm.issueDescription.trim() || createForm.issueTitle.trim(),
        priority: createForm.priority,
        technician: createForm.technician || null,
        technicianId: createForm.technicianId || null,
        serviceProvider: createForm.serviceProvider || 'Internal IT Helpdesk',
        assignedToId: createForm.assignedToId || null,
        reportedAt: createForm.reportedAt || undefined,
        expectedCompletionDate: createForm.expectedCompletionDate || undefined,
        underWarranty: createForm.underWarranty,
        warrantyProvider: createForm.warrantyProvider || null,
        warrantyReference: createForm.warrantyReference || null,
        warrantyClaimNumber: createForm.warrantyClaimNumber || null,
        conditionBefore: createForm.conditionBefore,
        laborCost: Number(createForm.laborCost) || 0,
        partsCost: Number(createForm.partsCost) || 0,
        serviceCost: Number(createForm.serviceCost) || 0,
        otherCost: Number(createForm.otherCost) || 0,
        repairStatus: createForm.repairStatus,
        remarks: createForm.remarks || null,
        expectedSourceState: {
          holderId: ast?.currentHolderId || null,
          departmentId: ast?.departmentId || null,
          locationId: ast?.locationId || null,
          status: ast?.status || null,
        },
      });

      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Maintenance ticket created! Asset set to UNDER_REPAIR.', 'success');
        setIsCreateModalOpen(false);
        fetchRecords(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to create maintenance ticket.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error processing maintenance.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Details Modal
  const handleOpenDetailModal = async (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res: any = await api.get(`/maintenance/${record.id}`);
      if (res?.success && res.data) {
        setSelectedRecord(res.data);
      }
    } catch (err) {
      console.error('Error loading details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Assign Technician Modal
  const handleOpenAssignModal = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    const expDate = record.expectedCompletionDate
      ? new Date(record.expectedCompletionDate).toISOString().slice(0, 10)
      : '';
    setAssignForm({
      technicianType: record.technicianId ? 'INTERNAL' : 'EXTERNAL',
      technician: record.technician === '—' ? '' : record.technician || '',
      technicianId: record.technicianId || '',
      serviceProvider: record.serviceProvider || 'Internal IT Helpdesk',
      assignedToId: record.assignedToId || options.users[0]?.id || '',
      repairStartDate: record.repairStartDate ? new Date(record.repairStartDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      expectedCompletionDate: expDate,
      remarks: '',
    });
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setAssignLoading(true);
    try {
      const res: any = await api.post(`/maintenance/${selectedRecord.id}/assign`, assignForm);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Technician / Service Provider assigned successfully.', 'success');
        setIsAssignModalOpen(false);
        fetchRecords(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to assign technician.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error assigning technician.', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  // Open Diagnostic Modal
  const handleOpenDiagnoseModal = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setDiagnoseForm({
      diagnosis: record.diagnosis === '—' ? '' : record.diagnosis || '',
      rootCause: record.rootCause === '—' ? '' : record.rootCause || '',
      recommendedAction: record.recommendedAction === '—' ? '' : record.recommendedAction || '',
      priority: record.priority || 'MEDIUM',
      conditionBefore: record.conditionBefore || 'GOOD',
      remarks: '',
    });
    setIsDiagnoseModalOpen(true);
  };

  const handleDiagnoseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !diagnoseForm.diagnosis.trim()) {
      addToast('Technical diagnosis findings are required.', 'warning');
      return;
    }

    setDiagnoseLoading(true);
    try {
      const res: any = await api.post(`/maintenance/${selectedRecord.id}/diagnose`, diagnoseForm);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Diagnostic assessment logged. Status set to IN_PROGRESS.', 'success');
        setIsDiagnoseModalOpen(false);
        fetchRecords(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to record diagnosis.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error recording diagnosis.', 'error');
    } finally {
      setDiagnoseLoading(false);
    }
  };

  // Open Record Repair & Parts Modal
  const handleOpenRepairModal = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setRepairForm({
      repairAction: record.repairAction === '—' ? '' : record.repairAction || '',
      partsReplaced: record.partsReplaced === '—' ? '' : record.partsReplaced || '',
      parts: record.parts || [],
      laborCost: record.laborCost || 0,
      partsCost: record.partsCost || 0,
      serviceCost: record.serviceCost || 0,
      otherCost: record.otherCost || 0,
      repairStatus: record.repairStatus || 'IN_PROGRESS',
      remarks: '',
    });
    setNewPartInput({ partName: '', quantity: 1, cost: 0, remarks: '' });
    setIsRepairModalOpen(true);
  };

  const handleAddPartToRepair = () => {
    if (!newPartInput.partName.trim()) {
      addToast('Please enter part name.', 'warning');
      return;
    }
    const updatedParts = [...repairForm.parts, { ...newPartInput }];
    const totalPartsCost = updatedParts.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
    setRepairForm((prev) => ({
      ...prev,
      parts: updatedParts,
      partsCost: totalPartsCost,
      partsReplaced: updatedParts.map((p) => `${p.partName} (x${p.quantity})`).join(', '),
    }));
    setNewPartInput({ partName: '', quantity: 1, cost: 0, remarks: '' });
  };

  const handleRemovePartFromRepair = (index: number) => {
    const updatedParts = repairForm.parts.filter((_, i) => i !== index);
    const totalPartsCost = updatedParts.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
    setRepairForm((prev) => ({
      ...prev,
      parts: updatedParts,
      partsCost: totalPartsCost,
      partsReplaced: updatedParts.map((p) => `${p.partName} (x${p.quantity})`).join(', '),
    }));
  };

  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !repairForm.repairAction.trim()) {
      addToast('Repair action description is required.', 'warning');
      return;
    }

    setRepairLoading(true);
    try {
      const res: any = await api.post(`/maintenance/${selectedRecord.id}/repair`, repairForm);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Repair actions and costs updated successfully.', 'success');
        setIsRepairModalOpen(false);
        fetchRecords(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to update repair details.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error updating repair details.', 'error');
    } finally {
      setRepairLoading(false);
    }
  };

  // Open Complete Maintenance Modal
  const handleOpenCompleteModal = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setCompleteForm({
      resolution: record.resolution === '—' ? '' : record.resolution || 'Service completed and tested operational.',
      conditionAfter: record.conditionAfter && record.conditionAfter !== '—' ? record.conditionAfter : 'GOOD',
      finalDisposition: record.finalDisposition || 'AVAILABLE',
      repairEndDate: new Date().toISOString().slice(0, 10),
      laborCost: record.laborCost || 0,
      partsCost: record.partsCost || 0,
      serviceCost: record.serviceCost || 0,
      otherCost: record.otherCost || 0,
      approvedById: options.users[0]?.id || '',
      remarks: '',
    });
    setIsCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !completeForm.resolution.trim()) {
      addToast('Final resolution description is required.', 'warning');
      return;
    }

    setCompleteLoading(true);
    try {
      const res: any = await api.post(`/maintenance/${selectedRecord.id}/complete`, completeForm);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Maintenance finalized! Asset inventory and condition synchronized.', 'success');
        setIsCompleteModalOpen(false);
        fetchRecords(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to complete maintenance.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error completing maintenance.', 'error');
    } finally {
      setCompleteLoading(false);
    }
  };

  // Open Cancel Maintenance Modal
  const handleOpenCancelModal = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !cancelReason.trim()) {
      addToast('Mandatory cancellation rationale is required.', 'warning');
      return;
    }

    setCancelLoading(true);
    try {
      const res: any = await api.post(`/maintenance/${selectedRecord.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || 'Maintenance ticket cancelled and asset restored.', 'success');
        setIsCancelModalOpen(false);
        fetchRecords(pagination.page, pagination.limit);
        fetchCounts();
        fetchOptions();
      } else {
        addToast(res?.message || 'Failed to cancel maintenance.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error cancelling maintenance.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setEditForm({
      issueTitle: record.issueTitle || '',
      issueDescription: record.issueDescription || '',
      maintenanceType: record.maintenanceType || 'CORRECTIVE',
      priority: record.priority || 'MEDIUM',
      technician: record.technician === '—' ? '' : record.technician || '',
      serviceProvider: record.serviceProvider || '',
      repairStartDate: record.repairStartDate ? new Date(record.repairStartDate).toISOString().slice(0, 10) : '',
      expectedCompletionDate: record.expectedCompletionDate ? new Date(record.expectedCompletionDate).toISOString().slice(0, 10) : '',
      repairEndDate: record.repairEndDate ? new Date(record.repairEndDate).toISOString().slice(0, 10) : '',
      diagnosis: record.diagnosis === '—' ? '' : record.diagnosis || '',
      repairAction: record.repairAction === '—' ? '' : record.repairAction || '',
      laborCost: record.laborCost || 0,
      partsCost: record.partsCost || 0,
      serviceCost: record.serviceCost || 0,
      otherCost: record.otherCost || 0,
      underWarranty: record.underWarranty || false,
      warrantyProvider: record.warrantyProvider === '—' ? '' : record.warrantyProvider || '',
      remarks: record.remarks === '—' ? '' : record.remarks || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setEditLoading(true);
    try {
      const res: any = await api.put(`/maintenance/${selectedRecord.id}`, editForm);
      if (res?.success ?? res?.data?.success) {
        addToast('Maintenance record updated successfully.', 'success');
        setIsEditModalOpen(false);
        fetchRecords(pagination.page, pagination.limit);
      } else {
        addToast(res?.message || 'Failed to update maintenance.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error updating maintenance.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Export 36 Columns to Excel (.xlsx)
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams();
      query.set('limit', '10000');
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter && statusFilter !== 'ALL') query.set('status', statusFilter);
      if (priorityFilter && priorityFilter !== 'ALL') query.set('priority', priorityFilter);
      if (typeFilter) query.set('maintenanceType', typeFilter);
      if (assetTypeFilter) query.set('assetType', assetTypeFilter);
      if (deptFilter) query.set('departmentId', deptFilter);
      if (locFilter) query.set('locationId', locFilter);
      if (overdueOnly) query.set('isOverdue', 'true');
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      const res: any = await api.get(`/maintenance?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      const exportList = data?.records || [];

      if (exportList.length === 0) {
        addToast('No maintenance records match active filters to export.', 'warning');
        return;
      }

      exportMaintenanceToExcel(exportList);
      addToast(`Exported ${exportList.length} maintenance records to Excel (.xlsx) successfully.`, 'success');
    } catch (err: any) {
      console.error('Export failed:', err);
      addToast('Failed to export maintenance records to Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Maintenance & Service Management"
        subtitle="End-to-end hardware repair diagnostics, technician assignment, replaced parts tracking, and SLA turnaround governance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              loading={exporting}
              onClick={handleExportExcel}
              title="Export all matching maintenance records to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Export Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() => { fetchRecords(); fetchCounts(); }}
              title="Refresh maintenance records from database"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {hasPermission('MAINTENANCE_CREATE') && (
              <Button
                variant="primary"
                onClick={handleOpenCreateModal}
                icon={<Plus className="w-4 h-4" />}
                className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-md"
              >
                Log Ticket
              </Button>
            )}
          </div>
        }
      />

      {/* Dynamic PostgreSQL Telemetry Cards (7 Tabs + Overdue Alert) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* Card 1: All */}
        <div
          onClick={() => { setStatusFilter('ALL'); setOverdueOnly(false); }}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'ALL' && !overdueOnly ? 'border-brandPrimary ring-1 ring-brandPrimary/40' : 'border-borderBase hover:border-brandPrimary/40'
          }`}
        >
          <div className="flex items-center justify-between text-textSecondary text-[11px]">
            <span>All Tickets</span>
            <Wrench className="w-3.5 h-3.5 text-brandPrimary" />
          </div>
          <p className="text-xl font-bold font-mono text-textPrimary mt-1">{counts.all}</p>
          <span className="text-[10px] text-textSecondary">Total maintenance pool</span>
        </div>

        {/* Card 2: Open */}
        <div
          onClick={() => { setStatusFilter('OPEN'); setOverdueOnly(false); }}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'OPEN' ? 'border-amber-500 ring-1 ring-amber-500/40' : 'border-borderBase hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-[11px]">
            <span>Open</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">{counts.open}</p>
          <span className="text-[10px] text-textSecondary">Awaiting dispatch</span>
        </div>

        {/* Card 3: In Progress */}
        <div
          onClick={() => { setStatusFilter('IN_PROGRESS'); setOverdueOnly(false); }}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'IN_PROGRESS' ? 'border-cyan-500 ring-1 ring-cyan-500/40' : 'border-borderBase hover:border-cyan-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-cyan-400 text-[11px]">
            <span>In Progress</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-xl font-bold font-mono text-cyan-400 mt-1">{counts.inProgress}</p>
          <span className="text-[10px] text-textSecondary">Active servicing</span>
        </div>

        {/* Card 4: Waiting Parts */}
        <div
          onClick={() => { setStatusFilter('WAITING_PARTS'); setOverdueOnly(false); }}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'WAITING_PARTS' ? 'border-orange-500 ring-1 ring-orange-500/40' : 'border-borderBase hover:border-orange-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-orange-400 text-[11px]">
            <span>Waiting Parts</span>
            <Cpu className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <p className="text-xl font-bold font-mono text-orange-400 mt-1">{counts.waitingParts}</p>
          <span className="text-[10px] text-textSecondary">Components pending</span>
        </div>

        {/* Card 5: Waiting Vendor */}
        <div
          onClick={() => { setStatusFilter('WAITING_VENDOR'); setOverdueOnly(false); }}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'WAITING_VENDOR' ? 'border-indigo-500 ring-1 ring-indigo-500/40' : 'border-borderBase hover:border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-400 text-[11px]">
            <span>Waiting Vendor</span>
            <Truck className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-xl font-bold font-mono text-indigo-400 mt-1">{counts.waitingVendor}</p>
          <span className="text-[10px] text-textSecondary">OEM warranty turn</span>
        </div>

        {/* Card 6: Completed */}
        <div
          onClick={() => { setStatusFilter('COMPLETED'); setOverdueOnly(false); }}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            statusFilter === 'COMPLETED' ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-borderBase hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-[11px]">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{counts.completed}</p>
          <span className="text-[10px] text-textSecondary">Repaired & restocked</span>
        </div>

        {/* Card 7: Overdue Alert / SLA */}
        <div
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={`bg-bgElevated border rounded-xl p-3 transition-all cursor-pointer shadow-card ${
            overdueOnly ? 'border-rose-500 ring-1 ring-rose-500/40 bg-rose-950/20' : 'border-borderBase hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 text-[11px]">
            <span>Overdue SLA</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-xl font-bold font-mono text-rose-400 mt-1">{counts.overdue}</p>
          <span className="text-[10px] text-rose-300/80">Exceeded expected date</span>
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
              placeholder="Search Maintenance ID, Asset, Issue, Tech, Diagnosis..."
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'OPEN', label: `Open (${counts.open})` },
              { value: 'ASSIGNED', label: `Assigned (${counts.assigned})` },
              { value: 'IN_PROGRESS', label: `In Progress (${counts.inProgress})` },
              { value: 'WAITING_PARTS', label: `Waiting Parts (${counts.waitingParts})` },
              { value: 'WAITING_VENDOR', label: `Waiting Vendor (${counts.waitingVendor})` },
              { value: 'COMPLETED', label: `Completed (${counts.completed})` },
              { value: 'CANCELLED', label: `Cancelled (${counts.cancelled})` },
            ]}
          />

          {/* Priority Filter */}
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Priorities' },
              { value: 'LOW', label: 'LOW (Neutral)' },
              { value: 'MEDIUM', label: 'MEDIUM (Standard)' },
              { value: 'HIGH', label: 'HIGH (Amber)' },
              { value: 'CRITICAL', label: 'CRITICAL (Crimson)' },
            ]}
          />

          {/* Maintenance Type Filter */}
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Maintenance Types' },
              ...MAINTENANCE_TYPES.map((t) => ({ value: t, label: t })),
            ]}
          />

          {/* Department Filter */}
          <Select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              ...options.departments.map((d: any) => ({ value: d.id, label: d.name })),
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
              <span className="text-textSecondary/60 italic text-[11px]">None (Showing all maintenance tickets)</span>
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px]">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {priorityFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 text-[11px]">
                Priority: {priorityFilter}
                <button type="button" onClick={() => setPriorityFilter('ALL')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {overdueOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500 text-rose-200 text-[11px] font-semibold">
                SLA: Overdue Tickets
                <button type="button" onClick={() => setOverdueOnly(false)} className="hover:text-white">
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
            Total Tickets: <strong className="text-textPrimary font-mono">{pagination.total}</strong>
          </div>
        </div>
      </div>

      {/* 15 Standard Columns Table with Internal Horizontal Scrolling */}
      <div className="relative">
        <div className="w-full overflow-x-auto rounded-xl border border-borderBase shadow-card">
          <table className="w-full text-left border-collapse text-sm min-w-[1550px]">
            <thead>
              <tr className="bg-surfaceElevated/80 border-b border-borderBase text-xs font-semibold text-textSecondary uppercase tracking-wider select-none font-mono">
                <th
                  onClick={() => handleSort('maintenanceCode')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Maintenance ID</span>
                    {sortBy === 'maintenanceCode' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
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
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[140px]">Asset Name</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[100px]">Asset Type</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[160px]">Issue</th>
                <th
                  onClick={() => handleSort('priority')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    {sortBy === 'priority' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('repairStatus')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortBy === 'repairStatus' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[130px]">Technician</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[130px]">Service Provider</th>
                <th
                  onClick={() => handleSort('reportedAt')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Reported Date</span>
                    {sortBy === 'reportedAt' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('expectedCompletionDate')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Expected Date</span>
                    {sortBy === 'expectedCompletionDate' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[110px]">Actual Date</th>
                <th
                  onClick={() => handleSort('repairCost')}
                  className="px-3.5 py-3.5 cursor-pointer hover:text-white whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Cost</span>
                    {sortBy === 'repairCost' && <span className="text-brandPrimary">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[100px]">Condition</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[140px] text-right">Actions</th>
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
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-textSecondary">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Wrench className="w-8 h-8 text-zinc-600" />
                      <p className="font-semibold text-textPrimary text-sm">No maintenance records found</p>
                      <p className="text-xs text-textSecondary max-w-sm">
                        No equipment maintenance or repair records match the active search or filters in PostgreSQL database.
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
                records.map((item) => {
                  const isComp = item.repairStatus === 'COMPLETED';
                  const isOpen = item.repairStatus === 'OPEN' || item.repairStatus === 'REPORTED';
                  const isAssigned = item.repairStatus === 'ASSIGNED' || item.repairStatus === 'APPROVED';
                  const isInProg = item.repairStatus === 'IN_PROGRESS';
                  const isWaitingParts = item.repairStatus === 'WAITING_PARTS' || item.repairStatus === 'WAITING_FOR_PARTS';
                  const isWaitingVendor = item.repairStatus === 'WAITING_VENDOR';
                  const isCanc = item.repairStatus === 'CANCELLED';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetailModal(item)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
                    >
                      {/* Maintenance ID */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono font-bold text-brandPrimary">
                        {item.maintenanceCode}
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
                          {item.serialNumber}
                        </p>
                      </td>

                      {/* Asset Type */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-[11px] text-textSecondary">
                        {item.assetType}
                      </td>

                      {/* Issue */}
                      <td className="px-3.5 py-3">
                        <p className="font-medium text-textPrimary line-clamp-1">{item.issueTitle}</p>
                        <span className="text-[10px] font-mono text-textSecondary/80 block mt-0.5">
                          {item.maintenanceType}
                        </span>
                      </td>

                      {/* Priority (Section 4: semantic visual badges) */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            item.priority === 'CRITICAL'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 animate-pulse'
                              : item.priority === 'HIGH'
                              ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                              : item.priority === 'MEDIUM'
                              ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {isComp ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                            COMPLETED
                          </span>
                        ) : isOpen ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/40 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            OPEN
                          </span>
                        ) : isAssigned ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/40 text-purple-400 border border-purple-500/30 inline-flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            ASSIGNED
                          </span>
                        ) : isInProg ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 inline-flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            IN PROGRESS
                          </span>
                        ) : isWaitingParts ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-orange-950/40 text-orange-400 border border-orange-500/30 inline-flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            WAITING PARTS
                          </span>
                        ) : isWaitingVendor ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-950/40 text-indigo-400 border border-indigo-500/30 inline-flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            WAITING VENDOR
                          </span>
                        ) : isCanc ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-950/40 text-rose-400 border border-rose-500/20">
                            CANCELLED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-400">
                            {item.repairStatus}
                          </span>
                        )}
                      </td>

                      {/* Technician */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-textSecondary font-mono text-[11px]">
                        {item.technician}
                      </td>

                      {/* Service Provider */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-textSecondary text-[11px]">
                        {item.serviceProvider}
                      </td>

                      {/* Reported Date */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-textSecondary">
                        <span>{item.reportedAt ? new Date(item.reportedAt).toISOString().slice(0, 10) : '—'}</span>
                        {item.daysOpen !== undefined && !isComp && !isCanc && (
                          <span className="text-[10px] text-textSecondary/60 block">{item.daysOpen}d open</span>
                        )}
                      </td>

                      {/* Expected Completion / Overdue SLA */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-xs">
                        {item.expectedCompletionDate ? (
                          <div>
                            <span>{new Date(item.expectedCompletionDate).toISOString().slice(0, 10)}</span>
                            {item.isOverdue && (
                              <span className="text-[10px] text-rose-400 font-bold block animate-pulse">
                                OVERDUE {item.overdueDays}d
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      {/* Actual Completion */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-textSecondary">
                        {item.repairEndDate ? new Date(item.repairEndDate).toISOString().slice(0, 10) : '—'}
                      </td>

                      {/* Cost */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono font-bold text-emerald-400">
                        ₹{(item.repairCost || 0).toLocaleString()}
                      </td>

                      {/* Condition */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-mono text-textSecondary">
                          {item.conditionBefore} {item.conditionAfter && item.conditionAfter !== '—' ? `→ ${item.conditionAfter}` : ''}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-right font-sans" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetailModal(item)}
                            title="View Maintenance Audit Breakdown"
                            className="p-1.5 hover:text-brandPrimary hover:bg-slate-800"
                            icon={<Eye className="w-4 h-4" />}
                          />
                          {(isOpen || isAssigned) && hasPermission('MAINTENANCE_UPDATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAssignModal(item)}
                              title="Assign Technician / Service Provider"
                              className="p-1.5 text-purple-400 hover:bg-purple-950/40"
                              icon={<UserCheck className="w-4 h-4" />}
                            />
                          )}
                          {!isComp && !isCanc && hasPermission('MAINTENANCE_UPDATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDiagnoseModal(item)}
                              title="Update Technical Diagnosis & Root Cause"
                              className="p-1.5 text-cyan-400 hover:bg-cyan-950/40"
                              icon={<Activity className="w-4 h-4" />}
                            />
                          )}
                          {!isComp && !isCanc && hasPermission('MAINTENANCE_UPDATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenRepairModal(item)}
                              title="Record Repair Actions, Replaced Parts & Costs"
                              className="p-1.5 text-orange-400 hover:bg-orange-950/40"
                              icon={<Cpu className="w-4 h-4" />}
                            />
                          )}
                          {!isComp && !isCanc && hasPermission('MAINTENANCE_UPDATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCompleteModal(item)}
                              title="Complete Maintenance & Synchronize Asset Stock"
                              className="p-1.5 text-emerald-400 hover:bg-emerald-950/40"
                              icon={<CheckCircle2 className="w-4 h-4" />}
                            />
                          )}
                          {!isComp && !isCanc && hasPermission('MAINTENANCE_UPDATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Ticket Parameters"
                              className="p-1.5 hover:text-amber-400 hover:bg-slate-800"
                              icon={<Edit className="w-4 h-4" />}
                            />
                          )}
                          {!isComp && !isCanc && hasPermission('MAINTENANCE_UPDATE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCancelModal(item)}
                              title="Cancel Ticket with Rationale"
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

      {/* ── MODAL 1: Create Ticket (With CURRENT ASSET STATE Preview) ────────── */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Log New Maintenance / Service Ticket"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
            {/* Step 1: Select Asset */}
            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Select Hardware Device Requiring Maintenance <span className="text-rose-400">*</span>
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
                    {a.companyAssetId || a.assetCode} — {a.assetName || a.model} | Current: {a.currentHolder?.fullName || 'IT STOCK'}
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
                    Status: {createForm.selectedAsset.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-textSecondary block text-[10px] font-mono">Current Holder</span>
                    <strong className="text-textPrimary">
                      {createForm.selectedAsset.currentHolder?.fullName || 'IT STOCK (Depot)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-textSecondary block text-[10px] font-mono">Department</span>
                    <span className="text-textPrimary">{createForm.selectedAsset.department?.name || 'IT'}</span>
                  </div>
                  <div>
                    <span className="text-textSecondary block text-[10px] font-mono">Location</span>
                    <span className="font-mono text-cyan-400">
                      {createForm.selectedAsset.locationRel?.name || createForm.selectedAsset.location || 'HQ'}
                    </span>
                  </div>
                  <div>
                    <span className="text-textSecondary block text-[10px] font-mono">Condition</span>
                    <span className="font-mono text-textPrimary">{createForm.selectedAsset.condition || 'GOOD'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-borderBase/60 text-[11px] text-cyan-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span>
                    Accountability Note: When logged, asset status transitions to <strong>UNDER_REPAIR</strong>. Existing assignment custody is safely preserved.
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Issue Information */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Maintenance Type</label>
                <select
                  value={createForm.maintenanceType}
                  onChange={(e) => setCreateForm({ ...createForm, maintenanceType: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  {MAINTENANCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Priority</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="LOW">LOW (Cosmetic / Low urgency)</option>
                  <option value="MEDIUM">MEDIUM (Standard functional)</option>
                  <option value="HIGH">HIGH (Severe disruption)</option>
                  <option value="CRITICAL">CRITICAL (System completely down)</option>
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Target SLA Date</label>
                <input
                  type="date"
                  value={createForm.expectedCompletionDate}
                  onChange={(e) => setCreateForm({ ...createForm, expectedCompletionDate: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Issue Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={createForm.issueTitle}
                onChange={(e) => setCreateForm({ ...createForm, issueTitle: e.target.value })}
                placeholder="e.g. Broken screen hinge, Battery swelling, Motherboard failure"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-brandPrimary"
                required
              />
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Detailed Issue Description</label>
              <textarea
                value={createForm.issueDescription}
                onChange={(e) => setCreateForm({ ...createForm, issueDescription: e.target.value })}
                rows={2}
                placeholder="Describe failure symptoms, diagnostic observations, error messages..."
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-brandPrimary"
              />
            </div>

            {/* Step 4: Technician / Service Provider */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Service Provider / Workshop</label>
                <select
                  value={createForm.serviceProvider}
                  onChange={(e) => setCreateForm({ ...createForm, serviceProvider: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
                >
                  {COMMON_SERVICE_PROVIDERS.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Assigned Internal Technician</label>
                <select
                  value={createForm.technicianId}
                  onChange={(e) => {
                    const emp = options.employees.find((em: any) => em.id === e.target.value);
                    setCreateForm({
                      ...createForm,
                      technicianId: e.target.value,
                      technician: emp?.fullName || createForm.technician,
                    });
                  }}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
                >
                  <option value="">-- External / Helpdesk Pool --</option>
                  {options.employees.map((em: any) => (
                    <option key={em.id} value={em.id}>
                      {em.fullName} ({em.designation || 'Tech'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 5: Warranty Coverage */}
            <div className="p-3 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.underWarranty}
                  onChange={(e) => setCreateForm({ ...createForm, underWarranty: e.target.checked })}
                  className="rounded text-brandPrimary"
                />
                <span className="text-textPrimary font-semibold text-xs">Covered Under Warranty / AMC Contract</span>
              </label>

              {createForm.underWarranty && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-borderBase">
                  <div>
                    <label className="block text-textSecondary font-medium mb-0.5">Warranty Provider</label>
                    <input
                      type="text"
                      value={createForm.warrantyProvider}
                      onChange={(e) => setCreateForm({ ...createForm, warrantyProvider: e.target.value })}
                      placeholder="e.g. Dell ProSupport, AppleCare"
                      className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary"
                    />
                  </div>
                  <div>
                    <label className="block text-textSecondary font-medium mb-0.5">Claim / Case Reference</label>
                    <input
                      type="text"
                      value={createForm.warrantyClaimNumber}
                      onChange={(e) => setCreateForm({ ...createForm, warrantyClaimNumber: e.target.value })}
                      placeholder="e.g. CASE-998242"
                      className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                    />
                  </div>
                </div>
              )}
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
                Log Ticket & Dispatch
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 2: Assign Technician Modal ─────────────────────────────── */}
      {isAssignModalOpen && selectedRecord && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title={`Assign Technician / Service Provider — ${selectedRecord.maintenanceCode}`}
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-start gap-2.5 text-purple-200">
              <UserCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-300">Dispatch Hardware Ticket</p>
                <p className="text-purple-200/90 mt-0.5">
                  Assign service personnel to diagnose device <strong className="text-white">{selectedRecord.assetCode}</strong> ({selectedRecord.assetName}).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Service Provider / Workshop</label>
                <select
                  value={assignForm.serviceProvider}
                  onChange={(e) => setAssignForm({ ...assignForm, serviceProvider: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-purple-500"
                >
                  {COMMON_SERVICE_PROVIDERS.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Assigned Internal Technician</label>
                <select
                  value={assignForm.technicianId}
                  onChange={(e) => {
                    const emp = options.employees.find((em: any) => em.id === e.target.value);
                    setAssignForm({
                      ...assignForm,
                      technicianId: e.target.value,
                      technician: emp?.fullName || assignForm.technician,
                    });
                  }}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="">-- External / Third Party Tech --</option>
                  {options.employees.map((em: any) => (
                    <option key={em.id} value={em.id}>
                      {em.fullName} ({em.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Service Start Date</label>
                <input
                  type="date"
                  value={assignForm.repairStartDate}
                  onChange={(e) => setAssignForm({ ...assignForm, repairStartDate: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono"
                />
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Target SLA Date</label>
                <input
                  type="date"
                  value={assignForm.expectedCompletionDate}
                  onChange={(e) => setAssignForm({ ...assignForm, expectedCompletionDate: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Assignment Dispatch Remarks</label>
              <textarea
                value={assignForm.remarks}
                onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                rows={2}
                placeholder="e.g. Handed over to onsite vendor technician"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={assignLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                Confirm Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 3: Diagnostic Findings Modal ────────────────────────────── */}
      {isDiagnoseModalOpen && selectedRecord && (
        <Modal
          isOpen={isDiagnoseModalOpen}
          onClose={() => setIsDiagnoseModalOpen(false)}
          title={`Technical Diagnostics — ${selectedRecord.maintenanceCode}`}
        >
          <form onSubmit={handleDiagnoseSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Diagnostic Findings <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={diagnoseForm.diagnosis}
                onChange={(e) => setDiagnoseForm({ ...diagnoseForm, diagnosis: e.target.value })}
                rows={2}
                placeholder="Detail technical fault observations, memory test results, bench diagnostic..."
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Root Cause</label>
                <input
                  type="text"
                  value={diagnoseForm.rootCause}
                  onChange={(e) => setDiagnoseForm({ ...diagnoseForm, rootCause: e.target.value })}
                  placeholder="e.g. Liquid spill, thermal throttling, power surge"
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Severity / Priority</label>
                <select
                  value={diagnoseForm.priority}
                  onChange={(e) => setDiagnoseForm({ ...diagnoseForm, priority: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Recommended Action</label>
              <input
                type="text"
                value={diagnoseForm.recommendedAction}
                onChange={(e) => setDiagnoseForm({ ...diagnoseForm, recommendedAction: e.target.value })}
                placeholder="e.g. Replace keyboard bezel assembly, replace SSD"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsDiagnoseModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={diagnoseLoading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Log Diagnostic Findings
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 4: Record Repair Actions & Replaced Parts ────────────────── */}
      {isRepairModalOpen && selectedRecord && (
        <Modal
          isOpen={isRepairModalOpen}
          onClose={() => setIsRepairModalOpen(false)}
          title={`Record Repair Actions & Parts — ${selectedRecord.maintenanceCode}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleRepairSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Repair Actions Performed <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={repairForm.repairAction}
                onChange={(e) => setRepairForm({ ...repairForm, repairAction: e.target.value })}
                rows={2}
                placeholder="e.g. Replaced display panel, applied thermal paste, updated BIOS"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            {/* Replaced Parts Tracker */}
            <div className="p-3 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <span className="text-[10px] font-mono font-bold text-slate-300 uppercase block border-b border-borderBase pb-1">
                Replaced Hardware Components & Parts
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={newPartInput.partName}
                    onChange={(e) => setNewPartInput({ ...newPartInput, partName: e.target.value })}
                    placeholder="Part Name (e.g. 16GB DDR4 RAM)"
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="1"
                    value={newPartInput.quantity}
                    onChange={(e) => setNewPartInput({ ...newPartInput, quantity: Number(e.target.value) || 1 })}
                    placeholder="Qty"
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  />
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={newPartInput.cost}
                    onChange={(e) => setNewPartInput({ ...newPartInput, cost: Number(e.target.value) || 0 })}
                    placeholder="Cost ₹"
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  />
                  <Button type="button" size="sm" onClick={handleAddPartToRepair} className="bg-orange-600 hover:bg-orange-700 text-white shrink-0">
                    Add
                  </Button>
                </div>
              </div>

              {repairForm.parts.length > 0 && (
                <div className="divide-y divide-borderBase/60 border border-borderBase/60 rounded overflow-hidden">
                  {repairForm.parts.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-bgElevated/50 text-[11px]">
                      <div>
                        <strong className="text-textPrimary">{p.partName}</strong> (Qty: {p.quantity})
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-emerald-400">₹{(p.cost * p.quantity).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePartFromRepair(idx)}
                          className="text-rose-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Granular Cost Breakdown (Section 15: Safe Formula) */}
            <div className="p-3 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <span className="text-[10px] font-mono font-bold text-slate-300 uppercase block border-b border-borderBase pb-1">
                Granular Financial Cost Breakdown (INR ₹)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-textSecondary font-medium mb-0.5">Labor Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={repairForm.laborCost}
                    onChange={(e) => setRepairForm({ ...repairForm, laborCost: Number(e.target.value) || 0 })}
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-medium mb-0.5">Parts Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={repairForm.partsCost}
                    onChange={(e) => setRepairForm({ ...repairForm, partsCost: Number(e.target.value) || 0 })}
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-medium mb-0.5">Service Fee</label>
                  <input
                    type="number"
                    min="0"
                    value={repairForm.serviceCost}
                    onChange={(e) => setRepairForm({ ...repairForm, serviceCost: Number(e.target.value) || 0 })}
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-medium mb-0.5">Other Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={repairForm.otherCost}
                    onChange={(e) => setRepairForm({ ...repairForm, otherCost: Number(e.target.value) || 0 })}
                    className="w-full bg-bgElevated border border-borderBase rounded px-2.5 py-1.5 text-textPrimary font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-borderBase/60 text-xs">
                <span className="text-textSecondary font-semibold">Total Computed Repair Cost:</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  ₹{(
                    Number(repairForm.laborCost || 0) +
                    Number(repairForm.partsCost || 0) +
                    Number(repairForm.serviceCost || 0) +
                    Number(repairForm.otherCost || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsRepairModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={repairLoading} className="bg-orange-600 hover:bg-orange-700 text-white">
                Save Repair & Cost Details
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 5: Complete Maintenance Modal ───────────────────────────── */}
      {isCompleteModalOpen && selectedRecord && (
        <Modal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          title={`Complete Maintenance & Synchronize Stock — ${selectedRecord.maintenanceCode}`}
        >
          <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300">Finalize Maintenance & Return to Stock</p>
                <p className="text-emerald-200/90 mt-0.5">
                  Confirming will complete maintenance for <strong className="text-white">{selectedRecord.assetCode}</strong>. The asset condition will be updated, status synchronized according to your disposition selection, and an immutable asset audit event logged.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Resolution Summary <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={completeForm.resolution}
                onChange={(e) => setCompleteForm({ ...completeForm, resolution: e.target.value })}
                rows={2}
                placeholder="e.g. Screen replaced and diagnostic burn-in passed with 0 errors."
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Condition After Repair</label>
                <select
                  value={completeForm.conditionAfter}
                  onChange={(e) => setCompleteForm({ ...completeForm, conditionAfter: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono"
                >
                  <option value="EXCELLENT">EXCELLENT (Like New)</option>
                  <option value="GOOD">GOOD (Fully Functional)</option>
                  <option value="FAIR">FAIR (Cosmetic Wear Remains)</option>
                  <option value="DAMAGED">DAMAGED (Partial Function)</option>
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Asset Final Disposition</label>
                <select
                  value={completeForm.finalDisposition}
                  onChange={(e) => setCompleteForm({ ...completeForm, finalDisposition: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono"
                >
                  <option value="AVAILABLE">AVAILABLE (Restock to IT Pool)</option>
                  <option value="ACTIVE">ACTIVE (Return to Assigned Holder)</option>
                  <option value="NEEDS_FURTHER_REPAIR">NEEDS FURTHER REPAIR</option>
                  <option value="RETIRED">RETIRED (Scrap / End of Life)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsCompleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={completeLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Finalize & Close Ticket
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 6: Cancel Maintenance Modal ─────────────────────────────── */}
      {isCancelModalOpen && selectedRecord && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title={`Cancel Maintenance Ticket — ${selectedRecord.maintenanceCode}`}
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Revoke Maintenance Ticket</p>
                <p className="text-rose-200/90 mt-0.5">
                  This ticket will be marked as CANCELLED. If no other active maintenance tickets exist for <strong className="text-white">{selectedRecord.assetCode}</strong>, its status will be restored to AVAILABLE (or ACTIVE with current holder).
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
                placeholder="State why this maintenance request is being revoked..."
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsCancelModalOpen(false)}>
                Keep Ticket Active
              </Button>
              <Button variant="danger" type="submit" loading={cancelLoading}>
                Confirm Cancellation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 7: Maintenance Audit Details ────────────────────────────── */}
      {isDetailModalOpen && selectedRecord && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Maintenance Audit File — ${selectedRecord.maintenanceCode}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-sans">
            {detailLoading && (
              <div className="flex items-center justify-center p-3 text-brandPrimary">
                <RotateCcw className="w-5 h-5 animate-spin mr-2" />
                Loading latest details…
              </div>
            )}

            {/* Top Status & Priority Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-bgBase border border-borderBase">
              <div>
                <span className="text-[10px] text-textSecondary uppercase font-mono block">Status & Priority</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-800 text-textPrimary border border-borderBase">
                    {selectedRecord.repairStatus}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                      selectedRecord.priority === 'CRITICAL'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        : selectedRecord.priority === 'HIGH'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                        : selectedRecord.priority === 'MEDIUM'
                        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/20'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {selectedRecord.priority} PRIORITY
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-textSecondary uppercase font-mono block">Ticket ID</span>
                <span className="text-base font-bold font-mono text-brandPrimary">{selectedRecord.maintenanceCode}</span>
              </div>
            </div>

            {/* Hardware Device Card */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs border-b border-borderBase pb-2">
                <Laptop className="w-4 h-4" />
                <span>Serviced Hardware Asset</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Asset ID</span>
                  <span
                    onClick={() => navigate(`/assets/${selectedRecord.assetId}`)}
                    className="font-mono font-bold text-cyan-400 cursor-pointer hover:underline"
                  >
                    {selectedRecord.assetCode}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Device Model</span>
                  <span className="font-semibold text-textPrimary">{selectedRecord.assetName}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Serial Number</span>
                  <span className="font-mono text-textPrimary">{selectedRecord.serialNumber}</span>
                </div>
                <div>
                  <span className="text-textSecondary block text-[10px] font-mono">Current Custodian</span>
                  <span className="text-textPrimary">{selectedRecord.employeeName || 'IT STOCK'}</span>
                </div>
              </div>
            </div>

            {/* Issue, Diagnostics & Repair */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-xs border-b border-borderBase pb-2">
                <Activity className="w-4 h-4" />
                <span>Diagnostics & Repair Actions</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <strong className="text-textSecondary">Issue: </strong>
                  <span className="text-textPrimary">{selectedRecord.issueTitle}</span>
                  {selectedRecord.issueDescription && (
                    <p className="text-textSecondary text-[11px] mt-0.5">{selectedRecord.issueDescription}</p>
                  )}
                </div>
                {selectedRecord.diagnosis && selectedRecord.diagnosis !== '—' && (
                  <div className="pt-1 border-t border-borderBase/60">
                    <strong className="text-textSecondary">Diagnosis: </strong>
                    <span className="text-textPrimary">{selectedRecord.diagnosis}</span>
                  </div>
                )}
                {selectedRecord.repairAction && selectedRecord.repairAction !== '—' && (
                  <div className="pt-1 border-t border-borderBase/60">
                    <strong className="text-textSecondary">Repair Action: </strong>
                    <span className="text-textPrimary">{selectedRecord.repairAction}</span>
                  </div>
                )}
                {selectedRecord.resolution && selectedRecord.resolution !== '—' && (
                  <div className="pt-1 border-t border-borderBase/60">
                    <strong className="text-emerald-400">Resolution: </strong>
                    <span className="text-textPrimary">{selectedRecord.resolution}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cost & Replaced Parts */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div className="flex items-center justify-between border-b border-borderBase pb-2">
                <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  Cost Accounting & Parts
                </span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  Total: ₹{(selectedRecord.repairCost || 0).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-1.5 rounded bg-bgElevated">
                  Labor: <span className="text-textPrimary">₹{(selectedRecord.laborCost || 0).toLocaleString()}</span>
                </div>
                <div className="p-1.5 rounded bg-bgElevated">
                  Parts: <span className="text-textPrimary">₹{(selectedRecord.partsCost || 0).toLocaleString()}</span>
                </div>
                <div className="p-1.5 rounded bg-bgElevated">
                  Service: <span className="text-textPrimary">₹{(selectedRecord.serviceCost || 0).toLocaleString()}</span>
                </div>
                <div className="p-1.5 rounded bg-bgElevated">
                  Other: <span className="text-textPrimary">₹{(selectedRecord.otherCost || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* History Trail */}
            {selectedRecord.historyEvents && selectedRecord.historyEvents.length > 0 && (
              <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
                <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-xs border-b border-borderBase pb-2">
                  <History className="w-4 h-4" />
                  <span>Asset Movement Audit Trail</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedRecord.historyEvents.map((evt: any) => (
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

      {/* ── MODAL 8: Edit Parameters Modal ───────────────────────────────── */}
      {isEditModalOpen && selectedRecord && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Ticket Parameters — ${selectedRecord.maintenanceCode}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Issue Title</label>
              <input
                type="text"
                value={editForm.issueTitle}
                onChange={(e) => setEditForm({ ...editForm, issueTitle: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Maintenance Type</label>
                <select
                  value={editForm.maintenanceType}
                  onChange={(e) => setEditForm({ ...editForm, maintenanceType: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono"
                >
                  {MAINTENANCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Priority</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
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
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary"
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
