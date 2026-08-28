import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../contexts/ToastContext';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../services/api';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface AssignmentItem {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  model: string;
  manufacturer?: string;
  assetType: string;
  serialNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeeEmail: string;
  departmentName: string;
  locationName: string;
  assignedAt: string;
  expectedReturnDate?: string | null;
  conditionAtAssignment: string;
  remarks: string;
  status: string;
}

interface AvailableAsset {
  id: string;
  companyAssetId: string;
  assetCode: string;
  assetName: string;
  serialNumber?: string | null;
  location?: string | null;
  sourceAssetType?: string | null;
  assetType: string;
}

interface EmployeeOption {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  designation?: string | null;
  department?: { name: string } | null;
  location?: { name: string } | null;
}

/* ─── Status helpers ─────────────────────────────────────────────────────── */
// All WorkflowStatus values supported by the backend + DB
const ALL_STATUSES = ['ACTIVE', 'PENDING', 'APPROVED', 'COMPLETED', 'RETURNED', 'REJECTED', 'CANCELLED'] as const;
type WorkflowStatus = typeof ALL_STATUSES[number];

/**
 * Export assignments to Excel with clean, human-readable column headers
 * (includes Status column explicitly).
 */
const exportAssignmentsExcel = (records: AssignmentItem[]) => {
  if (!records.length) return;

  const rows = records.map((a) => ({
    'Assignment ID':       a.id,
    'Asset Code':          a.assetCode,
    'Asset Name':          a.assetName,
    'Device Model':        a.manufacturer ? `${a.manufacturer} ${a.model}` : a.model,
    'Asset Type':          a.assetType,
    'Serial Number':       a.serialNumber,
    'Custodian Name':      a.employeeName,
    'Employee Code':       a.employeeCode,
    'Employee Email':      a.employeeEmail,
    'Department / Area':   a.departmentName,
    'Location':            a.locationName,
    'Handover Date':       a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : '',
    'Expected Return':     a.expectedReturnDate ? new Date(a.expectedReturnDate).toLocaleDateString() : 'Indefinite',
    'Condition':           a.conditionAtAssignment || 'GOOD',
    'Status':              a.status,
    'Remarks':             a.remarks,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const keys = Object.keys(rows[0] || {});
  ws['!cols'] = keys.map((k) => {
    let max = k.length;
    rows.forEach((r) => {
      const v = String((r as any)[k] ?? '');
      if (v.length > max) max = Math.min(v.length, 50);
    });
    return { wch: max + 3 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Assignments');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `FAITH_ITAM_Assignments_${dateStr}.xlsx`);
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export const Assignments: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tab filter: 'ALL' | any WorkflowStatus
  const [tabFilter, setTabFilter] = useState<'ALL' | WorkflowStatus>('ALL');
  // Status dropdown filter (applied on top of tab)
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // Form
  const [formData, setFormData] = useState({
    assetId: '',
    employeeId: '',
    conditionAtAssignment: 'GOOD',
    expectedReturnDate: '',
    remarks: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* ── API calls ─────────────────────────────────────────────────────────── */
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/assignments');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && Array.isArray(data)) {
        setAssignments(data);
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
      showToast('Failed to load asset assignments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res: any = await api.get('/assignments/options');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setAvailableAssets(data.availableAssets || []);
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load assignment options:', err);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchOptions();
  }, []);

  /* ── Modal open ─────────────────────────────────────────────────────────── */
  const openAssignModal = () => {
    fetchOptions();
    setFormData({
      assetId: availableAssets[0]?.id || '',
      employeeId: employees[0]?.id || '',
      conditionAtAssignment: 'GOOD',
      expectedReturnDate: '',
      remarks: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  /* ── Form submit ─────────────────────────────────────────────────────────── */
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.assetId) errors.assetId = 'Please select an asset to assign.';
    if (!formData.employeeId) errors.employeeId = 'Please select an employee.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setModalLoading(true);
    try {
      const payload = {
        assetId: formData.assetId,
        employeeId: formData.employeeId,
        conditionAtAssignment: formData.conditionAtAssignment,
        expectedReturnDate: formData.expectedReturnDate || undefined,
        remarks: formData.remarks || 'Direct handover via ITAM portal',
      };
      const res: any = await api.post('/assignments', payload);
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Asset assigned successfully!', 'success');
        setIsModalOpen(false);
        await fetchAssignments();
        await fetchOptions();
      } else {
        showToast(res?.message || 'Failed to assign asset.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error creating assignment.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  /* ── Derived counts from real data ──────────────────────────────────────── */
  // Count by status — from actual PostgreSQL data
  const countByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    assignments.forEach((a) => {
      const s = a.status || 'UNKNOWN';
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [assignments]);

  // Statuses that actually appear in the current dataset
  const presentStatuses = useMemo(() => {
    return ALL_STATUSES.filter((s) => (countByStatus[s] || 0) > 0);
  }, [countByStatus]);

  /* ── Filtered rows ──────────────────────────────────────────────────────── */
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // Tab filter
      if (tabFilter === 'RETURNED') {
        if (a.status !== 'RETURNED' && a.status !== 'COMPLETED') return false;
      } else if (tabFilter !== 'ALL') {
        if (a.status !== tabFilter) return false;
      }

      // Status dropdown filter (more granular)
      if (filterStatus && a.status !== filterStatus) return false;

      // Text search
      if (search) {
        const q = search.toLowerCase();
        return (
          (a.assetCode || '').toLowerCase().includes(q) ||
          (a.assetName || '').toLowerCase().includes(q) ||
          (a.model || '').toLowerCase().includes(q) ||
          (a.employeeName || '').toLowerCase().includes(q) ||
          (a.employeeCode || '').toLowerCase().includes(q) ||
          (a.departmentName || '').toLowerCase().includes(q) ||
          (a.locationName || '').toLowerCase().includes(q) ||
          (a.status || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assignments, tabFilter, filterStatus, search]);

  /* ── Tab badge counts (always from total, not filtered view) ────────────── */
  const totalCount    = assignments.length;
  const activeCount   = countByStatus['ACTIVE'] || 0;
  const returnedCount = (countByStatus['RETURNED'] || 0) + (countByStatus['COMPLETED'] || 0);
  const pendingCount  = countByStatus['PENDING'] || 0;

  // KPI card counts
  const indefiniteCount = assignments.filter((a) => !a.expectedReturnDate && a.status === 'ACTIVE').length;
  const scheduledCount  = assignments.filter((a) => !!a.expectedReturnDate && a.status === 'ACTIVE').length;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Assignments"
        subtitle="Manage official IT device allocations, custodian handovers, and return schedules."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportAssignmentsExcel(assignments);
                showToast('Excel export generated successfully.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel
            </Button>
            <Button variant="secondary" onClick={fetchAssignments}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            <Button variant="primary" onClick={openAssignModal} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-md">
              <Plus className="w-4 h-4 mr-1.5" />
              Assign Asset
            </Button>
          </div>
        }
      />

      {/* KPI Cards — all counts from real PostgreSQL data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-textSecondary uppercase font-semibold">Total Records</span>
              <div className="text-2xl font-bold font-mono text-textPrimary mt-0.5">{totalCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center text-brandPrimary">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Active In-Use</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{activeCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase font-semibold">Permanent / Indefinite</span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-0.5">{indefiniteCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-semibold">Scheduled Return</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{scheduledCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden border-borderBase">

        {/* Controls Bar */}
        <div className="p-4 border-b border-borderBase bg-bgElevated/50 flex flex-wrap items-center justify-between gap-3">

          {/* Tab Buttons — counts from real data */}
          <div className="flex flex-wrap items-center gap-1 bg-bgBase p-1 rounded-lg border border-borderBase">
            <button
              onClick={() => { setTabFilter('ALL'); setFilterStatus(''); }}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                tabFilter === 'ALL' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => { setTabFilter('ACTIVE'); setFilterStatus(''); }}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                tabFilter === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Active ({activeCount})
            </button>
            {pendingCount > 0 && (
              <button
                onClick={() => { setTabFilter('PENDING'); setFilterStatus(''); }}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  tabFilter === 'PENDING' ? 'bg-amber-600 text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                Pending ({pendingCount})
              </button>
            )}
            <button
              onClick={() => { setTabFilter('RETURNED'); setFilterStatus(''); }}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                tabFilter === 'RETURNED' ? 'bg-indigo-600 text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Returned ({returnedCount})
            </button>
            {/* Dynamically show other statuses that actually exist in the data */}
            {presentStatuses
              .filter((s) => !['ACTIVE', 'PENDING', 'RETURNED', 'COMPLETED'].includes(s))
              .map((s) => (
                <button
                  key={s}
                  onClick={() => { setTabFilter(s); setFilterStatus(''); }}
                  className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                    tabFilter === s ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()} ({countByStatus[s] || 0})
                </button>
              ))}
          </div>

          {/* Right controls: Status dropdown + Search */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter dropdown */}
            <div className="relative flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-textSecondary" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs bg-bgBase border border-borderBase rounded-lg px-2.5 py-1.5 text-textPrimary focus:outline-none focus:border-brandPrimary font-mono"
              >
                <option value="">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s} {countByStatus[s] ? `(${countByStatus[s]})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative w-64">
              <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search asset, employee, dept, status…"
                className="w-full text-xs bg-bgBase border border-borderBase rounded-lg pl-9 pr-3 py-1.5 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-brandPrimary font-mono"
              />
            </div>
          </div>
        </div>

        {/* Result count */}
        {(search || filterStatus || tabFilter !== 'ALL') && (
          <div className="px-4 py-1.5 text-[11px] text-textSecondary border-b border-borderBase bg-bgBase/40 font-mono">
            Showing <strong className="text-textPrimary">{filteredAssignments.length}</strong> of {totalCount} records
            {search && <span> matching "<em>{search}</em>"</span>}
            {filterStatus && <span> • Status: <strong className="text-textPrimary">{filterStatus}</strong></span>}
          </div>
        )}

        {/* ── Data Table ── */}
        {/*
          KEY FIX: overflow-x-auto on wrapper + min-w-[900px] on table ensures
          Status column is ALWAYS visible — it never gets clipped or truncated.
          On narrow screens the table scrolls horizontally rather than hiding columns.
        */}
        <div className="overflow-x-auto w-full">
          <table className="text-left text-xs border-collapse" style={{ minWidth: '960px', width: '100%' }}>
            <thead className="bg-bgBase/80 border-b border-borderBase text-[10px] text-textSecondary font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Asset ID</th>
                <th className="py-3 px-4 whitespace-nowrap">Device Model</th>
                <th className="py-3 px-4 whitespace-nowrap">Type</th>
                <th className="py-3 px-4 whitespace-nowrap">Assigned Custodian</th>
                <th className="py-3 px-4 whitespace-nowrap">Department / Area</th>
                <th className="py-3 px-4 whitespace-nowrap">Handover Date</th>
                <th className="py-3 px-4 whitespace-nowrap">Expected Return</th>
                <th className="py-3 px-4 whitespace-nowrap">Condition</th>
                {/* STATUS: explicitly wide enough to never clip */}
                <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Status</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase font-mono">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-textSecondary">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Loading assignments…
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((item) => (
                  <tr key={item.id} className="hover:bg-bgElevated/60 transition-colors">

                    {/* Asset ID */}
                    <td className="py-3 px-4">
                      <span
                        onClick={() => navigate(`/assets/${item.assetId}`)}
                        className="font-bold text-brandPrimary cursor-pointer hover:underline flex items-center gap-1 whitespace-nowrap"
                      >
                        {item.assetCode}
                        <ArrowUpRight className="w-3 h-3 opacity-60" />
                      </span>
                      <span className="text-[10px] text-textSecondary block whitespace-nowrap">SN: {item.serialNumber}</span>
                    </td>

                    {/* Model */}
                    <td className="py-3 px-4 font-sans font-medium text-textPrimary whitespace-nowrap">
                      {item.manufacturer ? `${item.manufacturer} ` : ''}{item.model}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 text-textSecondary whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-bgBase border border-borderBase text-[10px]">
                        {item.assetType}
                      </span>
                    </td>

                    {/* Custodian */}
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-textPrimary whitespace-nowrap">{item.employeeName}</div>
                      <div className="text-[10px] text-textSecondary font-mono whitespace-nowrap">
                        {item.employeeCode} • {item.employeeEmail}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 font-sans text-textSecondary whitespace-nowrap">
                      <div>{item.departmentName}</div>
                      <div className="text-[10px] text-textMuted">{item.locationName}</div>
                    </td>

                    {/* Handover Date */}
                    <td className="py-3 px-4 text-textSecondary whitespace-nowrap">
                      {item.assignedAt ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 opacity-60" />
                          {new Date(item.assignedAt).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Expected Return */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.expectedReturnDate ? (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.expectedReturnDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-textMuted italic">Indefinite</span>
                      )}
                    </td>

                    {/* Condition */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-bgBase text-[10px] text-textSecondary border border-borderBase">
                        {item.conditionAtAssignment || 'GOOD'}
                      </span>
                    </td>

                    {/* ── STATUS — from real PostgreSQL data via WorkflowStatus enum ── */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={item.status || 'ACTIVE'} type="workflow" />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right font-sans whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/assets/${item.assetId}`)}
                        className="text-brandPrimary hover:text-white text-xs"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}

              {!loading && filteredAssignments.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-textSecondary">
                    <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-textPrimary">No Records Found</p>
                    <p className="text-xs text-textMuted mt-0.5">
                      {search || filterStatus
                        ? 'Try adjusting your search or status filter.'
                        : 'Click "Assign Asset" to register a device handover.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Assign Asset Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assign Asset to Employee"
        subtitle="Handover an available IT device to an active employee custodian."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs font-sans">
          {/* Select Asset */}
          <div>
            <label className="block text-textSecondary font-medium mb-1">
              Select Available Asset <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.assetId}
              onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono text-xs focus:outline-none focus:border-brandPrimary"
            >
              <option value="">-- Choose Asset from Inventory --</option>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.companyAssetId} — {asset.assetName} ({asset.sourceAssetType || asset.assetType}) | {asset.location || 'HQ'}
                </option>
              ))}
            </select>
            {formErrors.assetId && <p className="text-rose-400 text-[11px] mt-1">{formErrors.assetId}</p>}
            {availableAssets.length === 0 && (
              <p className="text-amber-400 text-[11px] mt-1">
                No unallocated assets available. Register a new asset or return an existing one first.
              </p>
            )}
          </div>

          {/* Select Employee */}
          <div>
            <label className="block text-textSecondary font-medium mb-1">
              Select Employee Custodian <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
            >
              <option value="">-- Choose Active Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeCode}) — {emp.department?.name || 'General'}
                </option>
              ))}
            </select>
            {formErrors.employeeId && <p className="text-rose-400 text-[11px] mt-1">{formErrors.employeeId}</p>}
          </div>

          {/* Condition & Expected Return */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Physical Condition</label>
              <select
                value={formData.conditionAtAssignment}
                onChange={(e) => setFormData({ ...formData, conditionAtAssignment: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              >
                <option value="NEW">Brand New</option>
                <option value="GOOD">Good Condition</option>
                <option value="FAIR">Fair Condition</option>
                <option value="DAMAGED">Damaged / Functional</option>
              </select>
            </div>
            <div>
              <label className="block text-textSecondary font-medium mb-1">
                Expected Return Date <span className="text-textMuted font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={formData.expectedReturnDate}
                onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-1.5 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary font-mono"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-textSecondary font-medium mb-1">
              Handover Remarks / Project Purpose
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. Standard workstation issued for Automation Design project."
              rows={3}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={modalLoading}
              className="bg-brandPrimary hover:bg-brandPrimary/90 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
