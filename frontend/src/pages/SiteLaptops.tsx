import React, { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import {
  SiteLaptop,
  SiteLaptopStats,
  SiteLaptopHistory,
  SiteLaptopStatus,
  SiteLaptopEntryType,
} from '../types';
import { exportSiteLaptopsToExcel } from '../utils/exporters';
import { formatDateTimeIST, getCurrentISTDate, getCurrentISTTime } from '../utils/timezone';
import {
  MapPinned,
  Laptop,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Clock,
  Edit,
  RotateCcw,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  Building,
  QrCode,
  Sparkles,
} from 'lucide-react';

export const SiteLaptops: React.FC = () => {
  const { showToast } = useToast();

  // Core Data States
  const [siteLaptops, setSiteLaptops] = useState<SiteLaptop[]>([]);
  const [stats, setStats] = useState<SiteLaptopStats>({
    totalDispatches: 0,
    atSite: 0,
    returned: 0,
    inTransit: 0,
    maintenance: 0,
    uniqueLaptops: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Dispatch Modal (Create)
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [entryType, setEntryType] = useState<SiteLaptopEntryType>('INVENTORY_LINKED');
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [inventoryLaptops, setInventoryLaptops] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState<boolean>(false);
  const [selectedInventoryAsset, setSelectedInventoryAsset] = useState<any | null>(null);

  // Form Fields for Create
  const [manualLaptopName, setManualLaptopName] = useState<string>('');
  const [manualAssetId, setManualAssetId] = useState<string>('');
  const [manualQrCode, setManualQrCode] = useState<string>('');
  const [manualSerial, setManualSerial] = useState<string>('');

  const [destinationSite, setDestinationSite] = useState<string>('');
  const [dispatchDate, setDispatchDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dispatchTime, setDispatchTime] = useState<string>('09:30 AM');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [expectedReturn, setExpectedReturn] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [submittingDispatch, setSubmittingDispatch] = useState<boolean>(false);

  // Edit Modal
  const [editingItem, setEditingItem] = useState<SiteLaptop | null>(null);
  const [editDestinationSite, setEditDestinationSite] = useState<string>('');
  const [editStatus, setEditStatus] = useState<SiteLaptopStatus>('AT_SITE');
  const [editAssignedTo, setEditAssignedTo] = useState<string>('');
  const [editContactNumber, setEditContactNumber] = useState<string>('');
  const [editPurpose, setEditPurpose] = useState<string>('');
  const [editExpectedReturn, setEditExpectedReturn] = useState<string>('');
  const [editActualReturn, setEditActualReturn] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [editMovementNote, setEditMovementNote] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // History Modal
  const [historyItem, setHistoryItem] = useState<SiteLaptop | null>(null);
  const [histories, setHistories] = useState<SiteLaptopHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Fetch Stats & List
  const fetchStats = async () => {
    try {
      const res: any = await api.get('/site-laptops/stats');
      const data = res?.data ?? res;
      if (data) {
        setStats(data);
      }
    } catch {
      // Fallback
    }
  };

  const fetchSiteLaptops = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (siteFilter.trim()) params.append('destinationSite', siteFilter.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res: any = await api.get(`/site-laptops?${params.toString()}`);
      const data = res?.data ?? res;
      if (data?.items) {
        setSiteLaptops(data.items);
      } else if (Array.isArray(data)) {
        setSiteLaptops(data);
      }
    } catch {
      showToast('Failed to load site laptop dispatches', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Eligible Inventory Laptops for Method 1
  const fetchEligibleInventory = async (query = '') => {
    setLoadingInventory(true);
    try {
      const res: any = await api.get(`/site-laptops/eligible-inventory?search=${encodeURIComponent(query)}`);
      const data = res?.data ?? res;
      if (Array.isArray(data)) {
        setInventoryLaptops(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSiteLaptops();
  }, [statusFilter]);

  // Handle Search Debounce / Trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSiteLaptops();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSiteFilter('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => {
      fetchSiteLaptops();
    }, 50);
  };

  // Open Create Modal
  const openDispatchModal = () => {
    setEntryType('INVENTORY_LINKED');
    setSelectedInventoryAsset(null);
    setManualLaptopName('');
    setManualAssetId('');
    setManualQrCode('');
    setManualSerial('');
    setDestinationSite('');
    setDispatchDate(getCurrentISTDate());
    setDispatchTime(getCurrentISTTime());
    setAssignedTo('');
    setContactNumber('');
    setPurpose('');
    setExpectedReturn('');
    setRemarks('');
    setIsDispatchModalOpen(true);
    fetchEligibleInventory();
  };

  // Submit Dispatch
  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (entryType === 'INVENTORY_LINKED' && !selectedInventoryAsset) {
      showToast('Please select an authoritative inventory laptop', 'error');
      return;
    }

    if (entryType === 'MANUAL_ENTRY' && (!manualLaptopName.trim() || !manualAssetId.trim())) {
      showToast('Laptop Name and Asset ID are required for Manual Entry', 'error');
      return;
    }

    if (!destinationSite.trim()) {
      showToast('Destination Site Location is required', 'error');
      return;
    }

    setSubmittingDispatch(true);
    try {
      const payload: any = {
        entryType,
        destinationSite: destinationSite.trim(),
        dispatchDate,
        dispatchTime,
        assignedTo: assignedTo.trim() || undefined,
        contactNumber: contactNumber.trim() || undefined,
        purpose: purpose.trim() || undefined,
        expectedReturn: expectedReturn || undefined,
        remarks: remarks.trim() || undefined,
      };

      if (entryType === 'INVENTORY_LINKED') {
        payload.assetId = selectedInventoryAsset.id;
      } else {
        payload.laptopName = manualLaptopName.trim();
        payload.assetIdDisplay = manualAssetId.trim();
        payload.qrCode = manualQrCode.trim() || undefined;
        payload.serialNumber = manualSerial.trim() || undefined;
      }

      await api.post('/site-laptops', payload);
      showToast('Site laptop dispatch created successfully', 'success');
      setIsDispatchModalOpen(false);
      fetchSiteLaptops();
      fetchStats();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create site laptop dispatch', 'error');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: SiteLaptop) => {
    setEditingItem(item);
    setEditDestinationSite(item.destinationSite);
    setEditStatus(item.status);
    setEditAssignedTo(item.assignedTo || '');
    setEditContactNumber(item.contactNumber || '');
    setEditPurpose(item.purpose || '');
    setEditExpectedReturn(item.expectedReturn ? item.expectedReturn.slice(0, 10) : '');
    setEditActualReturn(item.actualReturn ? item.actualReturn.slice(0, 10) : '');
    setEditRemarks(item.remarks || '');
    setEditMovementNote('');
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editDestinationSite.trim()) {
      showToast('Destination Site Location is required', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const payload: any = {
        destinationSite: editDestinationSite.trim(),
        status: editStatus,
        assignedTo: editAssignedTo.trim() || null,
        contactNumber: editContactNumber.trim() || null,
        purpose: editPurpose.trim() || null,
        expectedReturn: editExpectedReturn || null,
        actualReturn: editActualReturn || null,
        remarks: editRemarks.trim() || null,
        historyNote: editMovementNote.trim() || undefined,
      };

      await api.put(`/site-laptops/${editingItem.id}`, payload);
      showToast(`Site Laptop record ${editingItem.code} updated`, 'success');
      setEditingItem(null);
      fetchSiteLaptops();
      fetchStats();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update site laptop', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open History Modal
  const openHistoryModal = async (item: SiteLaptop) => {
    setHistoryItem(item);
    setLoadingHistory(true);
    try {
      const res: any = await api.get(`/site-laptops/${item.id}`);
      const data = res?.data ?? res;
      if (data?.history) {
        setHistories(data.history);
      } else {
        setHistories(item.history || []);
      }
    } catch {
      setHistories(item.history || []);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      if (!siteLaptops || siteLaptops.length === 0) {
        showToast('No records available to export', 'error');
        return;
      }
      exportSiteLaptopsToExcel(siteLaptops);
      showToast('Excel report generated successfully', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to export Excel report', 'error');
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: SiteLaptopStatus) => {
    switch (status) {
      case 'AT_SITE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            At Site
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            Returned
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            In Transit
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
            Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <MapPinned className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Site Laptop
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Dispatch, track, and monitor laptops deployed to on-site operations and project locations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            className="flex items-center gap-2 border-[#222E46] hover:bg-[#1A2234]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export XLSX</span>
          </Button>

          <Button
            variant="primary"
            onClick={openDispatchModal}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Dispatch to Site</span>
          </Button>
        </div>
      </div>

      {/* 4 Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0B101B] border border-[#1A2338] shadow-sm relative overflow-hidden group hover:border-[#283858] transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dispatches</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{stats.totalDispatches}</h3>
              <p className="text-xs text-slate-400 mt-1">Cumulative site movements</p>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <MapPinned className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B101B] border border-[#1A2338] shadow-sm relative overflow-hidden group hover:border-[#283858] transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Currently At Site</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{stats.atSite}</h3>
              <p className="text-xs text-slate-400 mt-1">Active at project locations</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Laptop className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B101B] border border-[#1A2338] shadow-sm relative overflow-hidden group hover:border-[#283858] transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Returned to Base</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{stats.returned}</h3>
              <p className="text-xs text-slate-400 mt-1">Safely back in inventory</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <RotateCcw className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B101B] border border-[#1A2338] shadow-sm relative overflow-hidden group hover:border-[#283858] transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Unique Laptops</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{stats.uniqueLaptops}</h3>
              <p className="text-xs text-slate-400 mt-1">Distinct machines deployed</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0B101B] border border-[#1A2338] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search laptop name, Asset ID, QR code, site location, engineer..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070B13] border border-[#1A2338] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Status Dropdown */}
          <div className="w-full lg:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B13] border border-[#1A2338] text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="AT_SITE">At Site</option>
              <option value="RETURNED">Returned</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          {/* Site Location Filter */}
          <div className="w-full lg:w-56">
            <input
              type="text"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              placeholder="Filter by Site / Location..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B13] border border-[#1A2338] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Filter Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium"
            >
              Search
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetFilters}
              className="px-3.5 py-2.5 border-[#1A2338] hover:bg-[#151D2C] text-slate-300 rounded-xl text-sm"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl bg-[#0B101B] border border-[#1A2338] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#080D17] text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-[#1A2338]">
              <tr>
                <th className="py-3.5 px-4">Record Code</th>
                <th className="py-3.5 px-4">Laptop Name / Model</th>
                <th className="py-3.5 px-4">Asset ID</th>
                <th className="py-3.5 px-4">QR Code</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Destination / Site</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151D2C]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium">Loading site laptop dispatches...</p>
                    </div>
                  </td>
                </tr>
              ) : siteLaptops.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                      <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                        <MapPinned className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold text-white">No Site Laptops Found</h4>
                      <p className="text-sm text-slate-400 text-center">
                        No laptop dispatches match your search or filters. Click below to dispatch a laptop to an on-site project.
                      </p>
                      <Button
                        variant="primary"
                        onClick={openDispatchModal}
                        className="mt-2 bg-sky-600 hover:bg-sky-500 text-white"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Dispatch First Laptop
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                siteLaptops.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#101726]/60 transition-colors group text-slate-200"
                  >
                    {/* Record Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20">
                        {item.code}
                      </span>
                    </td>

                    {/* Laptop Name / Model */}
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center space-x-2">
                        <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]" title={item.laptopName}>
                          {item.laptopName}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {item.entryType === 'INVENTORY_LINKED' ? (
                          <span className="text-sky-400/90 font-mono">● Inventory Linked</span>
                        ) : (
                          <span className="text-amber-400/90 font-mono">● Manual Entry</span>
                        )}
                      </div>
                    </td>

                    {/* Asset ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {item.assetIdDisplay}
                    </td>

                    {/* QR Code */}
                    <td className="py-3.5 px-4">
                      {item.qrCode ? (
                        <span className="inline-flex items-center font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          <QrCode className="w-3 h-3 mr-1 shrink-0" />
                          <span className="truncate max-w-[90px]" title={item.qrCode}>
                            {item.qrCode}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">—</span>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-200 font-medium">
                        {new Date(item.dispatchDate).toLocaleDateString('en-GB')}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {item.dispatchTime || '—'}
                      </div>
                    </td>

                    {/* Destination Site */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 font-medium text-white">
                        <MapPinned className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="truncate max-w-[180px]" title={item.destinationSite}>
                          {item.destinationSite}
                        </span>
                      </div>
                      {item.purpose && (
                        <div className="text-xs text-slate-400 truncate max-w-[180px]" title={item.purpose}>
                          {item.purpose}
                        </div>
                      )}
                    </td>

                    {/* Assigned To */}
                    <td className="py-3.5 px-4">
                      {item.assignedTo ? (
                        <div className="flex items-center space-x-1.5 text-slate-200">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]" title={item.assignedTo}>
                            {item.assignedTo}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Actions: History & Edit ONLY (NO DELETE) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openHistoryModal(item)}
                          className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition-colors"
                          title="View Movement History"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
                          title="Edit Dispatch Details / Move Site"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create Dispatch to Site */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B101B] border border-[#1E293B] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#070B13]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <MapPinned className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Dispatch Laptop to Site</h3>
                  <p className="text-xs text-slate-400">
                    Register a new on-site laptop deployment with movement tracking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1A2338]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateDispatch} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Method Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Entry Method
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#070B13] border border-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => setEntryType('INVENTORY_LINKED')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      entryType === 'INVENTORY_LINKED'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Method 1: From Existing Inventory</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('MANUAL_ENTRY')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      entryType === 'MANUAL_ENTRY'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Method 2: Manual Entry</span>
                  </button>
                </div>
              </div>

              {/* Method 1: Existing Inventory Selector */}
              {entryType === 'INVENTORY_LINKED' && (
                <div className="space-y-3 p-4 rounded-xl bg-[#070B13] border border-[#1E293B]">
                  <label className="block text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Select Inventory Laptop
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={inventorySearch}
                      onChange={(e) => {
                        setInventorySearch(e.target.value);
                        fetchEligibleInventory(e.target.value);
                      }}
                      placeholder="Search inventory by Asset Code, Company ID, Model..."
                      className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0B101B] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Dropdown list of assets */}
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-[#1E293B] bg-[#0B101B] p-1">
                    {loadingInventory ? (
                      <p className="text-xs text-slate-500 p-2 text-center">Searching inventory...</p>
                    ) : inventoryLaptops.length === 0 ? (
                      <p className="text-xs text-slate-500 p-2 text-center">No matching inventory laptops</p>
                    ) : (
                      inventoryLaptops.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => setSelectedInventoryAsset(a)}
                          className={`p-2 rounded-md cursor-pointer text-xs flex items-center justify-between transition-colors ${
                            selectedInventoryAsset?.id === a.id
                              ? 'bg-sky-600/20 border border-sky-500/40 text-white'
                              : 'hover:bg-[#151D2C] text-slate-300'
                          }`}
                        >
                          <div>
                            <span className="font-mono font-bold text-sky-400 mr-2">
                              {a.companyAssetId || a.assetCode}
                            </span>
                            <span className="font-medium text-white">{a.manufacturer} {a.model}</span>
                            {a.serialNumber && (
                              <span className="text-slate-500 ml-2 font-mono">SN: {a.serialNumber}</span>
                            )}
                          </div>
                          {selectedInventoryAsset?.id === a.id && (
                            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {selectedInventoryAsset && (
                    <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">Selected: </span>
                        <strong className="text-white">
                          {selectedInventoryAsset.manufacturer} {selectedInventoryAsset.model}
                        </strong>
                        <span className="font-mono text-sky-400 ml-2">
                          ({selectedInventoryAsset.companyAssetId || selectedInventoryAsset.assetCode})
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Authoritative Asset
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Method 2: Manual Free-Text Inputs */}
              {entryType === 'MANUAL_ENTRY' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#070B13] border border-[#1E293B]">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Laptop Name / Model <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manualLaptopName}
                      onChange={(e) => setManualLaptopName(e.target.value)}
                      placeholder="e.g. Dell Latitude 5440"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B101B] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Asset ID <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manualAssetId}
                      onChange={(e) => setManualAssetId(e.target.value)}
                      placeholder="e.g. FAA-EXT-001"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B101B] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">QR Code / Identifier</label>
                    <input
                      type="text"
                      value={manualQrCode}
                      onChange={(e) => setManualQrCode(e.target.value)}
                      placeholder="e.g. QR-EXT-1049"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B101B] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={manualSerial}
                      onChange={(e) => setManualSerial(e.target.value)}
                      placeholder="e.g. 8VJ3KL2"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B101B] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Destination Site & Movement Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Site Destination & Assignment Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Destination / Site Location <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={destinationSite}
                      onChange={(e) => setDestinationSite(e.target.value)}
                      placeholder="e.g. Tata Motors Pune Assembly Plant, Bay 4"
                      className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Dispatch Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dispatchDate}
                      onChange={(e) => setDispatchDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Dispatch Time</label>
                    <input
                      type="text"
                      value={dispatchTime}
                      onChange={(e) => setDispatchTime(e.target.value)}
                      placeholder="e.g. 10:30 AM"
                      className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Assigned To (Engineer / Technician)
                    </label>
                    <input
                      type="text"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contact Number</label>
                    <input
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Purpose / Project</label>
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g. SCADA & PLC Commissioning"
                      className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Expected Return Date</label>
                    <input
                      type="date"
                      value={expectedReturn}
                      onChange={(e) => setExpectedReturn(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Remarks / Notes</label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Additional notes, accessories carried, project details..."
                      className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#1E293B]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="border-[#1E293B] hover:bg-[#1A2338]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingDispatch}
                  className="bg-sky-600 hover:bg-sky-500 text-white"
                >
                  {submittingDispatch ? 'Submitting...' : 'Dispatch Laptop'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Site Laptop */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B101B] border border-[#1E293B] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#070B13]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-slate-800 text-sky-400 border border-slate-700">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Edit Site Laptop — <span className="font-mono text-sky-400">{editingItem.code}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingItem.laptopName} • Asset ID: <span className="font-mono text-slate-300">{editingItem.assetIdDisplay}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1A2338]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Linked Asset Info Banner */}
              {editingItem.entryType === 'INVENTORY_LINKED' && (
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-sky-400" />
                  <span>
                    Linked to inventory asset. Asset ID ({editingItem.assetIdDisplay}) and QR Code are protected and read-only.
                  </span>
                </div>
              )}

              {/* Destination Site (Relocation triggers movement history) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Destination / Site Location <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editDestinationSite}
                  onChange={(e) => setEditDestinationSite(e.target.value)}
                  placeholder="e.g. Delhi Metro Site, Station 12"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B13] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-sky-500 font-medium"
                />
                {editDestinationSite !== editingItem.destinationSite && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>
                      Changing site will record a movement from "{editingItem.destinationSite}" to "{editDestinationSite}".
                    </span>
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Current Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SiteLaptopStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B13] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="AT_SITE">At Site</option>
                  <option value="RETURNED">Returned to Base</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="MAINTENANCE">Maintenance / Servicing</option>
                </select>
                {editStatus === 'RETURNED' && editingItem.status !== 'RETURNED' && (
                  <p className="text-[11px] text-blue-400 mt-1">
                    Returning will mark actual return date to today and record a RETURNED event in history.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assigned To</label>
                  <input
                    type="text"
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={editContactNumber}
                    onChange={(e) => setEditContactNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Expected Return</label>
                  <input
                    type="date"
                    value={editExpectedReturn}
                    onChange={(e) => setEditExpectedReturn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Actual Return</label>
                  <input
                    type="date"
                    value={editActualReturn}
                    onChange={(e) => setEditActualReturn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Purpose / Project</label>
                <input
                  type="text"
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Remarks / Movement Note</label>
                <textarea
                  rows={2}
                  value={editMovementNote}
                  onChange={(e) => setEditMovementNote(e.target.value)}
                  placeholder="Reason for site relocation, status update, or notes..."
                  className="w-full px-3 py-2 rounded-lg bg-[#070B13] border border-[#1E293B] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#1E293B]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingItem(null)}
                  className="border-[#1E293B] hover:bg-[#1A2338]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={savingEdit}
                  className="bg-sky-600 hover:bg-sky-500 text-white"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Movement History Timeline */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B101B] border border-[#1E293B] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#070B13]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Movement History — <span className="font-mono text-sky-400">{historyItem.code}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {historyItem.laptopName} • Asset ID: <span className="font-mono text-slate-300">{historyItem.assetIdDisplay}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1A2338]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Chronological Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm">Loading movement timeline...</p>
                </div>
              ) : histories.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">No movement history entries recorded yet.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1E293B]">
                  {histories.map((h) => (
                    <div key={h.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-sky-500 border-4 border-[#0B101B] shadow-sm"></div>

                      <div className="p-4 rounded-xl bg-[#070B13] border border-[#1A2338] shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                            {h.action}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatDateTimeIST(h.eventDate)}
                          </span>
                        </div>

                        {/* Sites relocation flow */}
                        {(h.fromSite || h.toSite) && (
                          <div className="flex items-center space-x-2 text-xs text-slate-200">
                            {h.fromSite && (
                              <span className="font-medium text-slate-400">{h.fromSite}</span>
                            )}
                            {h.fromSite && h.toSite && (
                              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                            )}
                            {h.toSite && (
                              <span className="font-bold text-white flex items-center space-x-1">
                                <MapPinned className="w-3 h-3 text-sky-400 inline mr-0.5" />
                                {h.toSite}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Status transition if any */}
                        {(h.fromStatus || h.toStatus) && (
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-slate-500">Status:</span>
                            {h.fromStatus && renderStatusBadge(h.fromStatus)}
                            {h.fromStatus && h.toStatus && (
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                            )}
                            {h.toStatus && renderStatusBadge(h.toStatus)}
                          </div>
                        )}

                        {/* Notes */}
                        {h.notes && (
                          <p className="text-xs text-slate-300 italic bg-[#0B101B] p-2.5 rounded-lg border border-[#1A2338]">
                            "{h.notes}"
                          </p>
                        )}

                        {/* Performed by */}
                        {h.performedBy && (
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1 pt-1">
                            <User className="w-3 h-3" />
                            <span>Logged by: {h.performedBy.username}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#1E293B] bg-[#070B13] flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setHistoryItem(null)}
                className="border-[#1E293B] hover:bg-[#1A2338]"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SiteLaptops;
