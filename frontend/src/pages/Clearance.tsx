import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import type { Clearance as ClearanceRecord, ClearanceStatus } from '../types';
import { exportClearancesToExcel } from '../utils/exporters';
import {
  UserX,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  X,
} from 'lucide-react';

export const Clearance: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [clearances, setClearances] = useState<ClearanceRecord[]>([]);

  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);

  // Initiate Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [exitDate, setExitDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchClearances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '25');
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res: any = await api.get(`/clearance?${params.toString()}`);
      const data = res?.data ?? res;
      if (data?.clearances) {
        setClearances(data.clearances);
        setTotal(data.total);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch clearances', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClearances();
  }, [page, statusFilter]);

  const openInitiateModal = async () => {
    setShowModal(true);
    try {
      const res: any = await api.get('/employees?limit=100');
      const data = res?.data?.employees || res?.data || [];
      setEmployees(data);
    } catch {}
  };

  const handleInitiateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !exitDate) {
      showToast('Please select employee and exit date', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await api.post('/clearance', {
        employeeId: selectedEmployeeId,
        exitDate,
        reason,
        notes,
      });
      showToast('Clearance workflow initiated successfully', 'success');
      setShowModal(false);
      setSelectedEmployeeId('');
      setExitDate('');
      setReason('');
      setNotes('');
      fetchClearances();
      if (res?.data?.id) {
        navigate(`/clearance/${res.data.id}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initiate clearance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inProgressCount = clearances.filter((c) => c.status === 'IN_PROGRESS').length;
  const pendingApprovalCount = clearances.filter((c) => c.status === 'PENDING_APPROVAL' || c.status === 'PENDING_REVIEW').length;
  const clearedCount = clearances.filter((c) => c.status === 'CLEARED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Employee Exit & Asset Clearance"
        subtitle="Mandatory offboarding workflows, physical asset recovery, exception sign-offs, and final clearance certificates."
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={() => {
                exportClearancesToExcel(clearances);
                showToast('Clearances exported to Excel', 'success');
              }}
            >
              Export XLSX
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={openInitiateModal}
            >
              Initiate Exit Clearance
            </Button>
          </div>
        }
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#10141D] border-[#222A38] flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Clearances</p>
            <h3 className="text-xl font-bold text-white font-mono mt-0.5">{total}</h3>
          </div>
        </Card>

        <Card className="p-4 bg-[#10141D] border-[#222A38] flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">In Progress</p>
            <h3 className="text-xl font-bold text-amber-400 font-mono mt-0.5">{inProgressCount}</h3>
          </div>
        </Card>

        <Card className="p-4 bg-[#10141D] border-[#222A38] flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Pending Sign-off</p>
            <h3 className="text-xl font-bold text-indigo-400 font-mono mt-0.5">{pendingApprovalCount}</h3>
          </div>
        </Card>

        <Card className="p-4 bg-[#10141D] border-[#222A38] flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Cleared & Completed</p>
            <h3 className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{clearedCount}</h3>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 bg-[#10141D] border-[#222A38]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchClearances();
            }}
            className="relative flex-1 min-w-[240px]"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clearance code, employee name, code..."
              className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </form>

          <div className="flex items-center space-x-2 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="CLEARED">Cleared</option>
              <option value="BLOCKED">Blocked</option>
            </select>

            {(search || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setPage(1);
                }}
                className="px-2 py-1.5 text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Clearances Table */}
      <Card className="p-5 bg-[#10141D] border-[#222A38]">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading offboarding clearance records...</div>
        ) : clearances.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <UserX className="w-10 h-10 mx-auto mb-3 opacity-30 text-amber-400" />
            <h4 className="text-sm font-semibold text-white">No clearance records found</h4>
            <p className="text-xs text-slate-500 mt-1">
              Initiate an exit clearance workflow when an employee announces their departure.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222A38] text-slate-400">
                  <th className="py-2 px-3">Clearance Code</th>
                  <th className="py-2 px-3">Employee</th>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Exit Date</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Recovery Progress</th>
                  <th className="py-2 px-3">Initiated By</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2536]">
                {clearances.map((c) => {
                  const percent = c.totalItems > 0 ? Math.round((c.resolvedItems / c.totalItems) * 100) : 100;
                  return (
                    <tr key={c.id} className="hover:bg-[#141923]">
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{c.clearanceCode}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-white">{c.employee?.fullName}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {c.employee?.employeeCode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{c.employee?.department || '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {new Date(c.exitDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'CLEARED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : c.status === 'IN_PROGRESS'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-indigo-500/20 text-indigo-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 min-w-[140px]">
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className="text-slate-400">
                            {c.resolvedItems} / {c.totalItems} resolved
                          </span>
                          <span className="text-white font-bold">{percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1A2230] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{c.initiatedBy}</td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => navigate(`/clearance/${c.id}`)}
                          className="px-2.5 py-1 rounded bg-[#1A2230] hover:bg-[#232F42] text-cyan-400 font-semibold text-xs flex items-center space-x-1"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Initiate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <h3 className="text-sm font-bold text-white">Initiate Employee Exit Clearance</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Offboarding Employee *</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  required
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode}) — {emp.department?.name || 'No Dept'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Official Exit / Last Working Date *</label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  required
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                </input>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Departure</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Resignation, Contract End, Transfer"
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Additional Instructions / Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Handover priorities, special exceptions, etc."
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-[11px] leading-relaxed">
                Initiating this workflow will automatically discover all active IT hardware assignments currently held by this employee and generate individual recovery checklist tasks.
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#252F42]">
                <Button size="sm" variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Initiating...' : 'Confirm & Discover Assets'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
