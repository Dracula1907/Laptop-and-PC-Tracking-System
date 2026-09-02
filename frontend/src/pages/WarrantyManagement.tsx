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
import {
  Warranty,
  WarrantyClaim,
  WarrantyCounts,
  WarrantyType,
  CoverageStatus,
  ClaimStatus,
  Asset,
} from '../types';
import {
  exportWarrantiesToExcel,
  exportWarrantyClaimsToExcel,
} from '../utils/exporters';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  FileSpreadsheet,
  Plus,
  Eye,
  Edit2,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Laptop,
  Building,
  User,
  Phone,
  Mail,
  Receipt,
  FileText,
  FilterX,
  History,
  AlertCircle,
  Ban,
  Wrench,
} from 'lucide-react';

export const WarrantyManagement: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [counts, setCounts] = useState<WarrantyCounts>({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expiringIn30Days: 0,
    expiringIn90Days: 0,
    expired: 0,
    cancelled: 0,
    openClaims: 0,
    resolvedClaims: 0,
  });
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Tab: 'all' | 'expiring_soon' | 'expired' | 'claims'
  const [activeTab, setActiveTab] = useState<'all' | 'expiring_soon' | 'expired' | 'claims'>('all');

  // Filter & Pagination State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [warrantyTypeFilter, setWarrantyTypeFilter] = useState<string>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [expiryRangeFilter, setExpiryRangeFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Modals State
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedWarranty, setSelectedWarranty] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addStep, setAddStep] = useState<number>(1);
  const [assetSearch, setAssetSearch] = useState<string>('');
  const [assetOptions, setAssetOptions] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [extendTarget, setExtendTarget] = useState<Warranty | null>(null);
  const [extensionMonths, setExtensionMonths] = useState<number>(12);
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [extensionCost, setExtensionCost] = useState<string>('');

  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [claimTargetWarranty, setClaimTargetWarranty] = useState<Warranty | null>(null);
  const [claimForm, setClaimForm] = useState({
    issue: '',
    description: '',
    provider: '',
    claimCost: '',
    coveredAmount: '',
    outOfPocketAmount: '',
    remarks: '',
  });

  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State for Adding Warranty
  const [formData, setFormData] = useState({
    warrantyType: 'STANDARD' as WarrantyType,
    provider: '',
    policyNumber: '',
    coverageDescription: 'Comprehensive hardware parts & onsite labor coverage.',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseReference: '',
    warrantyCost: '',
    claimContact: '',
    contactEmail: '',
    contactPhone: '',
    coverageNotes: '',
  });

  // Fetch telemetry counts
  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/warranties/counts');
      if (res.success) setCounts(res.data);
    } catch (err) {
      console.error('Failed to fetch warranty counts:', err);
    }
  };

  // Fetch providers dropdown list
  const fetchProviders = async () => {
    try {
      const res: any = await api.get('/warranties/providers');
      if (res.success) setProviders(res.data);
    } catch (err) {}
  };

  // Fetch warranties with filters & search
  const fetchWarranties = useCallback(async () => {
    if (activeTab === 'claims') return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (warrantyTypeFilter !== 'ALL') params.append('warrantyType', warrantyTypeFilter);
      if (providerFilter !== 'ALL') params.append('provider', providerFilter);

      // Handle Tab states
      if (activeTab === 'expiring_soon') {
        params.append('expiryRange', '30_DAYS');
      } else if (activeTab === 'expired') {
        params.append('status', 'EXPIRED');
      } else {
        if (statusFilter !== 'ALL') params.append('status', statusFilter);
        if (expiryRangeFilter !== 'ALL') params.append('expiryRange', expiryRangeFilter);
      }

      const res: any = await api.get(`/warranties?${params.toString()}`);
      if (res.success) {
        setWarranties(res.data.warranties);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalRecords(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch warranties:', err);
      showToast('Error loading warranties.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, warrantyTypeFilter, providerFilter, expiryRangeFilter, activeTab]);

  // Fetch claims
  const fetchClaims = useCallback(async () => {
    if (activeTab !== 'claims') return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (providerFilter !== 'ALL') params.append('provider', providerFilter);

      const res: any = await api.get(`/warranties/claims?${params.toString()}`);
      if (res.success) {
        setClaims(res.data.claims);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalRecords(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch claims:', err);
      showToast('Error loading warranty claims.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, providerFilter, activeTab]);

  useEffect(() => {
    fetchCounts();
    fetchProviders();
  }, []);

  useEffect(() => {
    if (activeTab === 'claims') {
      fetchClaims();
    } else {
      fetchWarranties();
    }
  }, [fetchWarranties, fetchClaims, activeTab]);

  // Handle Tab Change
  const handleTabChange = (tab: 'all' | 'expiring_soon' | 'expired' | 'claims') => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setWarrantyTypeFilter('ALL');
    setProviderFilter('ALL');
    setExpiryRangeFilter('ALL');
    setPage(1);
  };

  // Open Details Modal
  const openDetailModal = async (id: string) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res: any = await api.get(`/warranties/${id}`);
      if (res.success) setSelectedWarranty(res.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load warranty details.', 'error');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Search Assets for Add Warranty Modal
  const searchAssets = async (query: string) => {
    try {
      const res: any = await api.get(`/warranties/asset-options?search=${encodeURIComponent(query)}`);
      if (res.success) setAssetOptions(res.data);
    } catch (err) {}
  };

  const openAddModal = () => {
    setAddStep(1);
    setSelectedAsset(null);
    setAssetSearch('');
    setFormData({
      warrantyType: 'STANDARD',
      provider: '',
      policyNumber: '',
      coverageDescription: 'Comprehensive hardware parts & onsite labor coverage.',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseReference: '',
      warrantyCost: '',
      claimContact: '',
      contactEmail: '',
      contactPhone: '',
      coverageNotes: '',
    });
    searchAssets('');
    setShowAddModal(true);
  };

  const handleCreateWarrantySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      showToast('Please select a target asset first.', 'error');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      showToast('End date cannot be earlier than start date.', 'error');
      return;
    }
    if (formData.purchaseDate && new Date(formData.purchaseDate) > new Date(formData.startDate)) {
      showToast('Purchase date cannot be after warranty start date.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        assetId: selectedAsset.id,
        warrantyType: formData.warrantyType,
        provider: formData.provider.trim(),
        policyNumber: formData.policyNumber.trim() || undefined,
        coverageDescription: formData.coverageDescription.trim() || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        purchaseDate: formData.purchaseDate || undefined,
        purchaseReference: formData.purchaseReference.trim() || undefined,
        warrantyCost: formData.warrantyCost ? parseFloat(formData.warrantyCost) : undefined,
        claimContact: formData.claimContact.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        coverageNotes: formData.coverageNotes.trim() || undefined,
      };

      const res: any = await api.post('/warranties', payload);
      if (res.success) {
        showToast('Warranty contract registered successfully.', 'success');
        setShowAddModal(false);
        fetchWarranties();
        fetchCounts();
        fetchProviders();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create warranty.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Extend Modal
  const openExtendModal = (w: Warranty) => {
    setExtendTarget(w);
    setExtensionMonths(12);
    setExtensionReason('Annual hardware maintenance coverage extension');
    setExtensionCost('');
    setShowExtendModal(true);
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendTarget) return;

    const currentEnd = new Date(extendTarget.endDate);
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + extensionMonths);

    setSubmitting(true);
    try {
      const payload = {
        newEndDate: newEnd.toISOString().slice(0, 10),
        extensionReason: extensionReason.trim(),
        warrantyCost: extensionCost ? parseFloat(extensionCost) : undefined,
      };

      const res: any = await api.post(`/warranties/${extendTarget.id}/extend`, payload);
      if (res.success) {
        showToast('Warranty extension granted and recorded successfully.', 'success');
        setShowExtendModal(false);
        if (showDetailModal) setShowDetailModal(false);
        fetchWarranties();
        fetchCounts();
      }
    } catch (err: any) {
      showToast(err.message || 'Extension failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Claim Modal
  const openClaimModal = (w: Warranty) => {
    setClaimTargetWarranty(w);
    setClaimForm({
      issue: '',
      description: '',
      provider: w.provider,
      claimCost: '',
      coveredAmount: '',
      outOfPocketAmount: '',
      remarks: '',
    });
    setShowClaimModal(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTargetWarranty) return;

    setSubmitting(true);
    try {
      const payload = {
        warrantyId: claimTargetWarranty.id,
        assetId: claimTargetWarranty.assetId,
        issue: claimForm.issue.trim(),
        description: claimForm.description.trim(),
        provider: claimForm.provider.trim(),
        claimCost: claimForm.claimCost ? parseFloat(claimForm.claimCost) : undefined,
        coveredAmount: claimForm.coveredAmount ? parseFloat(claimForm.coveredAmount) : undefined,
        outOfPocketAmount: claimForm.outOfPocketAmount ? parseFloat(claimForm.outOfPocketAmount) : undefined,
        remarks: claimForm.remarks.trim() || undefined,
      };

      const res: any = await api.post('/warranties/claims', payload);
      if (res.success) {
        showToast('Warranty claim registered successfully.', 'success');
        setShowClaimModal(false);
        if (showDetailModal) openDetailModal(claimTargetWarranty.id);
        fetchWarranties();
        fetchCounts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to file claim.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Warranty
  const openCancelModal = (id: string) => {
    setCancelTargetId(id);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTargetId || !cancelReason.trim()) return;

    setSubmitting(true);
    try {
      const res: any = await api.post(`/warranties/${cancelTargetId}/cancel`, {
        cancellationReason: cancelReason.trim(),
      });
      if (res.success) {
        showToast('Warranty contract cancelled.', 'success');
        setShowCancelModal(false);
        if (showDetailModal) setShowDetailModal(false);
        fetchWarranties();
        fetchCounts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel warranty.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Render Days Remaining Badge
  const renderDaysRemainingBadge = (days?: number, daysSince?: number) => {
    if (days === undefined) return <span className="text-slate-500">—</span>;

    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3 h-3" /> Expired ({daysSince || Math.abs(days)}d ago)
        </span>
      );
    }

    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
          <AlertTriangle className="w-3 h-3" /> {days} days (Urgent)
        </span>
      );
    }

    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-3 h-3" /> {days} days left
        </span>
      );
    }

    if (days <= 90) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
          {days} days (Notice)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" /> {days} days
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Warranty & Contract Management"
        subtitle="Authoritative hardware coverage tracking, automated expiry monitoring, SLA governance, and warranty claims."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (activeTab === 'claims') {
                  exportWarrantyClaimsToExcel(claims);
                  showToast('Warranty Claims Excel generated.', 'success');
                } else {
                  exportWarrantiesToExcel(warranties);
                  showToast('Warranties Excel generated.', 'success');
                }
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel (XLSX)
            </Button>
            <Button variant="primary" onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Register Warranty
            </Button>
          </div>
        }
      />

      {/* Summary Telemetry Cards from PostgreSQL */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => handleTabChange('all')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#151D2A] border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-400 font-mono uppercase">Total Warranties</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{counts.total}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Stored hardware contracts</span>
        </div>

        <div
          onClick={() => {
            handleTabChange('all');
            setStatusFilter('ACTIVE');
          }}
          className="p-3.5 rounded-xl border border-[#1E2535] bg-[#0E131F]/80 hover:border-emerald-500/60 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 font-mono uppercase">Active Coverage</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-300 mt-1 font-mono">{counts.active}</p>
          <span className="text-[10px] text-emerald-500/80 mt-0.5 block">&gt; 30 days validity remaining</span>
        </div>

        <div
          onClick={() => handleTabChange('expiring_soon')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'expiring_soon'
              ? 'bg-[#151D2A] border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400 font-mono uppercase">Expiring Soon (30d)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1 font-mono">{counts.expiringIn30Days}</p>
          <span className="text-[10px] text-amber-500/80 mt-0.5 block">Requires renewal attention</span>
        </div>

        <div
          onClick={() => handleTabChange('expired')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'expired'
              ? 'bg-[#151D2A] border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-rose-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-400 font-mono uppercase">Expired Warranties</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-300 mt-1 font-mono">{counts.expired}</p>
          <span className="text-[10px] text-rose-500/80 mt-0.5 block">Out of OEM coverage</span>
        </div>

        <div
          onClick={() => handleTabChange('claims')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'claims'
              ? 'bg-[#151D2A] border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-indigo-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-400 font-mono uppercase">Open Claims</span>
            <Wrench className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-300 mt-1 font-mono">{counts.openClaims}</p>
          <span className="text-[10px] text-indigo-500/80 mt-0.5 block">
            {counts.resolvedClaims} resolved claims
          </span>
        </div>
      </div>

      {/* Tabs Switcher Navigation */}
      <div className="border-b border-[#1E2535] flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs font-semibold">
          <button
            onClick={() => handleTabChange('all')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'all'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            All Warranties ({counts.total})
          </button>
          <button
            onClick={() => handleTabChange('expiring_soon')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'expiring_soon'
                ? 'border-amber-500 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Expiring in 30 Days ({counts.expiringIn30Days})
          </button>
          <button
            onClick={() => handleTabChange('expired')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'expired'
                ? 'border-rose-500 text-rose-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Expired ({counts.expired})
          </button>
          <button
            onClick={() => handleTabChange('claims')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'claims'
                ? 'border-emerald-500 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Warranty Claims ({counts.openClaims + counts.resolvedClaims})
          </button>
        </div>
      </div>

      {/* Search & Filter Control Bar */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search warranty code, asset ID, model, serial, provider, policy #..."
            />
          </div>
          <div>
            <Select
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Providers / Vendors' },
                ...providers.map((p) => ({ value: p, label: p })),
              ]}
            />
          </div>
          <div>
            {activeTab !== 'claims' ? (
              <Select
                value={warrantyTypeFilter}
                onChange={(e) => {
                  setWarrantyTypeFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Warranty Types' },
                  { value: 'STANDARD', label: 'Standard OEM' },
                  { value: 'EXTENDED', label: 'Extended Care Pack' },
                  { value: 'ONSITE', label: 'Onsite Support' },
                  { value: 'DEPOT', label: 'Depot Repair' },
                  { value: 'ACCIDENTAL_DAMAGE', label: 'Accidental Damage (ADP)' },
                  { value: 'SERVICE_CONTRACT', label: 'Annual AMC Service' },
                ]}
              />
            ) : (
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Claim Statuses' },
                  { value: 'SUBMITTED', label: 'Submitted' },
                  { value: 'UNDER_REVIEW', label: 'Under Review' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'IN_SERVICE', label: 'In Service' },
                  { value: 'RESOLVED', label: 'Resolved' },
                ]}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1E2535]/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'all' && (
              <>
                <span className="text-slate-400 font-medium">Status:</span>
                {['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED'].map((st) => (
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
              </>
            )}

            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 ml-2 font-medium"
            >
              <FilterX className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
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
      </div>

      {/* 13-Column Table with Internal Horizontal Scroll */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-w-[1450px]">
          {activeTab !== 'claims' ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1E2535] bg-[#0A0D15]/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <th className="py-3 px-3.5">Warranty ID</th>
                  <th className="py-3 px-3.5">Asset ID</th>
                  <th className="py-3 px-3.5">Asset Name / Model</th>
                  <th className="py-3 px-3.5">Type</th>
                  <th className="py-3 px-3.5">Serial Number</th>
                  <th className="py-3 px-3.5">Provider / Vendor</th>
                  <th className="py-3 px-3.5">Coverage Type</th>
                  <th className="py-3 px-3.5">Start Date</th>
                  <th className="py-3 px-3.5">End Date</th>
                  <th className="py-3 px-3.5">Days Remaining (SLA)</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Claims</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2535]/50">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="text-center py-16 text-slate-500 font-medium font-mono">
                      Loading Warranties...
                    </td>
                  </tr>
                ) : warranties.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-16 text-slate-500 font-medium">
                      No warranty records found.
                    </td>
                  </tr>
                ) : (
                  warranties.map((w) => (
                    <tr
                      key={w.id}
                      onClick={() => openDetailModal(w.id)}
                      className="hover:bg-[#141A28] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-indigo-400">
                        {w.warrantyCode}
                        {w.isExtended && (
                          <span className="ml-1 px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px]">
                            EXT
                          </span>
                        )}
                      </td>
                      <td
                        className="py-3 px-3.5 font-mono font-bold text-indigo-300 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/assets/${w.assetId}`);
                        }}
                      >
                        {w.asset?.companyAssetId || w.asset?.assetCode || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300 max-w-xs truncate">
                        {w.asset?.model || w.asset?.assetName || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 font-mono text-[10px]">
                        {w.asset?.assetType || '—'}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-300 text-[11px]">
                        {w.asset?.serialNumber || '—'}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-200">
                        {w.provider}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {w.warrantyType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-400 text-[11px]">
                        {new Date(w.startDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-300 text-[11px]">
                        {new Date(w.endDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-3.5">
                        {renderDaysRemainingBadge(w.daysRemaining, w.daysSinceExpiry)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <StatusBadge status={w.computedStatus || w.status} />
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">
                        {(w._count?.claims || w.claims?.length || 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-bold text-[10px]">
                            {w._count?.claims || w.claims?.length}
                          </span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Inspect Details"
                            onClick={() => openDetailModal(w.id)}
                            className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-indigo-300 hover:border-indigo-500 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Extend Warranty"
                            onClick={() => openExtendModal(w)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="File Warranty Claim"
                            onClick={() => openClaimModal(w)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500 transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          {w.status !== 'CANCELLED' && (
                            <button
                              title="Cancel Contract"
                              onClick={() => openCancelModal(w.id)}
                              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* CLAIMS SUB-VIEW */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1E2535] bg-[#0A0D15]/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <th className="py-3 px-3.5">Claim Number</th>
                  <th className="py-3 px-3.5">Warranty Code</th>
                  <th className="py-3 px-3.5">Asset ID</th>
                  <th className="py-3 px-3.5">Asset Model</th>
                  <th className="py-3 px-3.5">Issue Reported</th>
                  <th className="py-3 px-3.5">Service Provider</th>
                  <th className="py-3 px-3.5">Claim Date</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Covered Amount</th>
                  <th className="py-3 px-3.5">Resolution</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2535]/50">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-slate-500 font-medium font-mono">
                      Loading Claims...
                    </td>
                  </tr>
                ) : claims.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-slate-500 font-medium">
                      No warranty claims found.
                    </td>
                  </tr>
                ) : (
                  claims.map((c) => (
                    <tr key={c.id} className="hover:bg-[#141A28] transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-indigo-400">
                        {c.claimNumber}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-400">
                        {c.warranty?.warrantyCode}
                      </td>
                      <td
                        className="py-3 px-3.5 font-mono font-bold text-indigo-300 hover:underline cursor-pointer"
                        onClick={() => navigate(`/assets/${c.assetId}`)}
                      >
                        {c.asset?.companyAssetId || c.asset?.assetCode}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {c.asset?.model}
                      </td>
                      <td className="py-3 px-3.5 text-white font-semibold">
                        {c.issue}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {c.provider}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-400 text-[11px]">
                        {new Date(c.claimDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-3.5">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 px-3.5 font-mono text-emerald-400 font-bold">
                        {c.coveredAmount ? `INR ${c.coveredAmount}` : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 truncate max-w-xs">
                        {c.resolution || 'Under service inspection'}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (c.warrantyId) openDetailModal(c.warrantyId);
                          }}
                        >
                          View Warranty
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Server-side pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E2535] bg-[#0A0D15]/60 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{(page - 1) * limit + 1}</strong> to{' '}
            <strong className="text-white">{Math.min(page * limit, totalRecords)}</strong> of{' '}
            <strong className="text-white">{totalRecords}</strong> records
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

      {/* ADD WARRANTY MODAL WIZARD (3 Steps) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Hardware Warranty Contract"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateWarrantySubmit} className="space-y-4">
          {/* Wizard step indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1E2535] text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${addStep >= 1 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span className={addStep >= 1 ? 'text-white font-semibold' : 'text-slate-500'}>Select Hardware</span>
            </div>
            <div className="w-10 h-[1px] bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${addStep >= 2 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span className={addStep >= 2 ? 'text-white font-semibold' : 'text-slate-500'}>Contract Details</span>
            </div>
            <div className="w-10 h-[1px] bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${addStep >= 3 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span className={addStep >= 3 ? 'text-white font-semibold' : 'text-slate-500'}>Contact & Helpdesk</span>
            </div>
          </div>

          {/* STEP 1: SELECT ASSET */}
          {addStep === 1 && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-400">Search and select the IT asset for warranty registration:</p>
              <SearchInput
                value={assetSearch}
                onChange={(val) => {
                  setAssetSearch(val);
                  searchAssets(val);
                }}
                placeholder="Search asset ID, model, serial number..."
              />

              <div className="max-h-60 overflow-y-auto divide-y divide-[#1E2535] border border-[#232C3E] rounded-lg bg-[#0E131F]">
                {assetOptions.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAsset(a)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      selectedAsset?.id === a.id ? 'bg-indigo-500/20 border-l-4 border-indigo-500' : 'hover:bg-[#141A28]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-400">{a.companyAssetId || a.assetCode}</span>
                        <span className="text-slate-300 font-semibold">{a.model}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">{a.assetType}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        S/N: <strong className="text-slate-300 font-mono">{a.serialNumber || 'N/A'}</strong> | Holder:{' '}
                        {a.currentHolder?.fullName || 'IT Stock'} | Dept: {a.department?.name || 'HQ'}
                      </p>
                    </div>
                    {selectedAsset?.id === a.id && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!selectedAsset}
                  onClick={() => {
                    if (selectedAsset) {
                      setFormData((prev) => ({
                        ...prev,
                        provider: selectedAsset.manufacturer || prev.provider || 'Dell Technologies',
                      }));
                      setAddStep(2);
                    }
                  }}
                >
                  Continue to Contract Details &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: CONTRACT INFORMATION */}
          {addStep === 2 && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Warranty Type *</label>
                  <Select
                    value={formData.warrantyType}
                    onChange={(e) => setFormData({ ...formData, warrantyType: e.target.value as any })}
                    options={[
                      { value: 'STANDARD', label: 'Standard OEM Warranty' },
                      { value: 'EXTENDED', label: 'Extended Care Pack' },
                      { value: 'ONSITE', label: 'Onsite Support' },
                      { value: 'DEPOT', label: 'Depot Repair' },
                      { value: 'ACCIDENTAL_DAMAGE', label: 'Accidental Damage (ADP)' },
                      { value: 'SERVICE_CONTRACT', label: 'Annual AMC Service' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Service Provider / Vendor *</label>
                  <Input
                    required
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder="e.g. Dell Technologies, HP, Lenovo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Policy / Contract #</label>
                  <Input
                    value={formData.policyNumber}
                    onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                    placeholder="e.g. POL-998822-DL"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Warranty Cost (INR)</label>
                  <Input
                    type="number"
                    value={formData.warrantyCost}
                    onChange={(e) => setFormData({ ...formData, warrantyCost: e.target.value })}
                    placeholder="e.g. 15000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Coverage Start Date *</label>
                  <Input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Coverage End Date *</label>
                  <Input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Coverage Scope Description</label>
                <textarea
                  rows={2}
                  value={formData.coverageDescription}
                  onChange={(e) => setFormData({ ...formData, coverageDescription: e.target.value })}
                  className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-between pt-2 border-t border-[#1E2535]">
                <Button type="button" variant="outline" onClick={() => setAddStep(1)}>
                  &larr; Back
                </Button>
                <Button type="button" variant="primary" onClick={() => setAddStep(3)}>
                  Continue to Helpdesk &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: CONTACT & HELPDESK */}
          {addStep === 3 && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Claim Contact Person / Desk</label>
                  <Input
                    value={formData.claimContact}
                    onChange={(e) => setFormData({ ...formData, claimContact: e.target.value })}
                    placeholder="e.g. Dell Premier Enterprise Desk"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Contact Email</label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="support@vendor.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Contact Phone / Toll-Free</label>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="1800-425-0088"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Purchase / PO Reference</label>
                  <Input
                    value={formData.purchaseReference}
                    onChange={(e) => setFormData({ ...formData, purchaseReference: e.target.value })}
                    placeholder="PO-2026-0988"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Coverage Exclusions / Notes</label>
                <textarea
                  rows={2}
                  value={formData.coverageNotes}
                  onChange={(e) => setFormData({ ...formData, coverageNotes: e.target.value })}
                  placeholder="e.g. Battery covered for 1 year; physical liquid spill excluded..."
                  className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-between pt-2 border-t border-[#1E2535]">
                <Button type="button" variant="outline" onClick={() => setAddStep(2)}>
                  &larr; Back
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  Register Warranty Contract
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* WARRANTY DETAIL MODAL */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedWarranty ? `Warranty Contract: ${selectedWarranty.warrantyCode}` : 'Contract Details'}
        maxWidth="xl"
      >
        {detailLoading || !selectedWarranty ? (
          <div className="py-20 text-center text-slate-400 font-mono text-xs">
            Loading Contract Details...
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3.5 rounded-lg bg-[#141A28] border border-[#232C3E] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-400 text-sm">
                    {selectedWarranty.warrantyCode}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                    {selectedWarranty.warrantyType}
                  </span>
                  <span className="font-semibold text-slate-300">{selectedWarranty.provider}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Policy: <strong className="text-white font-mono">{selectedWarranty.policyNumber || 'N/A'}</strong> | Registered by{' '}
                  <strong className="text-slate-200">
                    {selectedWarranty.createdBy?.employee?.fullName || selectedWarranty.createdBy?.username}
                  </strong>
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status={selectedWarranty.computedStatus || selectedWarranty.status} />
                <div className="mt-1">
                  {renderDaysRemainingBadge(selectedWarranty.daysRemaining, selectedWarranty.daysSinceExpiry)}
                </div>
              </div>
            </div>

            {/* Target Hardware Asset Card */}
            {selectedWarranty.asset && (
              <div className="p-3.5 rounded-lg bg-[#121624] border border-[#1E2535] space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#1E2535]">
                  <span className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                    Covered Equipment Asset
                  </span>
                  <button
                    onClick={() => navigate(`/assets/${selectedWarranty.asset.id}`)}
                    className="text-[11px] text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    Open Asset Details <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Asset Code</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {selectedWarranty.asset.companyAssetId || selectedWarranty.asset.assetCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Model & Type</span>
                    <span className="text-slate-200">
                      {selectedWarranty.asset.model} ({selectedWarranty.asset.assetType})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Serial Number</span>
                    <span className="font-mono text-slate-200">{selectedWarranty.asset.serialNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Current Custodian</span>
                    <span className="text-slate-200">{selectedWarranty.asset.currentHolder?.fullName || 'IT Stock'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Coverage Dates & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#0E131F] border border-[#1E2535] space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block pb-1 border-b border-[#1E2535]">
                  Coverage Dates
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Start Date:</span>
                  <span className="font-mono text-slate-200">{new Date(selectedWarranty.startDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">End Date:</span>
                  <span className="font-mono text-slate-200">{new Date(selectedWarranty.endDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Contract Cost:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {selectedWarranty.warrantyCost ? `INR ${selectedWarranty.warrantyCost}` : 'Included in Purchase'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0E131F] border border-[#1E2535] space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block pb-1 border-b border-[#1E2535]">
                  Provider Helpdesk
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Contact Desk:</span>
                  <span className="text-slate-200">{selectedWarranty.claimContact || 'OEM Enterprise Support'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Support Email:</span>
                  <span className="text-indigo-400 font-mono">{selectedWarranty.contactEmail || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone Hotline:</span>
                  <span className="text-slate-200 font-mono">{selectedWarranty.contactPhone || '—'}</span>
                </div>
              </div>
            </div>

            {/* Scope & Notes */}
            <div className="p-3 rounded-lg bg-[#0E131F] border border-[#1E2535] space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block pb-1 border-b border-[#1E2535]">
                Coverage Scope & Exclusions
              </span>
              <p className="text-slate-300">{selectedWarranty.coverageDescription || 'Full hardware parts and service.'}</p>
              {selectedWarranty.coverageNotes && (
                <div className="p-2 rounded bg-[#121624] border border-[#1E2535] text-slate-400 text-[11px]">
                  <strong>Notes:</strong> {selectedWarranty.coverageNotes}
                </div>
              )}
            </div>

            {/* CLAIMS SECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                  Filed Warranty Claims ({selectedWarranty.claims?.length || 0})
                </span>
                <Button variant="secondary" size="sm" onClick={() => openClaimModal(selectedWarranty)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> File Claim
                </Button>
              </div>

              {selectedWarranty.claims && selectedWarranty.claims.length > 0 ? (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {selectedWarranty.claims.map((c: any) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-[#0E131F] border border-[#1E2535] flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-400">{c.claimNumber}</span>
                          <span className="text-white font-medium">{c.issue}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Filed on {new Date(c.claimDate).toLocaleDateString('en-GB')} | Covered:{' '}
                          <strong className="text-emerald-400 font-mono">
                            {c.coveredAmount ? `INR ${c.coveredAmount}` : 'Full'}
                          </strong>{' '}
                          {c.resolution && `| Resolution: ${c.resolution}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic text-[11px]">No warranty claims filed on this contract.</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-between pt-3 border-t border-[#1E2535]">
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => openExtendModal(selectedWarranty)}>
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Extend Coverage
                </Button>
                {selectedWarranty.status !== 'CANCELLED' && (
                  <Button variant="outline" onClick={() => openCancelModal(selectedWarranty.id)}>
                    <Ban className="w-4 h-4 mr-1.5 text-rose-400" /> Cancel Contract
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EXTEND WARRANTY MODAL */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        title="Extend Warranty Coverage"
        maxWidth="md"
      >
        <form onSubmit={handleExtendSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
            <p className="text-slate-300">
              Extending warranty for{' '}
              <strong className="text-indigo-400 font-mono">{extendTarget?.warrantyCode}</strong> (Current end date:{' '}
              <strong className="text-white font-mono">
                {extendTarget?.endDate ? new Date(extendTarget.endDate).toLocaleDateString('en-GB') : '—'}
              </strong>
              )
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Extension Period *</label>
            <Select
              value={String(extensionMonths)}
              onChange={(e) => setExtensionMonths(Number(e.target.value))}
              options={[
                { value: '6', label: '+6 Months' },
                { value: '12', label: '+12 Months (1 Year)' },
                { value: '24', label: '+24 Months (2 Years)' },
                { value: '36', label: '+36 Months (3 Years)' },
              ]}
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Extension Reason *</label>
            <Input
              required
              value={extensionReason}
              onChange={(e) => setExtensionReason(e.target.value)}
              placeholder="e.g. Care pack renewal for mission-critical engineering workstation"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Renewal Cost (INR)</label>
            <Input
              type="number"
              value={extensionCost}
              onChange={(e) => setExtensionCost(e.target.value)}
              placeholder="e.g. 18000"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2535]">
            <Button type="button" variant="outline" onClick={() => setShowExtendModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Confirm Extension
            </Button>
          </div>
        </form>
      </Modal>

      {/* FILE CLAIM MODAL */}
      <Modal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        title="File Warranty Service Claim"
        maxWidth="md"
      >
        <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
            Filing claim under contract <strong className="font-mono">{claimTargetWarranty?.warrantyCode}</strong> ({claimTargetWarranty?.provider})
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Issue Reported *</label>
            <Input
              required
              value={claimForm.issue}
              onChange={(e) => setClaimForm({ ...claimForm, issue: e.target.value })}
              placeholder="e.g. Display backlight failure / motherboard charging port damaged"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Detailed Defect Description *</label>
            <textarea
              required
              rows={3}
              value={claimForm.description}
              onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
              placeholder="Describe symptoms, steps to reproduce, and diagnostic observations..."
              className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Estimated Claim Cost (INR)</label>
              <Input
                type="number"
                value={claimForm.claimCost}
                onChange={(e) => setClaimForm({ ...claimForm, claimCost: e.target.value })}
                placeholder="12000"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Covered by Warranty (INR)</label>
              <Input
                type="number"
                value={claimForm.coveredAmount}
                onChange={(e) => setClaimForm({ ...claimForm, coveredAmount: e.target.value })}
                placeholder="10000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2535]">
            <Button type="button" variant="outline" onClick={() => setShowClaimModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit Claim
            </Button>
          </div>
        </form>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Warranty Contract"
        maxWidth="sm"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
          <p className="text-slate-300">
            Are you sure you want to cancel this warranty contract? Existing claims and maintenance records will remain preserved for historical audit.
          </p>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Cancellation Reason *</label>
            <textarea
              required
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for early contract termination..."
              className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2535]">
            <Button type="button" variant="outline" onClick={() => setShowCancelModal(false)}>
              Close
            </Button>
            <Button type="submit" variant="danger" loading={submitting}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
