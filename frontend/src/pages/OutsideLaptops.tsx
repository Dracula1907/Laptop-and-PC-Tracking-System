import React, { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { OutsideLaptopRecord, OutsideLaptopStats } from '../types';
import { formatDateTimeIST } from '../utils/timezone';
import * as XLSX from 'xlsx';
import {
  Laptop,
  Plus,
  Search,
  FileSpreadsheet,
  Clock,
  Edit,
  RotateCcw,
  Trash2,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  Building,
  MapPin,
  LogOut,
  LogIn,
  Filter,
  RefreshCw,
  Info,
} from 'lucide-react';

// Robust helper to extract API response data whether unwrapped by Axios interceptor or not
function unpackApiResponse<T = any>(res: any): { success: boolean; data: T; message?: string } {
  const success = Boolean(res?.success ?? res?.data?.success);
  let data: any = res?.data;
  if (data !== undefined && data !== null && typeof data === 'object' && 'data' in data && 'success' in data) {
    data = data.data;
  }
  if (data === undefined) {
    data = res;
  }
  const message = res?.message ?? res?.data?.message;
  return { success, data, message };
}

export const OutsideLaptops: React.FC = () => {
  const { showToast } = useToast();

  // Tab State
  const [activeTab, setActiveTab] = useState<'currently_outside' | 'history'>('currently_outside');

  // Core Data States
  const [records, setRecords] = useState<OutsideLaptopRecord[]>([]);
  const [currentlyOutside, setCurrentlyOutside] = useState<OutsideLaptopRecord[]>([]);
  const [stats, setStats] = useState<OutsideLaptopStats>({
    totalMovements: 0,
    currentlyOutside: 0,
    totalReturned: 0,
    todayMovements: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Pagination & Filters for History
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [movementFilter, setMovementFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Currently Outside Search
  const [outsideSearch, setOutsideSearch] = useState<string>('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<OutsideLaptopRecord | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    movementType: 'OUT' as 'OUT' | 'IN',
    laptopName: '',
    laptopIdentifier: '',
    personName: '',
    personDetails: '',
    company: 'Faith Automation',
    contactNumber: '',
    destination: '',
    purpose: '',
    remarks: '',
  });

  // Return Form State
  const [returnRemarks, setReturnRemarks] = useState<string>('');

  // Edit Form State
  const [editForm, setEditForm] = useState({
    laptopName: '',
    laptopIdentifier: '',
    personName: '',
    personDetails: '',
    company: '',
    contactNumber: '',
    destination: '',
    purpose: '',
    remarks: '',
    status: 'OUTSIDE',
  });

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const raw = await api.get('/outside-laptops/stats');
      const res = unpackApiResponse<OutsideLaptopStats>(raw);
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load outside laptop stats', err);
    }
  };

  // Fetch Currently Outside
  const fetchCurrentlyOutside = async () => {
    try {
      const raw = await api.get('/outside-laptops/currently-outside', {
        params: { search: outsideSearch },
      });
      const res = unpackApiResponse<OutsideLaptopRecord[]>(raw);
      if (res.success && Array.isArray(res.data)) {
        setCurrentlyOutside(res.data);
      }
    } catch (err) {
      console.error('Failed to load currently outside laptops', err);
    }
  };

  // Fetch Movement History
  const fetchHistory = async () => {
    try {
      const raw = await api.get('/outside-laptops', {
        params: {
          page,
          limit: 15,
          search: searchQuery,
          movementType: movementFilter,
          status: statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      const res = unpackApiResponse<{ records: OutsideLaptopRecord[]; totalPages: number; total: number }>(raw);
      if (res.success && res.data) {
        setRecords(res.data.records || []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load movement history', err);
    }
  };

  // Load All Data
  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchCurrentlyOutside(), fetchHistory()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'currently_outside') {
      fetchCurrentlyOutside();
    } else {
      fetchHistory();
    }
  }, [activeTab, page, searchQuery, movementFilter, statusFilter, startDate, endDate, outsideSearch]);

  // Handle Create Movement
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.laptopName.trim() || !createForm.laptopIdentifier.trim() || !createForm.personName.trim()) {
      showToast('Please fill in all mandatory fields (Laptop Name, ID, Person Name).', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const raw = await api.post('/outside-laptops', createForm);
      const res = unpackApiResponse(raw);
      if (res.success) {
        showToast(res.message || 'Outside Laptop movement recorded successfully.', 'success');
        setIsCreateModalOpen(false);
        setCreateForm({
          movementType: 'OUT',
          laptopName: '',
          laptopIdentifier: '',
          personName: '',
          personDetails: '',
          company: 'Faith Automation',
          contactNumber: '',
          destination: '',
          purpose: '',
          remarks: '',
        });
        await loadData();
      } else {
        showToast(res.message || 'Failed to record movement.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record movement.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Record Return (IN)
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      setActionLoading(true);
      const raw = await api.post('/outside-laptops', {
        movementType: 'IN',
        laptopName: selectedRecord.laptopName,
        laptopIdentifier: selectedRecord.laptopIdentifier,
        personName: selectedRecord.personName,
        personDetails: selectedRecord.personDetails,
        company: selectedRecord.company,
        contactNumber: selectedRecord.contactNumber,
        destination: selectedRecord.destination,
        purpose: 'Return from ' + (selectedRecord.destination || 'outside'),
        remarks: returnRemarks.trim() || 'Returned to premises in verified condition',
        linkedOutRecordId: selectedRecord.id,
      });

      const res = unpackApiResponse(raw);
      if (res.success) {
        showToast(`Laptop ${selectedRecord.laptopIdentifier} marked as returned successfully.`, 'success');
        setIsReturnModalOpen(false);
        setSelectedRecord(null);
        setReturnRemarks('');
        await loadData();
      } else {
        showToast(res.message || 'Failed to record laptop return.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record laptop return.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (record: OutsideLaptopRecord) => {
    setSelectedRecord(record);
    setEditForm({
      laptopName: record.laptopName,
      laptopIdentifier: record.laptopIdentifier,
      personName: record.personName,
      personDetails: record.personDetails || '',
      company: record.company || '',
      contactNumber: record.contactNumber || '',
      destination: record.destination || '',
      purpose: record.purpose,
      remarks: record.remarks || '',
      status: record.status,
    });
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      setActionLoading(true);
      const raw = await api.put(`/outside-laptops/${selectedRecord.id}`, editForm);
      const res = unpackApiResponse(raw);
      if (res.success) {
        showToast('Outside Laptop record updated successfully.', 'success');
        setIsEditModalOpen(false);
        setSelectedRecord(null);
        await loadData();
      } else {
        showToast(res.message || 'Failed to update record.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update record.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Record
  const handleDeleteRecord = async (record: OutsideLaptopRecord) => {
    if (!window.confirm(`Are you sure you want to delete record ${record.recordCode} (${record.laptopName})?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const raw = await api.delete(`/outside-laptops/${record.id}`);
      const res = unpackApiResponse(raw);
      if (res.success) {
        showToast('Record deleted successfully.', 'success');
        await loadData();
      } else {
        showToast(res.message || 'Failed to delete record.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete record.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const raw = await api.get('/outside-laptops/export');
      const res = unpackApiResponse<OutsideLaptopRecord[]>(raw);
      const exportList: OutsideLaptopRecord[] = res.data || records;

      if (!exportList || exportList.length === 0) {
        showToast('No Outside Laptop records available to export.', 'info');
        return;
      }

      const exportRows = exportList.map((r) => ({
        'Record Code': r.recordCode,
        'Laptop Name / Model': r.laptopName,
        'Laptop ID / Identifier': r.laptopIdentifier,
        'Person Name': r.personName,
        'Person Details': r.personDetails || '—',
        Company: r.company || '—',
        'Contact Number': r.contactNumber || '—',
        'Movement Type': r.movementType,
        'Date & Time (IST)': formatDateTimeIST(r.movementDateTime),
        Destination: r.destination || '—',
        Purpose: r.purpose,
        'Recorded By': r.recordedBy?.username || 'Security Guard',
        Status: r.status,
        Remarks: r.remarks || '—',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Outside Laptops');
      XLSX.writeFile(
        workbook,
        `Faith_Outside_Laptops_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      showToast('Outside Laptop register exported to Excel.', 'success');
    } catch (err) {
      showToast('Failed to export Outside Laptop records.', 'error');
    }
  };

  // Format IST Date & Time
  const formatDateTime = (dateStr: string) => {
    return formatDateTimeIST(dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E2538] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <LogOut className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Outside Laptop Register</h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 font-bold">
              Gate Manual Entry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manual security gate register for laptops taken outside premises. Completely isolated from Asset Inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-[#121A2D] hover:bg-[#1A2642] text-cyan-400 border border-cyan-500/30 rounded-lg shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel (XLSX)
          </Button>

          <Button
            onClick={() => {
              setCreateForm({
                movementType: 'OUT',
                laptopName: '',
                laptopIdentifier: '',
                personName: '',
                personDetails: '',
                company: 'Faith Automation',
                contactNumber: '',
                destination: '',
                purpose: '',
                remarks: '',
              });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-lg shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Laptop OUT
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0C101C] border border-[#1E2538] rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Movements</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono">{stats.totalMovements}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">All manual entries recorded</span>
        </div>

        <div className="bg-[#0C101C] border border-amber-500/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400 font-semibold">Currently Outside</span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2 font-mono">{stats.currentlyOutside}</p>
          <span className="text-[11px] text-amber-400/70 mt-0.5 block">Awaiting physical return</span>
        </div>

        <div className="bg-[#0C101C] border border-emerald-500/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400 font-semibold">Returned to Premises</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{stats.totalReturned}</p>
          <span className="text-[11px] text-emerald-400/70 mt-0.5 block">Safely returned & cleared</span>
        </div>

        <div className="bg-[#0C101C] border border-[#1E2538] rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Today's Movements</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono">{stats.todayMovements}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Gate transactions today</span>
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="bg-[#0C101C] border border-[#1E2538] rounded-xl p-3 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E2538] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('currently_outside')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'currently_outside'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              Currently Outside ({stats.currentlyOutside})
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Movement History Register ({stats.totalMovements})
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-1.5 bg-[#121624] hover:bg-[#1A2035] text-slate-400 hover:text-white border border-[#212C44] rounded-lg text-xs flex items-center gap-1 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-mono">Refresh</span>
          </button>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────────
            TAB 1: CURRENTLY OUTSIDE LAPTOPS
        ────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'currently_outside' && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={outsideSearch}
                  onChange={(e) => setOutsideSearch(e.target.value)}
                  placeholder="Search by Laptop Name, ID, Person, Destination..."
                  className="w-full pl-9 pr-3 py-2 bg-[#121828] border border-[#212C44] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing {currentlyOutside.length} laptop(s) outside
              </span>
            </div>

            {/* Currently Outside Table */}
            {currentlyOutside.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-[#1E2538] rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-75" />
                <h3 className="text-sm font-semibold text-white">All Laptops Accounted For</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No laptops are currently marked outside company premises. To log an exit, click "Record Laptop OUT".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#1E2538]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#121624] text-slate-400 font-mono text-[11px] uppercase border-b border-[#1E2538]">
                    <tr>
                      <th className="p-3">Record ID</th>
                      <th className="p-3">Laptop Details</th>
                      <th className="p-3">Person / Carrier</th>
                      <th className="p-3">Destination & Purpose</th>
                      <th className="p-3">Out Date & Time</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2538]">
                    {currentlyOutside.map((row) => (
                      <tr key={row.id} className="hover:bg-[#121828]/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-400">
                          {row.recordCode}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{row.laptopName}</div>
                          <div className="text-[11px] font-mono text-slate-400">ID: {row.laptopIdentifier}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-white">{row.personName}</div>
                          <div className="text-[11px] text-slate-400">
                            {row.personDetails ? `${row.personDetails} • ` : ''}
                            {row.company || 'Faith Automation'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-white font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            {row.destination || 'External Site'}
                          </div>
                          <div className="text-[11px] text-slate-400">{row.purpose}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {formatDateTime(row.movementDateTime)}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">
                          {row.contactNumber || '—'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedRecord(row);
                                setReturnRemarks('');
                                setIsReturnModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="Record Laptop Return (IN)"
                            >
                              <LogIn className="w-3 h-3" />
                              Record Return (IN)
                            </button>

                            <button
                              onClick={() => openEditModal(row)}
                              className="p-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                              title="Edit Record"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteRecord(row)}
                              className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/20 rounded text-xs transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────────
            TAB 2: MOVEMENT HISTORY REGISTER
        ────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* History Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search Code, Laptop, Person, Destination..."
                  className="w-full pl-9 pr-3 py-1.5 bg-[#121828] border border-[#212C44] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <select
                  value={movementFilter}
                  onChange={(e) => {
                    setMovementFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Movements (IN & OUT)</option>
                  <option value="OUT">Physical Exit (OUT)</option>
                  <option value="IN">Physical Entry (IN)</option>
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OUTSIDE">Currently Outside</option>
                  <option value="RETURNED">Returned</option>
                </select>
              </div>

              <div className="flex gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-1/2 bg-[#121828] border border-[#212C44] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  title="From Date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-1/2 bg-[#121828] border border-[#212C44] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  title="To Date"
                />
              </div>
            </div>

            {/* History Table */}
            {records.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-[#1E2538] rounded-xl text-slate-400 text-xs">
                No Outside Laptop movements found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#1E2538]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#121624] text-slate-400 font-mono text-[11px] uppercase border-b border-[#1E2538]">
                    <tr>
                      <th className="p-3">Record ID</th>
                      <th className="p-3">Movement</th>
                      <th className="p-3">Laptop Info</th>
                      <th className="p-3">Person / Carrier</th>
                      <th className="p-3">Destination & Purpose</th>
                      <th className="p-3">Date & Exact Time (IST)</th>
                      <th className="p-3">Recorded By</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2538]">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-[#121828]/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-cyan-400">
                          {r.recordCode}
                        </td>
                        <td className="p-3">
                          {r.movementType === 'OUT' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <LogOut className="w-2.5 h-2.5" />
                              OUT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <LogIn className="w-2.5 h-2.5" />
                              IN
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{r.laptopName}</div>
                          <div className="text-[11px] font-mono text-slate-400">ID: {r.laptopIdentifier}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-white">{r.personName}</div>
                          <div className="text-[11px] text-slate-400">
                            {r.personDetails ? `${r.personDetails} • ` : ''}
                            {r.company || 'Faith Automation'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-white font-medium">{r.destination || '—'}</div>
                          <div className="text-[11px] text-slate-400">{r.purpose}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {formatDateTime(r.movementDateTime)}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">
                          {r.recordedBy?.employee?.fullName || r.recordedBy?.username || 'Security Guard'}
                        </td>
                        <td className="p-3">
                          {r.status === 'OUTSIDE' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/40 border border-amber-500/30 text-amber-400">
                              OUTSIDE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
                              RETURNED
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(r)}
                              className="p-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                              title="Edit Record"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(r)}
                              className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/20 rounded text-xs transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#1E2538] pt-3 text-xs text-slate-400">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 bg-[#121828] hover:bg-[#1A2642] disabled:opacity-40 rounded border border-[#212C44] text-white"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 bg-[#121828] hover:bg-[#1A2642] disabled:opacity-40 rounded border border-[#212C44] text-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 1: RECORD OUTSIDE LAPTOP (FAST MANUAL ENTRY FOR GUARD)
      ────────────────────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0C101C] border border-[#1E2538] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#1E2538] flex items-center justify-between bg-[#121624]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Record Outside Laptop Movement</h3>
                  <p className="text-[11px] text-slate-400">Manual gate entry by Security Guard</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              {/* Movement Type Toggle */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Movement Direction *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, movementType: 'OUT' })}
                    className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      createForm.movementType === 'OUT'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                        : 'bg-[#121828] text-slate-400 border-[#212C44] hover:text-white'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    OUT (Premises Exit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, movementType: 'IN' })}
                    className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      createForm.movementType === 'IN'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                        : 'bg-[#121828] text-slate-400 border-[#212C44] hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    IN (Premises Entry)
                  </button>
                </div>
              </div>

              {/* Laptop Name & Identifier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Laptop Name / Model *</label>
                  <input
                    type="text"
                    required
                    value={createForm.laptopName}
                    onChange={(e) => setCreateForm({ ...createForm, laptopName: e.target.value })}
                    placeholder="e.g. Dell Latitude 5420"
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Laptop ID / Identifier *</label>
                  <input
                    type="text"
                    required
                    value={createForm.laptopIdentifier}
                    onChange={(e) => setCreateForm({ ...createForm, laptopIdentifier: e.target.value })}
                    placeholder="e.g. LAP-992 or Serial No"
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Person Name & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Person Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.personName}
                    onChange={(e) => setCreateForm({ ...createForm, personName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department / Employee ID</label>
                  <input
                    type="text"
                    value={createForm.personDetails}
                    onChange={(e) => setCreateForm({ ...createForm, personDetails: e.target.value })}
                    placeholder="e.g. EMP-104 / Automation Dept"
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Company & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Company / Organization</label>
                  <input
                    type="text"
                    value={createForm.company}
                    onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                    placeholder="e.g. Faith Automation"
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    value={createForm.contactNumber}
                    onChange={(e) => setCreateForm({ ...createForm, contactNumber: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Destination & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    value={createForm.destination}
                    onChange={(e) => setCreateForm({ ...createForm, destination: e.target.value })}
                    placeholder="e.g. Pune Client Site, Home Office"
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Purpose / Reason *</label>
                  <input
                    type="text"
                    required
                    value={createForm.purpose}
                    onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                    placeholder="e.g. Commissioning & Testing"
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Remarks / Accessories Noted</label>
                <textarea
                  rows={2}
                  value={createForm.remarks}
                  onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                  placeholder="e.g. Charger, laptop bag and mouse included. Good physical condition."
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Authoritative Timestamp Banner */}
              <div className="bg-[#121A2D] border border-cyan-500/20 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-cyan-300">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Date & exact time will be stamped authoritatively by the backend server at the moment of submission.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2538]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#121828] hover:bg-[#1A2035] text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Movement Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 2: RECORD RETURN (IN)
      ────────────────────────────────────────────────────────────────────────── */}
      {isReturnModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0C101C] border border-[#1E2538] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#1E2538] flex items-center justify-between bg-[#121624]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Record Laptop Return (IN)</h3>
                  <p className="text-[11px] text-slate-400">Premises physical return verification</p>
                </div>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-5 space-y-4 text-xs">
              {/* Summary Card */}
              <div className="bg-[#121828] border border-[#212C44] rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
                  <span>Record ID:</span>
                  <span className="font-bold text-amber-400">{selectedRecord.recordCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Laptop:</span>
                  <span className="text-white font-semibold">{selectedRecord.laptopName} ({selectedRecord.laptopIdentifier})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Carrier / Person:</span>
                  <span className="text-white font-semibold">{selectedRecord.personName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Destination:</span>
                  <span className="text-slate-200">{selectedRecord.destination || 'External Site'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
                  <span>Out Date & Time:</span>
                  <span>{formatDateTime(selectedRecord.movementDateTime)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Return Inspection / Remarks</label>
                <textarea
                  rows={3}
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="e.g. Returned in good condition. Serial number and charger verified."
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-[#121A2D] border border-emerald-500/20 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-emerald-300">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Authoritative return timestamp will be saved to PostgreSQL and an IN movement record will be preserved in history.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2538]">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 bg-[#121828] hover:bg-[#1A2035] text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Return (IN)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 3: EDIT RECORD
      ────────────────────────────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0C101C] border border-[#1E2538] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#1E2538] flex items-center justify-between bg-[#121624]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Outside Laptop Record</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Record: {selectedRecord.recordCode}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Laptop Name / Model *</label>
                  <input
                    type="text"
                    required
                    value={editForm.laptopName}
                    onChange={(e) => setEditForm({ ...editForm, laptopName: e.target.value })}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Laptop ID / Identifier *</label>
                  <input
                    type="text"
                    required
                    value={editForm.laptopIdentifier}
                    onChange={(e) => setEditForm({ ...editForm, laptopIdentifier: e.target.value })}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Person Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.personName}
                    onChange={(e) => setEditForm({ ...editForm, personName: e.target.value })}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department / Details</label>
                  <input
                    type="text"
                    value={editForm.personDetails}
                    onChange={(e) => setEditForm({ ...editForm, personDetails: e.target.value })}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Company / Organization</label>
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editForm.contactNumber}
                    onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Destination</label>
                  <input
                    type="text"
                    value={editForm.destination}
                    onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="OUTSIDE">OUTSIDE</option>
                    <option value="RETURNED">RETURNED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Purpose *</label>
                <input
                  type="text"
                  required
                  value={editForm.purpose}
                  onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2538]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-[#121828] hover:bg-[#1A2035] text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
