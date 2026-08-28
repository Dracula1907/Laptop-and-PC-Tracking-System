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
import { exportToExcel } from '../utils/exporters';
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
} from 'lucide-react';

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [asset, setAsset] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<any[]>([]);

  // History states
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [lastMovement, setLastMovement] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyFilterAction, setHistoryFilterAction] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');

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

  const fetchHistory = async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const query = new URLSearchParams();
      if (historyFilterAction) query.set('action', historyFilterAction);
      if (historySearch) query.set('search', historySearch);
      const res: any = await api.get(`/assets/${id}/history?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setHistoryEvents(data.events || []);
        if (data.lastMovement) setLastMovement(data.lastMovement);
      }
    } catch (err) {
      console.error('Failed to load asset history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
    fetchHistory();

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
  }, [id, historyFilterAction, historySearch]);

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
    const exportData = historyEvents.map((e: any) => ({
      'Asset ID': asset.companyAssetId || asset.assetCode,
      'Event Date': new Date(e.eventDate).toLocaleDateString('en-GB'),
      'Event Time': new Date(e.eventDate).toLocaleTimeString('en-GB'),
      'Event Type': e.action,
      'Previous Holder': e.previousHolder || '—',
      'New Holder': e.newHolder || '—',
      'Previous Department': e.previousDepartment || '—',
      'New Department': e.newDepartment || '—',
      'Previous Location': e.previousLocation || '—',
      'New Location': e.newLocation || '—',
      'Previous Status': e.previousStatus || '—',
      'New Status': e.newStatus || '—',
      'Condition': e.newCondition || e.previousCondition || '—',
      'Performed By': e.performedBy || 'System',
      'Approved By': e.approvedBy || '—',
      'Reason': e.reason || '—',
      'Remarks': e.remarks || '—',
    }));
    exportToExcel(exportData, `FAITH_Asset_History_${asset.companyAssetId || asset.assetCode}`);
    showToast('Asset history spreadsheet exported.', 'success');
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
        return { label: 'Asset Registered', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', dot: 'bg-cyan-400' };
      case 'ASSIGNED':
        return { label: 'Assigned', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' };
      case 'TRANSFERRED':
        return { label: 'Transferred', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', dot: 'bg-cyan-400' };
      case 'RETURNED':
        return { label: 'Returned', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-400' };
      case 'MAINTENANCE_STARTED':
        return { label: 'Maintenance Started', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' };
      case 'MAINTENANCE_COMPLETED':
        return { label: 'Maintenance Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' };
      case 'STATUS_CHANGED':
        return { label: 'Status Changed', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-400' };
      case 'CONDITION_CHANGED':
        return { label: 'Condition Changed', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-400' };
      case 'DEPARTMENT_CHANGED':
        return { label: 'Department Changed', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', dot: 'bg-teal-400' };
      case 'LOCATION_CHANGED':
        return { label: 'Location Changed', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20', dot: 'bg-sky-400' };
      case 'DAMAGED':
        return { label: 'Damaged', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-400' };
      case 'LOST':
      case 'SCRAPPED':
        return { label: action.replace('_', ' '), color: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-400' };
      case 'RETIRED':
        return { label: 'Retired', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', dot: 'bg-zinc-400' };
      default:
        return { label: action.replace('_', ' '), color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', dot: 'bg-zinc-400' };
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

      {/* ══ SUMMARY CARDS: CURRENT STATE & LAST ACTIVITY ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CURRENT STATE CARD */}
        <div className="bg-bgElevated border border-borderBase rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-borderBase pb-2.5 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center">
              <User className="w-3.5 h-3.5 mr-1.5" />
              Current State
            </span>
            <span className="text-[11px] text-textSecondary font-mono">
              Status: <strong className="text-textPrimary">{asset.status}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-textSecondary uppercase block">Assigned To</span>
              <p className="text-sm font-bold text-textPrimary mt-0.5 truncate">
                {asset.currentHolder?.fullName || asset.employeeNameSource || asset.holderDisplayName || 'IT STOCK'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-textSecondary uppercase block">Department / Area</span>
              <p className="text-sm font-semibold text-textPrimary mt-0.5 truncate">
                {asset.department?.name || asset.location || '—'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-textSecondary uppercase block">Current Location</span>
              <p className="text-xs text-textSecondary mt-0.5 truncate">
                {asset.locationRel?.name || asset.location || 'IT Area'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-textSecondary uppercase block">Assigned Since</span>
              <p className="text-xs font-mono text-cyan-400 mt-0.5">
                {allocDateFormatted !== '—'
                  ? allocDateFormatted
                  : lastMovement?.eventDate
                  ? new Date(lastMovement.eventDate).toLocaleDateString('en-GB')
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* LAST ACTIVITY CARD */}
        <div className="bg-bgElevated border border-borderBase rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-borderBase pb-2.5 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Last Movement / Activity
            </span>
            {lastMovement?.action && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {lastMovement.action.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-textSecondary uppercase block">Date & Time</span>
              <p className="text-xs font-mono text-textPrimary mt-0.5">
                {lastMovement?.eventDate
                  ? `${new Date(lastMovement.eventDate).toLocaleDateString('en-GB')} ${new Date(lastMovement.eventDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-textSecondary uppercase block">Performed By</span>
              <p className="text-xs font-semibold text-textPrimary mt-0.5">
                {lastMovement?.performedBy || 'System Admin'}
              </p>
            </div>
            <div className="col-span-2 bg-bgBase p-2 rounded border border-borderBase flex items-center justify-between text-[11px]">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-textSecondary block">From:</span>
                <span className="font-semibold text-rose-300 truncate block">{lastMovement?.previousHolder || 'IT STOCK'}</span>
                {lastMovement?.previousDepartment && lastMovement.previousDepartment !== '—' && (
                  <span className="text-textSecondary text-[10px] truncate block">({lastMovement.previousDepartment})</span>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400 mx-2 shrink-0" />
              <div className="min-w-0 pl-2 text-right">
                <span className="text-[10px] text-textSecondary block">To:</span>
                <span className="font-semibold text-emerald-300 truncate block">{lastMovement?.newHolder || 'IT STOCK'}</span>
                {lastMovement?.newDepartment && lastMovement.newDepartment !== '—' && (
                  <span className="text-textSecondary text-[10px] truncate block">({lastMovement.newDepartment})</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
          {/* History Control & Filter Bar */}
          <div className="bg-bgElevated border border-borderBase rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search holders, departments, reasons..."
                  className="w-full bg-bgBase border border-borderBase rounded-lg pl-9 pr-3 py-1.5 text-xs text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="w-48">
                <Select
                  value={historyFilterAction}
                  onChange={(e) => setHistoryFilterAction(e.target.value)}
                  options={[
                    { value: '', label: 'All Event Types' },
                    { value: 'ASSIGNED', label: 'Assigned' },
                    { value: 'TRANSFERRED', label: 'Transferred' },
                    { value: 'RETURNED', label: 'Returned' },
                    { value: 'MAINTENANCE_STARTED,MAINTENANCE_COMPLETED', label: 'Maintenance' },
                    { value: 'STATUS_CHANGED,CONDITION_CHANGED', label: 'Status / Condition' },
                    { value: 'ASSET_CREATED,CREATED', label: 'Registration' },
                  ]}
                />
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={handleExportHistory}
              className="text-xs text-textPrimary hover:border-emerald-500/50"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export History (Excel)
            </Button>
          </div>

          {historyLoading ? (
            <div className="py-12 text-center text-textSecondary">
              <div className="inline-block w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-xs">Loading complete asset history...</p>
            </div>
          ) : historyEvents.length === 0 ? (
            <div className="p-8 text-center bg-bgElevated border border-borderBase rounded-xl text-textSecondary text-xs">
              No historical events found matching your search.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Visual Timeline Section */}
              <Card
                title="Historical Chain of Custody Timeline"
                subtitle="Chronological sequence of device registration, assignments, transfers, and maintenance events."
              >
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-borderBase">
                  {historyEvents.map((event) => {
                    const badge = getActionBadge(event.action);
                    return (
                      <div key={event.id} className="relative group">
                        {/* Timeline Marker Dot */}
                        <div
                          className={`absolute -left-[27px] sm:-left-[35px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-bgElevated ${badge.dot} shadow-[0_0_8px_rgba(34,199,214,0.4)]`}
                        />

                        {/* Event Card */}
                        <div className="bg-bgBase border border-borderBase hover:border-[#4D525E] transition-all rounded-xl p-4 space-y-3">
                          {/* Event Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderBase pb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border ${badge.color}`}>
                                {badge.label}
                              </span>
                              <span className="text-xs font-mono text-textPrimary">
                                {new Date(event.eventDate).toLocaleDateString('en-GB')}
                              </span>
                              <span className="text-[11px] font-mono text-textSecondary">
                                {new Date(event.eventDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <span className="text-[11px] text-textSecondary">
                              Logged by: <strong className="text-textPrimary">{event.performedBy}</strong>
                            </span>
                          </div>

                          {/* From → To Chain Information */}
                          {(event.action === 'TRANSFERRED' || event.action === 'ASSIGNED' || event.action === 'RETURNED') && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-bgElevated p-3 rounded-lg border border-borderBase text-xs">
                              <div>
                                <span className="text-[10px] text-textSecondary uppercase font-semibold block">FROM</span>
                                <p className="font-bold text-rose-300 mt-0.5">
                                  {event.previousHolder || 'IT STOCK'}
                                </p>
                                <p className="text-textSecondary text-[11px]">
                                  Dept: {event.previousDepartment || '—'} | Loc: {event.previousLocation || '—'}
                                </p>
                              </div>
                              <div className="sm:border-l sm:border-borderBase sm:pl-3">
                                <span className="text-[10px] text-textSecondary uppercase font-semibold block">TO</span>
                                <p className="font-bold text-emerald-300 mt-0.5">
                                  {event.newHolder || 'IT STOCK'}
                                </p>
                                <p className="text-textSecondary text-[11px]">
                                  Dept: {event.newDepartment || '—'} | Loc: {event.newLocation || '—'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Status / Condition Changes */}
                          {(event.action === 'STATUS_CHANGED' || event.action === 'CONDITION_CHANGED') && (
                            <div className="bg-bgElevated p-3 rounded-lg border border-borderBase text-xs flex items-center gap-3">
                              <span className="text-textSecondary">Transition:</span>
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                                {event.previousStatus || event.previousCondition || '—'}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
                                {event.newStatus || event.newCondition || '—'}
                              </span>
                            </div>
                          )}

                          {/* Reason & Remarks */}
                          <div className="text-xs space-y-1">
                            {event.reason && (
                              <p className="text-textPrimary">
                                <strong className="text-textSecondary">Reason:</strong> {event.reason}
                              </p>
                            )}
                            {event.remarks && (
                              <p className="text-textSecondary text-[11.5px] italic">
                                "{event.remarks}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Detailed History Table */}
              <Card
                title="Detailed History Ledger"
                subtitle="Complete audit register with date, timestamp, movement parties, and operational reasoning."
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-borderBase bg-bgBase text-textSecondary uppercase font-mono text-[10px]">
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Event</th>
                        <th className="py-2.5 px-3">From</th>
                        <th className="py-2.5 px-3">To</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Condition</th>
                        <th className="py-2.5 px-3">Performed By</th>
                        <th className="py-2.5 px-3">Reason / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderBase">
                      {historyEvents.map((row) => (
                        <tr key={row.id} className="hover:bg-bgBase/60 transition-colors">
                          <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap text-textPrimary">
                            {new Date(row.eventDate).toLocaleDateString('en-GB')}{' '}
                            <span className="text-textSecondary">
                              {new Date(row.eventDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-bgElevated border border-borderBase text-cyan-400">
                              {row.action}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-rose-300 font-medium whitespace-nowrap">
                            {row.previousHolder || '—'}
                          </td>
                          <td className="py-2 px-3 text-emerald-300 font-medium whitespace-nowrap">
                            {row.newHolder || '—'}
                          </td>
                          <td className="py-2 px-3 text-textSecondary whitespace-nowrap">
                            {row.newDepartment && row.newDepartment !== '—'
                              ? row.newDepartment
                              : row.previousDepartment || '—'}
                          </td>
                          <td className="py-2 px-3 text-textSecondary whitespace-nowrap">
                            {row.newLocation && row.newLocation !== '—'
                              ? row.newLocation
                              : row.previousLocation || '—'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-textPrimary whitespace-nowrap">
                            {row.newStatus || row.previousStatus || '—'}
                          </td>
                          <td className="py-2 px-3 text-textSecondary whitespace-nowrap">
                            {row.newCondition || row.previousCondition || '—'}
                          </td>
                          <td className="py-2 px-3 text-textSecondary whitespace-nowrap font-medium">
                            {row.performedBy}
                          </td>
                          <td className="py-2 px-3 text-textSecondary text-[11px] max-w-xs truncate" title={row.reason || row.remarks || ''}>
                            {row.reason || row.remarks || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
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
    </div>
  );
};
