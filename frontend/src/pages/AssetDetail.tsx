import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { exportToExcel, exportAssetHistoryToExcel } from '../utils/exporters';
import { AssetStatusHistory, AssetHistorySummary } from '../types';
import {
  Edit,
  UserCheck,
  ArrowRightLeft,
  RotateCcw,
  Wrench,
  ArrowLeft,
  Code,
  History,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  Search,
  User,
  ShieldCheck,
  Trash2,
  Cpu,
  LayoutList,
  Columns,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Tag,
  SlidersHorizontal,
  RefreshCw,
  Building,
  MapPin,
  Check,
  ShieldAlert,
  Receipt,
  Plus,
} from 'lucide-react';

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [asset, setAsset] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<any[]>([]);

  // History & Warranty states
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'warranty'>('details');
  const [assetWarranties, setAssetWarranties] = useState<any[]>([]);
  const [warrantyLoading, setWarrantyLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [historyEvents, setHistoryEvents] = useState<AssetStatusHistory[]>([]);
  const [historySummary, setHistorySummary] = useState<AssetHistorySummary | null>(null);
  const [lastMovement, setLastMovement] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [historyFilterAction, setHistoryFilterAction] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('ALL_TIME');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyLimit, setHistoryLimit] = useState<number>(25);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyTotalCount, setHistoryTotalCount] = useState<number>(0);

  // History Detail & Correction Modals
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<AssetStatusHistory | null>(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState<boolean>(false);
  const [selectedEventForCorrection, setSelectedEventForCorrection] = useState<AssetStatusHistory | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [correctionForm, setCorrectionForm] = useState({
    reason: '',
    remarks: '',
    newStatus: '',
    newCondition: '',
    newHolderId: '',
  });
  const [correctionLoading, setCorrectionLoading] = useState<boolean>(false);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [showMaintModal, setShowMaintModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [showRawData, setShowRawData] = useState<boolean>(false);

  const [showHardwareModal, setShowHardwareModal] = useState<boolean>(false);
  const [hardwareForm, setHardwareForm] = useState({
    cpu: '',
    ram: '',
    storage: '',
    monitor: '',
    keyboard: '',
    mouse: '',
    chargerAdapter: '',
    otherHardware: '',
    reason: '',
  });

  // Workflow Form States
  const [assignForm, setAssignForm] = useState({ employeeId: '', expectedReturnDate: '', conditionAtAssignment: 'GOOD', remarks: '' });
  const [transferForm, setTransferForm] = useState({ newHolderId: '', reason: '', remarks: '' });
  const [returnForm, setReturnForm] = useState({ conditionAtReturn: 'GOOD', accessoriesReturned: true, damageReported: false, missingAccessories: '', remarks: '' });
  const [maintForm, setMaintForm] = useState({ issueTitle: '', issueDescription: '', technician: '', serviceProvider: '', repairCost: '' });
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchAsset = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/assets/${id}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setAsset(data);
      }
    } catch {
      showToast('Failed to load asset details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorySummary = async () => {
    if (!id) return;
    setSummaryLoading(true);
    try {
      const res: any = await api.get(`/assets/${id}/history/summary`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setHistorySummary(data);
      }
    } catch (err) {
      console.error('Failed to load history summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', String(historyPage));
      query.set('limit', String(historyLimit));
      if (historyFilterAction) query.set('action', historyFilterAction);
      if (historySearch) query.set('search', historySearch);
      if (datePreset && datePreset !== 'ALL_TIME') query.set('datePreset', datePreset);
      if (startDate) query.set('startDate', startDate);
      if (endDate) query.set('endDate', endDate);

      const res: any = await api.get(`/assets/${id}/history?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setHistoryEvents(data.events || []);
        if (data.lastMovement) setLastMovement(data.lastMovement);
        if (data.pagination) {
          setHistoryTotalCount(data.pagination.total || 0);
          setHistoryTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to load asset history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForCorrection) return;
    if (!correctionForm.reason.trim()) {
      showToast('Please provide a detailed reason for the correction.', 'warning');
      return;
    }
    setCorrectionLoading(true);
    try {
      await api.post(`/assets/${id}/history/${selectedEventForCorrection.id}/correction`, correctionForm);
      showToast('Administrative correction recorded. Original event preserved.', 'success');
      setShowCorrectionModal(false);
      setSelectedEventForCorrection(null);
      setCorrectionForm({ reason: '', remarks: '', newStatus: '', newCondition: '', newHolderId: '' });
      fetchHistory();
      fetchHistorySummary();
      fetchAsset();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record correction.', 'error');
    } finally {
      setCorrectionLoading(false);
    }
  };

  const fetchAssetWarranties = async () => {
    if (!id) return;
    setWarrantyLoading(true);
    try {
      const res: any = await api.get(`/warranties/asset/${id}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setAssetWarranties(data || []);
      }
    } catch (err) {
      console.error('Failed to load asset warranties:', err);
    } finally {
      setWarrantyLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
    fetchHistorySummary();
    fetchAssetWarranties();

    const fetchEmps = async () => {
      try {
        const res: any = await api.get('/employees?limit=100&status=ACTIVE');
        const isSuccess = res?.success ?? res?.data?.success;
        const data = res?.data ?? res;
        if (isSuccess && data) setEmployees(data.employees || []);
      } catch {}
    };
    fetchEmps();
  }, [id]);

  useEffect(() => {
    fetchHistory();
  }, [id, historyPage, historyLimit, historyFilterAction, historySearch, datePreset, startDate, endDate]);

  if (loading || !asset) {
    return (
      <div className="py-20 text-center text-textSecondary">
        <div className="inline-block w-8 h-8 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Loading Asset Specifications & Real Company History...</p>
      </div>
    );
  }

  // Workflows
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/assets/${asset.id}/assign`, assignForm);
      showToast('Asset assigned successfully!', 'success');
      setShowAssignModal(false);
      fetchAsset();
      fetchHistory();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Assignment failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/assets/${asset.id}/transfer`, transferForm);
      showToast('Asset transferred successfully!', 'success');
      setShowTransferModal(false);
      fetchAsset();
      fetchHistory();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Transfer failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/assets/${asset.id}/return`, returnForm);
      showToast('Asset returned successfully!', 'success');
      setShowReturnModal(false);
      fetchAsset();
      fetchHistory();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Return failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/assets/${asset.id}/maintenance`, {
        ...maintForm,
        repairCost: maintForm.repairCost ? parseFloat(maintForm.repairCost) : 0,
      });
      showToast('Maintenance logged successfully!', 'success');
      setShowMaintModal(false);
      fetchAsset();
      fetchHistory();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Maintenance failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHardwareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res: any = await api.put(`/assets/${asset.id}/hardware`, hardwareForm);
      if (res?.success ?? res?.data?.success) {
        showToast('Hardware configuration updated successfully!', 'success');
        setShowHardwareModal(false);
        fetchAsset();
        fetchHistory();
      } else {
        showToast(res?.message || 'Failed to update hardware configuration', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to update hardware.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportHistory = () => {
    if (!historyEvents.length) {
      showToast('No history records available to export.', 'warning');
      return;
    }
    exportAssetHistoryToExcel(
      historyEvents,
      asset?.companyAssetId || asset?.assetCode
    );
    showToast('Asset history (.xlsx) exported successfully.', 'success');
  };

  const handleDeleteAsset = async () => {
    setDeleteLoading(true);
    try {
      const res: any = await api.delete(`/assets/${asset.id}`);
      if (res?.success ?? res?.data?.success) {
        showToast(res.message || `Asset ${asset.companyAssetId || asset.assetCode} processed successfully.`, 'success');
        navigate('/assets');
      } else {
        showToast(res?.message || 'Failed to delete asset.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error deleting asset.', 'error');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const isAct = asset.sourceAssetStatus === 'Active';
  const isAlloc = asset.sourceAllocationStatus === 'Allocated' || asset.allocationStatus === 'ALLOCATED';

  const allocDateFormatted = asset.dateOfAllocation
    ? new Date(asset.dateOfAllocation).toLocaleDateString('en-GB')
    : '—';
  const deallocDateFormatted = asset.dateOfDeallocation
    ? new Date(asset.dateOfDeallocation).toLocaleDateString('en-GB')
    : '—';

  let rawDataParsed: any = null;
  try {
    if (asset.sourceRawData) rawDataParsed = JSON.parse(asset.sourceRawData);
  } catch {}

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ASSET_CREATED':
      case 'CREATED':
        return { label: 'Created', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-500' };
      case 'ASSET_IMPORTED':
        return { label: 'Imported', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', dot: 'bg-indigo-500' };
      case 'ASSIGNED':
      case 'ASSET_ASSIGNED':
        return { label: 'Assigned', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-500' };
      case 'ASSIGNMENT_UPDATED':
        return { label: 'Assignment Updated', color: 'bg-teal-500/10 text-teal-400 border-teal-500/30', dot: 'bg-teal-500' };
      case 'TRANSFERRED':
      case 'ASSET_TRANSFERRED':
        return { label: 'Transferred', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' };
      case 'RETURNED':
      case 'ASSET_RETURNED':
        return { label: 'Returned', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' };
      case 'ASSET_RETURN_INITIATED':
        return { label: 'Return Initiated', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', dot: 'bg-emerald-400' };
      case 'ASSET_INSPECTED':
        return { label: 'Inspected', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', dot: 'bg-purple-500' };
      case 'MAINTENANCE_OPENED':
      case 'MAINTENANCE_STARTED':
        return { label: 'In Repair', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dot: 'bg-rose-500' };
      case 'MAINTENANCE_UPDATED':
        return { label: 'Repair Updated', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20', dot: 'bg-rose-400' };
      case 'MAINTENANCE_COMPLETED':
        return { label: 'Repair Completed', color: 'bg-green-500/10 text-green-400 border-green-500/30', dot: 'bg-green-500' };
      case 'HARDWARE_CHANGED':
        return { label: 'Hardware Updated', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30', dot: 'bg-sky-500' };
      case 'STATUS_CHANGED':
        return { label: 'Status Changed', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30', dot: 'bg-violet-500' };
      case 'CONDITION_CHANGED':
        return { label: 'Condition Changed', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30', dot: 'bg-orange-500' };
      case 'LOCATION_CHANGED':
        return { label: 'Location Changed', color: 'bg-lime-500/10 text-lime-400 border-lime-500/30', dot: 'bg-lime-500' };
      case 'DEPARTMENT_CHANGED':
        return { label: 'Dept Changed', color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30', dot: 'bg-fuchsia-500' };
      case 'HOLDER_CHANGED':
      case 'EMPLOYEE_CHANGED':
        return { label: 'Holder Changed', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-500' };
      case 'ASSET_DEACTIVATED':
      case 'RETIRED':
        return { label: 'Deactivated', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', dot: 'bg-zinc-500' };
      case 'CORRECTION_RECORDED':
        return { label: 'Correction', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500' };
      default:
        return { label: action.replace(/_/g, ' '), color: 'bg-zinc-800 text-zinc-300 border-zinc-700', dot: 'bg-zinc-400' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`${asset.companyAssetId || asset.assetCode} — ${asset.assetName || asset.model}`}
        subtitle={`S/N: ${asset.serialNumber || '—'} | Registered ${new Date(asset.createdAt).toLocaleDateString()}`}
        actions={
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4 mr-1" />} onClick={() => navigate('/assets')}>
              Back
            </Button>
            <Button
              variant={activeTab === 'history' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(activeTab === 'history' ? 'details' : 'history')}
              className={activeTab === 'history' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/30'}
            >
              <History className="w-4 h-4 mr-1.5" />
              {activeTab === 'history' ? 'View Specifications' : 'View Complete History'}
            </Button>
            {hasPermission('ASSET_UPDATE') && (
              <Button variant="secondary" icon={<Edit className="w-4 h-4 mr-1" />} onClick={() => navigate(`/assets/${asset.id}/edit`)}>
                Edit
              </Button>
            )}
            {hasPermission('ASSET_DELETE') && (
              <Button
                variant="secondary"
                icon={<Trash2 className="w-4 h-4 mr-1 text-rose-400" />}
                onClick={() => setShowDeleteModal(true)}
                className="hover:bg-rose-950/30 hover:border-rose-500/40 text-rose-400"
              >
                Delete / Deactivate
              </Button>
            )}
            {asset.status === 'AVAILABLE' && hasPermission('ASSIGNMENT_CREATE') && (
              <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAssignModal(true)}>
                <UserCheck className="w-4 h-4 mr-1" />
                Assign Asset
              </Button>
            )}
            {(asset.status === 'ASSIGNED' || asset.status === 'IN_USE') && hasPermission('TRANSFER_CREATE') && (
              <Button variant="primary" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowTransferModal(true)}>
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                Transfer
              </Button>
            )}
            {(asset.status === 'ASSIGNED' || asset.status === 'IN_USE') && hasPermission('RETURN_CREATE') && (
              <Button variant="primary" className="bg-amber-600 hover:bg-amber-700" onClick={() => setShowReturnModal(true)}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Return Asset
              </Button>
            )}
            {asset.status !== 'UNDER_REPAIR' && hasPermission('MAINTENANCE_CREATE') && (
              <Button variant="danger" onClick={() => setShowMaintModal(true)}>
                <Wrench className="w-4 h-4 mr-1" />
                Maintenance
              </Button>
            )}
          </div>
        }
      />

      {/* Top Banner Status & Company Identity Info */}
      <div className="bg-bgElevated border border-borderBase rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-6 flex-wrap gap-y-2">
          <div>
            <span className="text-[10px] text-textSecondary uppercase font-semibold block font-mono">Company Asset ID</span>
            <span className="text-xl font-bold text-brandPrimary font-mono mt-0.5 block">
              {asset.companyAssetId || asset.assetCode}
            </span>
          </div>

          <div className="border-l border-borderBase pl-6">
            <span className="text-[10px] text-textSecondary uppercase font-semibold block font-mono">Asset Status</span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mt-1 font-mono ${
                isAct
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {asset.sourceAssetStatus || (isAct ? 'Active' : 'Inactive')}
            </span>
          </div>

          <div className="border-l border-borderBase pl-6">
            <span className="text-[10px] text-textSecondary uppercase font-semibold block font-mono">Allocation Status</span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mt-1 font-mono ${
                isAlloc
                  ? 'bg-blue-950/40 text-blue-400 border border-blue-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {asset.sourceAllocationStatus || (isAlloc ? 'Allocated' : 'Not Allocated')}
            </span>
          </div>

          <div className="border-l border-borderBase pl-6">
            <span className="text-[10px] text-textSecondary uppercase font-semibold block font-mono">Criticality</span>
            {asset.criticality ? (
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mt-1 font-mono ${
                  asset.criticality.toLowerCase() === 'high'
                    ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                    : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                }`}
              >
                {asset.criticality}
              </span>
            ) : (
              <span className="text-zinc-500 mt-1 block font-mono">—</span>
            )}
          </div>

          <div className="border-l border-borderBase pl-6">
            <span className="text-[10px] text-textSecondary uppercase font-semibold block font-mono">Data Quality</span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mt-1 font-mono ${
                asset.dataQualityStatus === 'CLEAN'
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                  : asset.dataQualityStatus === 'WARNING'
                  ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-500/20'
                  : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
              }`}
            >
              {asset.dataQualityStatus || 'CLEAN'}
            </span>
          </div>
        </div>

        <div className="text-right text-xs">
          <p className="text-textSecondary">
            Location / Area: <strong className="text-textPrimary">{asset.location || '—'}</strong>
          </p>
          <p className="text-textSecondary mt-0.5">
            Facility: <strong className="text-textPrimary">{asset.locationRel?.name || 'Faith Automation HQ'}</strong>
          </p>
        </div>
      </div>

      {/* ══ SUMMARY CARDS: CURRENT STATE, LIFECYCLE & CHAIN OF CUSTODY ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CARD 1: CURRENT STATE & CUSTODIAN */}
        <div className="bg-bgElevated border border-borderBase rounded-xl p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-borderBase pb-2.5 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center">
                <User className="w-3.5 h-3.5 mr-1.5" />
                Current Custodian & State
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-cyan-950/60 text-cyan-400 border border-cyan-800">
                {asset.status}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-textSecondary text-[11px]">Custodian:</span>
                <span className="font-bold text-textPrimary truncate max-w-[180px]">
                  {asset.currentHolder?.fullName || asset.employeeNameSource || 'IT STOCK'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textSecondary text-[11px]">Department:</span>
                <span className="font-medium text-textPrimary truncate max-w-[180px]">
                  {asset.department?.name || asset.location || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textSecondary text-[11px]">Facility Location:</span>
                <span className="font-medium text-textPrimary truncate max-w-[180px]">
                  {asset.locationRel?.name || asset.location || 'Pune Facility, India'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textSecondary text-[11px]">Physical Condition:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 font-mono">
                  {asset.condition || 'GOOD'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textSecondary text-[11px]">Allocation Status:</span>
                <span className="font-semibold text-cyan-400 font-mono text-[11px]">
                  {asset.allocationStatus === 'ALLOCATED' ? 'ALLOCATED' : 'NOT ALLOCATED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: LIFECYCLE & ACTIVITY MILESTONES */}
        <div className="bg-bgElevated border border-borderBase rounded-xl p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-borderBase pb-2.5 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Activity Milestones
              </span>
              <span className="text-[10px] text-textSecondary font-mono">
                Total Events: <strong className="text-textPrimary">{historySummary?.totalEvents ?? historyTotalCount}</strong>
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-textSecondary uppercase block font-medium">Initial Registration / Import</span>
                <p className="text-xs font-mono text-textPrimary mt-0.5">
                  {historySummary?.firstActivity?.date
                    ? new Date(historySummary.firstActivity.date).toLocaleString('en-GB')
                    : new Date(asset.createdAt).toLocaleString('en-GB')}
                </p>
                <p className="text-[10.5px] text-textSecondary truncate">
                  By: {historySummary?.firstActivity?.performedBy || 'System Admin'}
                </p>
              </div>

              <div className="border-t border-borderBase pt-2">
                <span className="text-[10px] text-textSecondary uppercase block font-medium">Latest Activity</span>
                <p className="text-xs font-mono text-cyan-400 mt-0.5">
                  {historySummary?.lastActivity?.date
                    ? new Date(historySummary.lastActivity.date).toLocaleString('en-GB')
                    : lastMovement?.eventDate
                    ? new Date(lastMovement.eventDate).toLocaleString('en-GB')
                    : '—'}
                </p>
                <p className="text-[10.5px] text-textSecondary truncate">
                  {historySummary?.lastActivity?.description || lastMovement?.remarks || 'Operational Event'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: CHAIN OF CUSTODY SUMMARY */}
        <div className="bg-bgElevated border border-borderBase rounded-xl p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-borderBase pb-2.5 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                Custody Accountability
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                Audit Verified
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="bg-bgBase p-2 rounded border border-borderBase">
                <span className="text-[10px] text-textSecondary uppercase block">Assigns</span>
                <span className="text-base font-bold text-cyan-400 font-mono">
                  {historySummary?.custodySummary?.totalAssignments ?? 0}
                </span>
              </div>
              <div className="bg-bgBase p-2 rounded border border-borderBase">
                <span className="text-[10px] text-textSecondary uppercase block">Transfers</span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {historySummary?.custodySummary?.totalTransfers ?? 0}
                </span>
              </div>
              <div className="bg-bgBase p-2 rounded border border-borderBase">
                <span className="text-[10px] text-textSecondary uppercase block">Returns</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {historySummary?.custodySummary?.totalReturns ?? 0}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-textSecondary uppercase block font-semibold mb-1">
                Previous Custodians ({historySummary?.custodySummary?.previousCustodians?.length ?? 0})
              </span>
              {historySummary?.custodySummary?.previousCustodians && historySummary.custodySummary.previousCustodians.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {historySummary.custodySummary.previousCustodians.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 rounded text-[10px] bg-bgBase border border-borderBase text-textSecondary"
                      title={`Seen ${c.count} time(s)`}
                    >
                      {c.name} ({c.code})
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-textSecondary italic">No previous employee custodians recorded.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ DEDICATED PROMINENT WARRANTY BANNER SECTION ══ */}
      {assetWarranties.length > 0 ? (
        <div className="bg-[#0E131F] border border-indigo-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_15px_rgba(99,102,241,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono uppercase">
                  Hardware Warranty Coverage
                </span>
                <StatusBadge status={assetWarranties[0].computedStatus || assetWarranties[0].status} />
                <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-800">
                  {assetWarranties[0].warrantyCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Provider: <strong className="text-slate-200">{assetWarranties[0].provider}</strong> | Valid until{' '}
                <strong className="text-white font-mono">{new Date(assetWarranties[0].endDate).toLocaleDateString('en-GB')}</strong>{' '}
                {assetWarranties[0].daysRemaining !== undefined && (
                  <span className="ml-1 text-amber-300 font-mono">
                    ({assetWarranties[0].daysRemaining < 0 ? `Expired ${Math.abs(assetWarranties[0].daysRemaining)}d ago` : `${assetWarranties[0].daysRemaining}d remaining`})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('warranty')}
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/30"
            >
              View Warranty Details
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/warranties')}
            >
              Open Warranty Center &rarr;
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-400">
              No active warranty contract registered for this asset.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/warranties')}
          >
            Register Warranty
          </Button>
        </div>
      )}

      {/* ══ INTERACTIVE TAB BAR ══ */}
      <div className="flex items-center space-x-2 border-b border-borderBase">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all ${
            activeTab === 'details'
              ? 'bg-bgElevated text-cyan-400 border-t-2 border-cyan-400 border-x border-borderBase'
              : 'text-textSecondary hover:text-textPrimary hover:bg-bgElevated/40'
          }`}
        >
          Asset Specifications & 16-Col Master
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-bgElevated text-cyan-400 border-t-2 border-cyan-400 border-x border-borderBase'
              : 'text-textSecondary hover:text-textPrimary hover:bg-bgElevated/40'
          }`}
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          Complete Asset History / Chain of Custody
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
            {historyEvents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('warranty')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'warranty'
              ? 'bg-bgElevated text-indigo-400 border-t-2 border-indigo-400 border-x border-borderBase'
              : 'text-textSecondary hover:text-textPrimary hover:bg-bgElevated/40'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
          Warranty & Service Contracts
          {assetWarranties.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
              {assetWarranties.length}
            </span>
          )}
        </button>
      </div>

      {/* ══ TAB 1: SPECIFICATIONS & 16-COL MASTER ══ */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Hardware Configuration Section */}
          <Card
            title="Hardware Configuration"
            subtitle="Component specifications and peripherals attached to this device."
            action={
              hasPermission('ASSET_UPDATE') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setHardwareForm({
                      cpu: asset.specifications?.processor || asset.cpu || '',
                      ram: asset.specifications?.ram || asset.ram || '',
                      storage: asset.specifications?.storage || '',
                      monitor: asset.specifications?.monitor || '',
                      keyboard: asset.specifications?.keyboard || '',
                      mouse: asset.specifications?.mouse || '',
                      chargerAdapter: asset.specifications?.chargerAdapter || '',
                      otherHardware: asset.specifications?.otherHardware || '',
                      reason: '',
                    });
                    setShowHardwareModal(true);
                  }}
                >
                  <Cpu className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                  {asset.specifications?.processor || asset.cpu || asset.specifications?.ram || asset.ram || asset.specifications?.storage || asset.specifications?.monitor || asset.specifications?.keyboard || asset.specifications?.mouse || asset.specifications?.chargerAdapter || asset.specifications?.otherHardware
                    ? 'Edit Hardware'
                    : '+ Add Hardware'}
                </Button>
              )
            }
          >
            {!(
              asset.specifications?.processor ||
              asset.cpu ||
              asset.specifications?.ram ||
              asset.ram ||
              asset.specifications?.storage ||
              asset.specifications?.monitor ||
              asset.specifications?.keyboard ||
              asset.specifications?.mouse ||
              asset.specifications?.chargerAdapter ||
              asset.specifications?.otherHardware
            ) ? (
              <div className="text-center py-6 text-textSecondary text-xs">
                <p className="mb-3">No hardware configuration added.</p>
                {hasPermission('ASSET_UPDATE') && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setHardwareForm({
                        cpu: asset.cpu || '',
                        ram: asset.ram || '',
                        storage: '',
                        monitor: '',
                        keyboard: '',
                        mouse: '',
                        chargerAdapter: '',
                        otherHardware: '',
                        reason: '',
                      });
                      setShowHardwareModal(true);
                    }}
                  >
                    + Add Hardware
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                  <span className="text-[10px] text-textSecondary uppercase block font-medium">CPU</span>
                  <p className="text-sm font-bold text-textPrimary font-mono mt-0.5">
                    {asset.specifications?.processor || asset.cpu || '—'}
                  </p>
                </div>

                <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                  <span className="text-[10px] text-textSecondary uppercase block font-medium">RAM</span>
                  <p className="text-sm font-bold text-textPrimary font-mono mt-0.5">
                    {asset.specifications?.ram || asset.ram || '—'}
                  </p>
                </div>

                <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                  <span className="text-[10px] text-textSecondary uppercase block font-medium">Storage</span>
                  <p className="text-sm font-bold text-textPrimary font-mono mt-0.5">
                    {asset.specifications?.storage || '—'}
                  </p>
                </div>

                <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                  <span className="text-[10px] text-textSecondary uppercase block font-medium">Monitor</span>
                  <p className="text-sm font-semibold text-textPrimary mt-0.5">
                    {asset.specifications?.monitor || '—'}
                  </p>
                </div>

                <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                  <span className="text-[10px] text-textSecondary uppercase block font-medium">Keyboard</span>
                  <p className="text-sm font-semibold text-textPrimary mt-0.5">
                    {asset.specifications?.keyboard || '—'}
                  </p>
                </div>

                <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                  <span className="text-[10px] text-textSecondary uppercase block font-medium">Mouse</span>
                  <p className="text-sm font-semibold text-textPrimary mt-0.5">
                    {asset.specifications?.mouse || '—'}
                  </p>
                </div>

                <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                  <span className="text-[10px] text-textSecondary uppercase block font-medium">Charger / Adapter</span>
                  <p className="text-sm font-semibold text-textPrimary mt-0.5">
                    {asset.specifications?.chargerAdapter || '—'}
                  </p>
                </div>

                <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                  <span className="text-[10px] text-textSecondary uppercase block font-medium">Other Hardware</span>
                  <p className="text-sm font-semibold text-textPrimary mt-0.5">
                    {asset.specifications?.otherHardware || '—'}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <Card
            title="Complete 16-Column Master Specifications"
            subtitle="Authoritative hardware, network, and organizational allocation identity."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">1. Asset ID (FAA / Code)</span>
                <p className="text-sm font-bold text-brandPrimary font-mono mt-0.5">
                  {asset.companyAssetId || asset.assetCode}
                </p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">2. Asset Type</span>
                <p className="text-sm font-semibold text-textPrimary mt-0.5">{asset.assetType || 'LAPTOP'}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">3. Serial Number</span>
                <p className="text-sm font-mono text-textPrimary mt-0.5">{asset.serialNumber || '—'}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">4. Model Name</span>
                <p className="text-sm font-bold text-textPrimary mt-0.5">{asset.model || asset.assetName || '—'}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">5. Location / Area</span>
                <p className="text-sm font-bold text-brandPrimary mt-0.5">{asset.location || '—'}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">6. Laptop Number</span>
                <p className="text-sm font-mono text-textPrimary mt-0.5">{asset.laptopNumber || '—'}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">7. PC Number</span>
                <p className="text-sm font-mono text-textPrimary mt-0.5">{asset.pcNumber || '—'}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">8. Status of Asset</span>
                <p className={`text-sm font-bold mt-0.5 ${isAct ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {asset.sourceAssetStatus || (isAct ? 'Active' : 'Inactive')}
                </p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">9. Criticality of Asset</span>
                <p className={`text-sm font-bold mt-0.5 ${asset.criticality?.toLowerCase() === 'high' ? 'text-rose-400' : asset.criticality ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {asset.criticality || '—'}
                </p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">10. Employee Name</span>
                <p className="text-sm font-bold text-textPrimary mt-0.5">
                  {asset.employeeNameSource || asset.holderDisplayName || '—'}
                </p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">11. LAN IP</span>
                <p className="text-sm font-medium text-textPrimary mt-0.5">{asset.lanIp || '—'}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">12. RAM</span>
                <p className="text-sm font-medium text-textPrimary mt-0.5">{asset.ram || '—'}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">13. Date of allocation</span>
                <p className="text-sm font-medium text-textPrimary mt-0.5">{allocDateFormatted}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">14. Date of deallocation</span>
                <p className="text-sm font-medium text-zinc-500 mt-0.5">{deallocDateFormatted}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">15. CPU</span>
                <p className="text-sm font-bold text-textPrimary mt-0.5">{asset.cpu || '—'}</p>
              </div>

              <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
                <span className="text-[10px] text-textSecondary uppercase block">16. LAN Mac Address</span>
                <p className="text-sm font-medium text-zinc-500 mt-0.5">{asset.lanMacAddress || '—'}</p>
              </div>
            </div>
          </Card>

          {/* Admin Source Data Section */}
          <Card
            title="Admin Source Data Audit"
            subtitle="Raw un-normalized imported Excel row information and verification audit trail."
          >
            <div className="space-y-3 text-xs font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-bgBase border border-borderBase rounded-lg">
                <div>
                  <span className="text-textSecondary block">Imported Source Row Number:</span>
                  <span className="font-bold text-textPrimary text-sm">Excel Row #{asset.sourceRowNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-textSecondary block">Import Batch ID:</span>
                  <span className="font-bold text-brandPrimary">{asset.importBatchId || 'Initial Excel Migration'}</span>
                </div>
                <div>
                  <span className="text-textSecondary block">Raw Asset ID Cell:</span>
                  <span className="font-bold text-textPrimary">"{asset.sourceAssetId || asset.companyAssetId}"</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowRawData(!showRawData)}>
                  <Code className="w-3.5 h-3.5 mr-1" />
                  {showRawData ? 'Hide Raw JSON' : 'View Raw Excel Record'}
                </Button>
              </div>

              {showRawData && rawDataParsed && (
                <pre className="p-4 bg-bgBase border border-borderBase rounded-lg text-[11px] text-textSecondary overflow-x-auto">
                  {JSON.stringify(rawDataParsed, null, 2)}
                </pre>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ══ TAB 2: COMPLETE ASSET HISTORY / CHAIN OF CUSTODY ══ */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* 1. Dynamic Telemetry Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <button
              onClick={() => { setHistoryFilterAction(''); setHistoryPage(1); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                historyFilterAction === ''
                  ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'bg-bgElevated border-borderBase hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] text-textSecondary uppercase font-medium block">Total Events</span>
              <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">
                {historySummary?.totalEvents ?? historyTotalCount}
              </span>
            </button>

            <button
              onClick={() => { setHistoryFilterAction('ASSIGNED,ASSET_ASSIGNED,ASSIGNMENT_UPDATED'); setHistoryPage(1); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                historyFilterAction.includes('ASSIGNED')
                  ? 'bg-blue-950/40 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'bg-bgElevated border-borderBase hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] text-textSecondary uppercase font-medium block">Assignments</span>
              <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
                {historySummary?.assignments ?? 0}
              </span>
            </button>

            <button
              onClick={() => { setHistoryFilterAction('TRANSFERRED,ASSET_TRANSFERRED'); setHistoryPage(1); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                historyFilterAction.includes('TRANSFERRED')
                  ? 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  : 'bg-bgElevated border-borderBase hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] text-textSecondary uppercase font-medium block">Transfers</span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                {historySummary?.transfers ?? 0}
              </span>
            </button>

            <button
              onClick={() => { setHistoryFilterAction('RETURNED,ASSET_RETURNED,ASSET_RETURN_INITIATED'); setHistoryPage(1); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                historyFilterAction.includes('RETURNED')
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-bgElevated border-borderBase hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] text-textSecondary uppercase font-medium block">Returns</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                {historySummary?.returns ?? 0}
              </span>
            </button>

            <button
              onClick={() => { setHistoryFilterAction('MAINTENANCE_OPENED,MAINTENANCE_STARTED,MAINTENANCE_UPDATED,MAINTENANCE_COMPLETED'); setHistoryPage(1); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                historyFilterAction.includes('MAINTENANCE')
                  ? 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                  : 'bg-bgElevated border-borderBase hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] text-textSecondary uppercase font-medium block">Maintenance</span>
              <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
                {historySummary?.maintenanceEvents ?? 0}
              </span>
            </button>

            <button
              onClick={() => { setHistoryFilterAction('CONDITION_CHANGED'); setHistoryPage(1); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                historyFilterAction === 'CONDITION_CHANGED'
                  ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                  : 'bg-bgElevated border-borderBase hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] text-textSecondary uppercase font-medium block">Condition Diffs</span>
              <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">
                {historySummary?.conditionChanges ?? 0}
              </span>
            </button>

            <button
              onClick={() => { setHistoryFilterAction('LOCATION_CHANGED,DEPARTMENT_CHANGED'); setHistoryPage(1); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                historyFilterAction.includes('LOCATION')
                  ? 'bg-lime-950/40 border-lime-500/50 shadow-[0_0_12px_rgba(132,204,22,0.15)]'
                  : 'bg-bgElevated border-borderBase hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] text-textSecondary uppercase font-medium block">Location Diffs</span>
              <span className="text-xl font-bold font-mono text-lime-400 mt-1 block">
                {historySummary?.locationChanges ?? 0}
              </span>
            </button>
          </div>

          {/* 2. Control Bar: Search, Filters, Presets, View Switcher & Export */}
          <div className="bg-bgElevated border border-borderBase rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                    placeholder="Search holder, dept, remarks, record code..."
                    className="w-full bg-bgBase border border-borderBase rounded-lg pl-9 pr-3 py-1.5 text-xs text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-cyan-400"
                  />
                  {historySearch && (
                    <button
                      onClick={() => { setHistorySearch(''); setHistoryPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Event Type Filter */}
                <div className="w-52">
                  <Select
                    value={historyFilterAction}
                    onChange={(e) => { setHistoryFilterAction(e.target.value); setHistoryPage(1); }}
                    options={[
                      { value: '', label: 'All Event Types' },
                      { value: 'ASSIGNED,ASSET_ASSIGNED,ASSIGNMENT_UPDATED', label: 'Assignments' },
                      { value: 'TRANSFERRED,ASSET_TRANSFERRED', label: 'Transfers' },
                      { value: 'RETURNED,ASSET_RETURNED,ASSET_RETURN_INITIATED', label: 'Returns' },
                      { value: 'MAINTENANCE_OPENED,MAINTENANCE_STARTED,MAINTENANCE_UPDATED,MAINTENANCE_COMPLETED', label: 'Maintenance' },
                      { value: 'HARDWARE_CHANGED', label: 'Hardware Changes' },
                      { value: 'STATUS_CHANGED,CONDITION_CHANGED', label: 'Status / Condition' },
                      { value: 'LOCATION_CHANGED,DEPARTMENT_CHANGED', label: 'Location / Dept' },
                      { value: 'CORRECTION_RECORDED', label: 'Admin Corrections' },
                      { value: 'ASSET_CREATED,CREATED,ASSET_IMPORTED', label: 'Creation / Import' },
                      { value: 'ASSET_DEACTIVATED,RETIRED', label: 'Deactivated / Retired' },
                    ]}
                  />
                </div>
              </div>

              {/* View Switcher, Limit, & Excel Export */}
              <div className="flex items-center space-x-2">
                {/* View Switcher Toggle */}
                <div className="flex items-center bg-bgBase border border-borderBase rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`flex items-center px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      viewMode === 'timeline'
                        ? 'bg-brandPrimary text-white shadow-sm'
                        : 'text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5 mr-1" />
                    Timeline
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      viewMode === 'table'
                        ? 'bg-brandPrimary text-white shadow-sm'
                        : 'text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5 mr-1" />
                    Table (16 Cols)
                  </button>
                </div>

                {/* Per Page Select */}
                <div className="w-24">
                  <Select
                    value={String(historyLimit)}
                    onChange={(e) => { setHistoryLimit(parseInt(e.target.value, 10)); setHistoryPage(1); }}
                    options={[
                      { value: '25', label: '25 / page' },
                      { value: '50', label: '50 / page' },
                      { value: '100', label: '100 / page' },
                      { value: '250', label: '250 / page' },
                    ]}
                  />
                </div>

                {/* Export Button */}
                <Button
                  variant="secondary"
                  onClick={handleExportHistory}
                  className="text-xs text-textPrimary hover:border-emerald-500/50"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
                  Export XLSX
                </Button>
              </div>
            </div>

            {/* Date Preset Pill Filters & Date Range */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borderBase pt-2.5 text-xs">
              <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                <span className="text-[11px] text-textSecondary mr-1 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Date Preset:
                </span>
                {[
                  { key: 'ALL_TIME', label: 'All Time' },
                  { key: 'TODAY', label: 'Today' },
                  { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
                  { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
                  { key: 'LAST_90_DAYS', label: 'Last 90 Days' },
                  { key: 'THIS_YEAR', label: 'This Year' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => { setDatePreset(preset.key); setStartDate(''); setEndDate(''); setHistoryPage(1); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      datePreset === preset.key
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold'
                        : 'bg-bgBase border border-borderBase text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Range */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-textSecondary">Custom Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setDatePreset(''); setHistoryPage(1); }}
                  className="bg-bgBase border border-borderBase rounded px-2 py-1 text-[11px] text-textPrimary focus:outline-none focus:border-cyan-400"
                />
                <span className="text-textSecondary text-[11px]">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setDatePreset(''); setHistoryPage(1); }}
                  className="bg-bgBase border border-borderBase rounded px-2 py-1 text-[11px] text-textPrimary focus:outline-none focus:border-cyan-400"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); setDatePreset('ALL_TIME'); setHistoryPage(1); }}
                    className="text-[11px] text-rose-400 hover:underline ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. History Content: Timeline vs Table */}
          {historyLoading ? (
            <div className="py-16 text-center text-textSecondary bg-bgElevated border border-borderBase rounded-xl">
              <div className="inline-block w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-medium">Querying complete asset history & custody ledger...</p>
            </div>
          ) : historyEvents.length === 0 ? (
            <div className="p-12 text-center bg-bgElevated border border-borderBase rounded-xl text-textSecondary text-xs">
              <p className="text-sm font-semibold text-textPrimary mb-1">No historical events found</p>
              <p>No events match the selected action, search keyword, or date range filter.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setHistoryFilterAction(''); setHistorySearch(''); setDatePreset('ALL_TIME'); setStartDate(''); setEndDate(''); setHistoryPage(1); }}
                className="mt-3 text-xs"
              >
                Reset All Filters
              </Button>
            </div>
          ) : viewMode === 'timeline' ? (
            /* ══ TIMELINE VIEW ══ */
            <Card
              title="Asset Lifecycle Timeline"
              subtitle="Permanent, chronological chain-of-custody and maintenance events recorded in real PostgreSQL storage."
            >
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-borderBase">
                {historyEvents.map((event) => {
                  const badge = getActionBadge(event.action);
                  return (
                    <div key={event.id} className="relative group">
                      {/* Timeline Marker Dot */}
                      <div
                        className={`absolute -left-[27px] sm:-left-[35px] top-2 w-3.5 h-3.5 rounded-full border-2 border-bgElevated ${badge.dot} shadow-[0_0_8px_rgba(6,182,212,0.4)]`}
                      />

                      {/* Event Card */}
                      <div className="bg-bgBase border border-borderBase hover:border-zinc-600 transition-all rounded-xl p-4 space-y-3">
                        {/* Header: Action Badge, Date, Actor */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderBase pb-2.5">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border ${badge.color}`}>
                              {badge.label}
                            </span>

                            {event.isCorrection && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                                Correction
                              </span>
                            )}

                            {event.relatedRecordCode && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-800">
                                #{event.relatedRecordCode}
                              </span>
                            )}

                            <span className="text-xs font-mono text-textPrimary">
                              {new Date(event.eventDate).toLocaleDateString('en-GB')}
                            </span>
                            <span className="text-[11px] font-mono text-textSecondary">
                              {new Date(event.eventDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="text-[11px] text-textSecondary">
                            Recorded by: <strong className="text-textPrimary">{event.performedBy || event.performedByName || 'System'}</strong>
                            {event.approvedBy && (
                              <span className="ml-2">| Approved by: <strong className="text-emerald-400">{event.approvedBy}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Correction Alert notice if this event is a correction */}
                        {event.isCorrection && event.correctionReason && (
                          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs">
                            <strong className="block text-yellow-200 mb-0.5">Administrative Correction Reason:</strong>
                            {event.correctionReason}
                          </div>
                        )}

                        {/* Custody Movement: From → To Box */}
                        {(event.previousHolder || event.newHolder || event.previousDepartment || event.newDepartment || event.previousLocation || event.newLocation) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-bgElevated p-3 rounded-lg border border-borderBase text-xs">
                            <div>
                              <span className="text-[10px] text-textSecondary uppercase font-semibold block">FROM CUSTODIAN & LOCATION</span>
                              <p className="font-bold text-rose-300 mt-0.5">
                                {event.previousHolder || 'IT STOCK'}
                              </p>
                              <p className="text-textSecondary text-[11px]">
                                Dept: {event.previousDepartment || '—'} | Loc: {event.previousLocation || '—'}
                              </p>
                            </div>
                            <div className="sm:border-l sm:border-borderBase sm:pl-3">
                              <span className="text-[10px] text-textSecondary uppercase font-semibold block">TO CUSTODIAN & LOCATION</span>
                              <p className="font-bold text-emerald-300 mt-0.5">
                                {event.newHolder || 'IT STOCK'}
                              </p>
                              <p className="text-textSecondary text-[11px]">
                                Dept: {event.newDepartment || '—'} | Loc: {event.newLocation || '—'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Status / Condition Transitions */}
                        {(event.previousStatus || event.newStatus || event.previousCondition || event.newCondition) && (
                          <div className="flex flex-wrap items-center gap-4 bg-bgElevated p-2.5 rounded-lg border border-borderBase text-xs">
                            {event.previousStatus && event.newStatus && event.previousStatus !== event.newStatus && (
                              <div className="flex items-center gap-2">
                                <span className="text-textSecondary text-[11px]">Status:</span>
                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                                  {event.previousStatus}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold text-[10px]">
                                  {event.newStatus}
                                </span>
                              </div>
                            )}

                            {event.previousCondition && event.newCondition && event.previousCondition !== event.newCondition && (
                              <div className="flex items-center gap-2">
                                <span className="text-textSecondary text-[11px]">Condition:</span>
                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                                  {event.previousCondition}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono font-bold text-[10px]">
                                  {event.newCondition}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Reason & Remarks */}
                        <div className="text-xs space-y-1">
                          {event.reason && (
                            <p className="text-textPrimary">
                              <strong className="text-textSecondary">Operational Reason:</strong> {event.reason}
                            </p>
                          )}
                          {event.remarks && (
                            <p className="text-textSecondary text-[11.5px] italic">
                              "{event.remarks}"
                            </p>
                          )}
                        </div>

                        {/* Card Footer: Detail & Admin Correction Actions */}
                        <div className="flex items-center justify-between border-t border-borderBase pt-2 text-xs">
                          <span className="font-mono text-[10px] text-zinc-500">
                            Event ID: {event.id.slice(0, 12)}...
                          </span>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedEventForDetails(event);
                                setShowEventDetailsModal(true);
                              }}
                              className="px-2.5 py-1 rounded text-xs bg-bgElevated border border-borderBase text-cyan-400 hover:border-cyan-500/50 flex items-center font-medium transition-all"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View Comparison
                            </button>

                            {hasPermission('ASSET_UPDATE') && !event.isCorrection && (
                              <button
                                onClick={() => {
                                  setSelectedEventForCorrection(event);
                                  setCorrectionForm({ reason: '', remarks: '', newStatus: '', newCondition: '', newHolderId: '' });
                                  setShowCorrectionModal(true);
                                }}
                                className="px-2.5 py-1 rounded text-xs bg-bgElevated border border-borderBase text-amber-400 hover:border-amber-500/50 flex items-center font-medium transition-all"
                              >
                                <Edit className="w-3.5 h-3.5 mr-1" />
                                Admin Correct
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            /* ══ TABLE VIEW (16 COLUMNS, INTERNAL HORIZONTAL SCROLL) ══ */
            <Card
              title="16-Column Complete Asset History Ledger"
              subtitle="Auditable tabular register with internal horizontal scrolling. Columns are strictly structured per ISO ITAM compliance."
            >
              <div className="overflow-x-auto border border-borderBase rounded-lg">
                <table className="min-w-[1550px] w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-borderBase bg-bgBase text-textSecondary uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-bgBase z-10">1. Date & Time</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">2. Event Type</th>
                      <th className="py-2.5 px-3 whitespace-nowrap min-w-[200px]">3. Description / Reason</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">4. From Employee</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">5. To Employee</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">6. From Department</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">7. To Department</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">8. From Location</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">9. To Location</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">10. Previous Status</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">11. New Status</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">12. Previous Condition</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">13. New Condition</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">14. Performed By</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">15. Related Record</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right sticky right-0 bg-bgBase z-10">16. Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderBase">
                    {historyEvents.map((row) => {
                      const badge = getActionBadge(row.action);
                      return (
                        <tr key={row.id} className="hover:bg-bgBase/70 transition-colors">
                          {/* 1. Date & Time */}
                          <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap text-textPrimary sticky left-0 bg-bgElevated z-10">
                            {new Date(row.eventDate).toLocaleDateString('en-GB')}{' '}
                            <span className="text-textSecondary">
                              {new Date(row.eventDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          {/* 2. Event Type */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                              {badge.label}
                            </span>
                            {row.isCorrection && (
                              <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400">
                                CORR
                              </span>
                            )}
                          </td>

                          {/* 3. Description / Reason */}
                          <td className="py-2 px-3 text-textPrimary text-[11px] max-w-xs truncate" title={row.reason || row.remarks || ''}>
                            {row.reason || row.remarks || '—'}
                          </td>

                          {/* 4. From Employee */}
                          <td className="py-2 px-3 text-rose-300 font-medium whitespace-nowrap">
                            {row.previousHolder || '—'}
                          </td>

                          {/* 5. To Employee */}
                          <td className="py-2 px-3 text-emerald-300 font-medium whitespace-nowrap">
                            {row.newHolder || '—'}
                          </td>

                          {/* 6. From Dept */}
                          <td className="py-2 px-3 text-textSecondary whitespace-nowrap">
                            {row.previousDepartment || '—'}
                          </td>

                          {/* 7. To Dept */}
                          <td className="py-2 px-3 text-textSecondary whitespace-nowrap">
                            {row.newDepartment || '—'}
                          </td>

                          {/* 8. From Loc */}
                          <td className="py-2 px-3 text-textSecondary whitespace-nowrap">
                            {row.previousLocation || '—'}
                          </td>

                          {/* 9. To Loc */}
                          <td className="py-2 px-3 text-textSecondary whitespace-nowrap">
                            {row.newLocation || '—'}
                          </td>

                          {/* 10. Previous Status */}
                          <td className="py-2 px-3 font-mono text-[10px] text-zinc-400 whitespace-nowrap">
                            {row.previousStatus || '—'}
                          </td>

                          {/* 11. New Status */}
                          <td className="py-2 px-3 font-mono text-[10px] text-cyan-300 font-semibold whitespace-nowrap">
                            {row.newStatus || '—'}
                          </td>

                          {/* 12. Previous Condition */}
                          <td className="py-2 px-3 font-mono text-[10px] text-zinc-400 whitespace-nowrap">
                            {row.previousCondition || '—'}
                          </td>

                          {/* 13. New Condition */}
                          <td className="py-2 px-3 font-mono text-[10px] text-purple-300 font-semibold whitespace-nowrap">
                            {row.newCondition || '—'}
                          </td>

                          {/* 14. Performed By */}
                          <td className="py-2 px-3 text-textSecondary whitespace-nowrap font-medium">
                            {row.performedBy || row.performedByName || 'System'}
                          </td>

                          {/* 15. Related Record */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.relatedRecordCode ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-800">
                                {row.relatedRecordCode}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>

                          {/* 16. Actions */}
                          <td className="py-2 px-3 whitespace-nowrap text-right sticky right-0 bg-bgElevated z-10">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => {
                                  setSelectedEventForDetails(row);
                                  setShowEventDetailsModal(true);
                                }}
                                title="View Event Comparison Details"
                                className="p-1 rounded bg-bgBase hover:bg-cyan-950 text-cyan-400 border border-borderBase"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {hasPermission('ASSET_UPDATE') && !row.isCorrection && (
                                <button
                                  onClick={() => {
                                    setSelectedEventForCorrection(row);
                                    setCorrectionForm({ reason: '', remarks: '', newStatus: '', newCondition: '', newHolderId: '' });
                                    setShowCorrectionModal(true);
                                  }}
                                  title="Record Admin Correction"
                                  className="p-1 rounded bg-bgBase hover:bg-amber-950 text-amber-400 border border-borderBase"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 4. Server Pagination Bar */}
          {historyTotalCount > 0 && (
            <div className="bg-bgElevated border border-borderBase rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-textSecondary">
                Showing{' '}
                <strong className="text-textPrimary font-mono">
                  {(historyPage - 1) * historyLimit + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-textPrimary font-mono">
                  {Math.min(historyPage * historyLimit, historyTotalCount)}
                </strong>{' '}
                of <strong className="text-textPrimary font-mono">{historyTotalCount}</strong> recorded events
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-borderBase bg-bgBase text-textPrimary hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </button>

                <span className="text-xs font-mono text-textSecondary px-2">
                  Page <strong className="text-cyan-400">{historyPage}</strong> of{' '}
                  <strong className="text-textPrimary">{historyTotalPages}</strong>
                </span>

                <button
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                  disabled={historyPage >= historyTotalPages}
                  className="px-3 py-1.5 rounded-lg border border-borderBase bg-bgBase text-textPrimary hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 3: WARRANTY & SERVICE CONTRACTS ══ */}
      {activeTab === 'warranty' && (
        <div className="space-y-6">
          {assetWarranties.length === 0 ? (
            <div className="p-12 text-center bg-[#0E131F] border border-[#1E2535] rounded-xl">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Warranty Contracts Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                This asset does not currently have any active or historical warranty contracts registered.
              </p>
              <Button variant="primary" onClick={() => navigate('/warranties')}>
                <Plus className="w-4 h-4 mr-1.5" />
                Register Warranty Contract
              </Button>
            </div>
          ) : (
            assetWarranties.map((w, idx) => (
              <div key={w.id} className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#1E2535] gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs">
                      {w.warrantyCode}
                    </span>
                    <span className="text-sm font-bold text-white">{w.provider}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {w.warrantyType}
                    </span>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        CURRENT CONTRACT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={w.computedStatus || w.status} />
                    <Button variant="outline" size="sm" onClick={() => navigate('/warranties')}>
                      Manage in Warranty Center &rarr;
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Policy / Contract #</span>
                    <span className="text-slate-200 font-mono font-bold">{w.policyNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Start Date</span>
                    <span className="text-slate-200 font-mono">{new Date(w.startDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">End Date</span>
                    <span className="text-slate-200 font-mono">{new Date(w.endDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Days Remaining</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {w.daysRemaining !== undefined ? (w.daysRemaining < 0 ? `Expired (${Math.abs(w.daysRemaining)}d ago)` : `${w.daysRemaining} days`) : '—'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#121624] border border-[#1E2535] rounded-lg text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Coverage Description</span>
                  <p className="text-slate-300">{w.coverageDescription || 'Standard OEM parts & labor coverage.'}</p>
                </div>

                {w.claimContact && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <span>Contact: <strong className="text-slate-200">{w.claimContact}</strong></span>
                    {w.contactEmail && <span>Email: <strong className="text-indigo-400 font-mono">{w.contactEmail}</strong></span>}
                    {w.contactPhone && <span>Phone: <strong className="text-slate-200 font-mono">{w.contactPhone}</strong></span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Asset to Employee">
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <Select
              label="Select Employee"
              value={assignForm.employeeId}
              onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
              options={[{ value: '', label: '-- Select Employee --' }, ...employees.map((emp) => ({ value: emp.id, label: `${emp.fullName} (${emp.employeeCode})` }))]}
              required
            />
            <Input
              label="Expected Return Date"
              type="date"
              value={assignForm.expectedReturnDate}
              onChange={(e) => setAssignForm({ ...assignForm, expectedReturnDate: e.target.value })}
            />
            <Input
              label="Remarks / Assignment Notes"
              value={assignForm.remarks}
              onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
              placeholder="e.g., Assigned for client automation project"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Confirm Assignment</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Asset to New Holder">
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <Select
              label="Select New Employee Holder"
              value={transferForm.newHolderId}
              onChange={(e) => setTransferForm({ ...transferForm, newHolderId: e.target.value })}
              options={[{ value: '', label: '-- Select New Holder --' }, ...employees.map((emp) => ({ value: emp.id, label: `${emp.fullName} (${emp.employeeCode})` }))]}
              required
            />
            <Input
              label="Reason for Transfer"
              value={transferForm.reason}
              onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
              placeholder="e.g., Project rotation"
              required
            />
            <Input
              label="Transfer Remarks"
              value={transferForm.remarks}
              onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
              placeholder="e.g., Handover checklist verified"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Confirm Transfer</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="Return Asset & Condition Check">
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            <Select
              label="Condition At Return"
              value={returnForm.conditionAtReturn}
              onChange={(e) => setReturnForm({ ...returnForm, conditionAtReturn: e.target.value })}
              options={[
                { value: 'EXCELLENT', label: 'Excellent' },
                { value: 'GOOD', label: 'Good' },
                { value: 'FAIR', label: 'Fair' },
                { value: 'DAMAGED', label: 'Damaged' },
              ]}
              required
            />
            <Input
              label="Return Remarks"
              value={returnForm.remarks}
              onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
              placeholder="e.g., Routine hardware refresh"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowReturnModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Confirm Return</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Maintenance Modal */}
      {showMaintModal && (
        <Modal isOpen={showMaintModal} onClose={() => setShowMaintModal(false)} title="Log Maintenance Ticket">
          <form onSubmit={handleMaintSubmit} className="space-y-4">
            <Input
              label="Issue Title"
              value={maintForm.issueTitle}
              onChange={(e) => setMaintForm({ ...maintForm, issueTitle: e.target.value })}
              placeholder="e.g., Display flickering"
              required
            />
            <Input
              label="Issue Description"
              value={maintForm.issueDescription}
              onChange={(e) => setMaintForm({ ...maintForm, issueDescription: e.target.value })}
              placeholder="Provide detailed description of hardware failure"
              required
            />
            <Input
              label="Technician / Service Provider"
              value={maintForm.technician}
              onChange={(e) => setMaintForm({ ...maintForm, technician: e.target.value })}
              placeholder="e.g., In-house IT or Vendor"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowMaintModal(false)}>Cancel</Button>
              <Button variant="danger" type="submit" loading={actionLoading}>Open Ticket</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Hardware Configuration Modal */}
      {showHardwareModal && (
        <Modal
          isOpen={showHardwareModal}
          onClose={() => setShowHardwareModal(false)}
          title="Edit Hardware Configuration"
          subtitle={`Configure hardware components and accessories for ${asset.companyAssetId || asset.assetCode}`}
          maxWidth="lg"
        >
          <form onSubmit={handleHardwareSubmit} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="CPU Processor"
                value={hardwareForm.cpu}
                onChange={(e) => setHardwareForm({ ...hardwareForm, cpu: e.target.value })}
                placeholder="e.g. Intel Core i5"
              />
              <Input
                label="RAM Capacity"
                value={hardwareForm.ram}
                onChange={(e) => setHardwareForm({ ...hardwareForm, ram: e.target.value })}
                placeholder="e.g. 16 GB"
              />
              <Input
                label="Storage"
                value={hardwareForm.storage}
                onChange={(e) => setHardwareForm({ ...hardwareForm, storage: e.target.value })}
                placeholder="e.g. 512 GB SSD"
              />
              <Input
                label="Monitor"
                value={hardwareForm.monitor}
                onChange={(e) => setHardwareForm({ ...hardwareForm, monitor: e.target.value })}
                placeholder='e.g. Dell 24"'
              />
              <Input
                label="Keyboard"
                value={hardwareForm.keyboard}
                onChange={(e) => setHardwareForm({ ...hardwareForm, keyboard: e.target.value })}
                placeholder="e.g. Dell USB"
              />
              <Input
                label="Mouse"
                value={hardwareForm.mouse}
                onChange={(e) => setHardwareForm({ ...hardwareForm, mouse: e.target.value })}
                placeholder="e.g. Dell USB"
              />
              <Input
                label="Charger / Adapter"
                value={hardwareForm.chargerAdapter}
                onChange={(e) => setHardwareForm({ ...hardwareForm, chargerAdapter: e.target.value })}
                placeholder="e.g. 65W"
              />
              <Input
                label="Other Hardware"
                value={hardwareForm.otherHardware}
                onChange={(e) => setHardwareForm({ ...hardwareForm, otherHardware: e.target.value })}
                placeholder="e.g. Docking Station"
              />
            </div>

            <Input
              label="Change Reason / Upgrade Notes (Optional)"
              value={hardwareForm.reason}
              onChange={(e) => setHardwareForm({ ...hardwareForm, reason: e.target.value })}
              placeholder="e.g. Upgrade"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setShowHardwareModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={actionLoading} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirm Asset Deletion"
          subtitle="Review historical dependencies before proceeding."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <p className="font-semibold text-sm text-white mb-1">
                Delete Asset {asset.companyAssetId || asset.assetCode}?
              </p>
              <p className="text-rose-200/90 text-xs leading-relaxed">
                If this asset has associated assignments, maintenance tickets, or handover records, it will be safely retired and deactivated to preserve historical audit trails. If it has no historical records, it will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteLoading}
                onClick={handleDeleteAsset}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              >
                Confirm Deletion
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ EVENT DETAILS & STATE COMPARISON MODAL ══ */}
      {showEventDetailsModal && selectedEventForDetails && (
        <Modal
          isOpen={showEventDetailsModal}
          onClose={() => { setShowEventDetailsModal(false); setSelectedEventForDetails(null); }}
          title={`Audit Inspection: Event #${selectedEventForDetails.id.slice(0, 8)}`}
          subtitle="Immutable historical state transition record from PostgreSQL."
          maxWidth="xl"
        >
          <div className="space-y-5 text-xs font-sans">
            {/* Top Event Metadata Header */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {(() => {
                  const b = getActionBadge(selectedEventForDetails.action);
                  return (
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase border ${b.color}`}>
                      {b.label}
                    </span>
                  );
                })()}

                {selectedEventForDetails.isCorrection && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                    Correction Entry
                  </span>
                )}

                {selectedEventForDetails.relatedRecordCode && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-800">
                    Record: #{selectedEventForDetails.relatedRecordCode}
                  </span>
                )}
              </div>

              <div className="text-right text-[11px] font-mono text-textSecondary">
                <span>{new Date(selectedEventForDetails.eventDate).toLocaleDateString('en-GB')}</span>{' '}
                <span className="text-textPrimary font-bold">
                  {new Date(selectedEventForDetails.eventDate).toLocaleTimeString('en-GB')}
                </span>
              </div>
            </div>

            {/* Correction Explanation Banner */}
            {selectedEventForDetails.isCorrection && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
                <strong className="block text-yellow-200 mb-0.5 font-semibold">Administrative Correction Notice:</strong>
                <p className="text-xs">{selectedEventForDetails.correctionReason || 'Administrative adjustment recorded.'}</p>
                {selectedEventForDetails.correctedHistoryId && (
                  <p className="text-[10px] font-mono text-yellow-400/80 mt-1">
                    Linked to Original Event: {selectedEventForDetails.correctedHistoryId}
                  </p>
                )}
              </div>
            )}

            {/* Before vs After Comparison Grid */}
            <div className="border border-borderBase rounded-xl overflow-hidden">
              <div className="bg-bgElevated p-2.5 border-b border-borderBase font-semibold text-textPrimary flex items-center justify-between">
                <span className="uppercase text-[10px] tracking-wider text-cyan-400 font-bold">
                  Asset State Transition (Before vs After)
                </span>
                <span className="text-[10px] text-textSecondary font-mono">Real-Time Audit Diff</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-borderBase bg-bgBase">
                {/* BEFORE STATE */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center space-x-1.5 text-rose-400 font-bold text-[11px] uppercase border-b border-borderBase pb-1.5">
                    <span>State Before Event</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Custodian:</span>
                      <span className="font-semibold text-rose-300">{selectedEventForDetails.previousHolder || 'IT STOCK'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Department:</span>
                      <span className="text-textPrimary">{selectedEventForDetails.previousDepartment || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Location:</span>
                      <span className="text-textPrimary">{selectedEventForDetails.previousLocation || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Status:</span>
                      <span className="font-mono text-zinc-400">{selectedEventForDetails.previousStatus || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Allocation:</span>
                      <span className="font-mono text-zinc-400">{selectedEventForDetails.previousAllocationStatus || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Condition:</span>
                      <span className="font-mono text-zinc-400">{selectedEventForDetails.previousCondition || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* AFTER STATE */}
                <div className="p-4 space-y-3 bg-bgElevated/30">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-[11px] uppercase border-b border-borderBase pb-1.5">
                    <span>State After Event</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Custodian:</span>
                      <span className="font-semibold text-emerald-300">{selectedEventForDetails.newHolder || 'IT STOCK'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Department:</span>
                      <span className="text-textPrimary">{selectedEventForDetails.newDepartment || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Location:</span>
                      <span className="text-textPrimary">{selectedEventForDetails.newLocation || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Status:</span>
                      <span className="font-mono text-cyan-300 font-semibold">{selectedEventForDetails.newStatus || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Allocation:</span>
                      <span className="font-mono text-cyan-300 font-semibold">{selectedEventForDetails.newAllocationStatus || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Condition:</span>
                      <span className="font-mono text-purple-300 font-semibold">{selectedEventForDetails.newCondition || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Reason & Remarks */}
            <div className="p-3.5 rounded-xl bg-bgBase border border-borderBase space-y-2">
              <div>
                <span className="text-[10px] text-textSecondary uppercase font-semibold block">Operational Reason</span>
                <p className="text-textPrimary mt-0.5">{selectedEventForDetails.reason || 'None specified.'}</p>
              </div>
              <div className="border-t border-borderBase pt-2">
                <span className="text-[10px] text-textSecondary uppercase font-semibold block">Audit Remarks</span>
                <p className="text-textSecondary italic mt-0.5">"{selectedEventForDetails.remarks || 'Standard automated lifecycle logging.'}"</p>
              </div>
            </div>

            {/* Personnel Accountability */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-bgElevated rounded-lg border border-borderBase text-[11px]">
              <div>
                <span className="text-textSecondary uppercase block text-[10px]">Actor / Performed By</span>
                <span className="font-bold text-textPrimary">
                  {selectedEventForDetails.performedBy || selectedEventForDetails.performedByName || 'System'}
                </span>
              </div>
              <div>
                <span className="text-textSecondary uppercase block text-[10px]">Approver</span>
                <span className="font-bold text-textPrimary">
                  {selectedEventForDetails.approvedBy || selectedEventForDetails.approvedByName || 'Not Required / System'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-borderBase">
              <Button variant="secondary" onClick={() => { setShowEventDetailsModal(false); setSelectedEventForDetails(null); }}>
                Close Inspection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ ADMIN CORRECTION MODAL ══ */}
      {showCorrectionModal && selectedEventForCorrection && (
        <Modal
          isOpen={showCorrectionModal}
          onClose={() => { setShowCorrectionModal(false); setSelectedEventForCorrection(null); }}
          title={`Administrative Correction: Event #${selectedEventForCorrection.id.slice(0, 8)}`}
          subtitle="Audit-compliant correction workflow. The original historical event will remain immutable and preserved."
          maxWidth="md"
        >
          <form onSubmit={handleCorrectionSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <p className="font-semibold text-xs text-white mb-0.5">
                Target Event: {selectedEventForCorrection.action} ({new Date(selectedEventForCorrection.eventDate).toLocaleDateString('en-GB')})
              </p>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Per Section 27, historical entries cannot be silently edited or deleted. Submitting this form appends a verified <strong className="text-white">CORRECTION_RECORDED</strong> entry linked to this record and logs an audit log entry.
              </p>
            </div>

            <Input
              label="Correction Justification / Reason (Mandatory)"
              value={correctionForm.reason}
              onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
              placeholder="e.g. Correcting holder designation per IT audit review"
              required
            />

            <Input
              label="Additional Correction Remarks (Optional)"
              value={correctionForm.remarks}
              onChange={(e) => setCorrectionForm({ ...correctionForm, remarks: e.target.value })}
              placeholder="e.g. Verified with HR documentation #HR-9821"
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Corrected Status (Optional)"
                value={correctionForm.newStatus}
                onChange={(e) => setCorrectionForm({ ...correctionForm, newStatus: e.target.value })}
                options={[
                  { value: '', label: '-- Keep Current --' },
                  { value: 'AVAILABLE', label: 'AVAILABLE' },
                  { value: 'IN_USE', label: 'IN_USE' },
                  { value: 'UNDER_REPAIR', label: 'UNDER_REPAIR' },
                  { value: 'RETIRED', label: 'RETIRED' },
                  { value: 'DAMAGED', label: 'DAMAGED' },
                ]}
              />

              <Select
                label="Corrected Condition (Optional)"
                value={correctionForm.newCondition}
                onChange={(e) => setCorrectionForm({ ...correctionForm, newCondition: e.target.value })}
                options={[
                  { value: '', label: '-- Keep Current --' },
                  { value: 'EXCELLENT', label: 'EXCELLENT' },
                  { value: 'GOOD', label: 'GOOD' },
                  { value: 'FAIR', label: 'FAIR' },
                  { value: 'DAMAGED', label: 'DAMAGED' },
                  { value: 'CRITICAL', label: 'CRITICAL' },
                ]}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
              <Button
                variant="secondary"
                type="button"
                onClick={() => { setShowCorrectionModal(false); setSelectedEventForCorrection(null); }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={correctionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                Record Administrative Correction
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
