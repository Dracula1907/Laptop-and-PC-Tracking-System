import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ApprovalRequest,
  ApprovalCounts,
  Department,
  ApprovalRequestType,
  ApprovalStatus,
  ApprovalPriority,
} from '../types';
import { exportApprovalsToExcel } from '../utils/exporters';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  FilterX,
  Eye,
  Check,
  X,
  RotateCcw,
  ArrowRight,
  Laptop,
  ShieldCheck,
  User,
  Building,
  MapPin,
  Calendar,
  MessageSquare,
  History,
  AlertCircle,
  ExternalLink,
  Ban,
  Send,
} from 'lucide-react';

export const ApprovalCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { user, hasPermission } = useAuth();

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [counts, setCounts] = useState<ApprovalCounts>({
    total: 0,
    pending: 0,
    pendingMyAction: 0,
    approved: 0,
    rejected: 0,
    changesRequested: 0,
    myRequests: 0,
    urgent: 0,
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Queue state: 'pending_my_approval' | 'my_requests' | 'all'
  const initialQueue = (searchParams.get('queue') as any) || 'pending_my_approval';
  const [queue, setQueue] = useState<'pending_my_approval' | 'my_requests' | 'all'>(initialQueue);

  // Filter & Pagination State
  const [search, setSearch] = useState<string>('');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Action Modals State
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'CANCEL' | null>(null);
  const [targetRequestId, setTargetRequestId] = useState<string | null>(null);
  const [actionComment, setActionComment] = useState<string>('');
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);

  // Fetch dynamic telemetry counts
  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/approvals/counts');
      if (res.success) setCounts(res.data);
    } catch (err) {
      console.error('Failed to fetch approval counts:', err);
    }
  };

  // Fetch approvals with server-side multi-search & filters
  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      params.append('queue', queue);
      if (search.trim()) params.append('search', search.trim());
      if (requestTypeFilter !== 'ALL') params.append('requestType', requestTypeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (departmentFilter !== 'ALL') params.append('departmentId', departmentFilter);

      const res: any = await api.get(`/approvals?${params.toString()}`);
      if (res.success) {
        setApprovals(res.data.requests);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalRecords(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
      showToast('Error loading approval requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, queue, search, requestTypeFilter, statusFilter, priorityFilter, departmentFilter]);

  useEffect(() => {
    fetchCounts();
    const fetchDepts = async () => {
      try {
        const res: any = await api.get('/departments?limit=100');
        if (res.success) setDepartments(res.data.departments || res.data);
      } catch (err) {}
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleQueueChange = (newQueue: 'pending_my_approval' | 'my_requests' | 'all') => {
    setQueue(newQueue);
    setPage(1);
    setSearchParams({ queue: newQueue });
  };

  const handleResetFilters = () => {
    setSearch('');
    setRequestTypeFilter('ALL');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setDepartmentFilter('ALL');
    setPage(1);
  };

  const hasActiveFilters =
    search !== '' ||
    requestTypeFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    departmentFilter !== 'ALL';

  const openDetailModal = async (id: string) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res: any = await api.get(`/approvals/${id}`);
      if (res.success) setSelectedRequest(res.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load request details.', 'error');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openActionModal = (
    type: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'CANCEL',
    reqId: string
  ) => {
    setActionType(type);
    setTargetRequestId(reqId);
    setActionComment('');
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRequestId || !actionType) return;

    if (actionType === 'REJECT' && !actionComment.trim()) {
      showToast('Rejection reason is mandatory.', 'error');
      return;
    }
    if (actionType === 'REQUEST_CHANGES' && !actionComment.trim()) {
      showToast('Details of requested changes are mandatory.', 'error');
      return;
    }
    if (actionType === 'CANCEL' && !actionComment.trim()) {
      showToast('Cancellation reason is mandatory.', 'error');
      return;
    }

    setActionSubmitting(true);
    try {
      let endpoint = '';
      let payload: any = {};

      if (actionType === 'APPROVE') {
        endpoint = `/approvals/${targetRequestId}/approve`;
        payload = { comment: actionComment.trim() || undefined };
      } else if (actionType === 'REJECT') {
        endpoint = `/approvals/${targetRequestId}/reject`;
        payload = { rejectionReason: actionComment.trim() };
      } else if (actionType === 'REQUEST_CHANGES') {
        endpoint = `/approvals/${targetRequestId}/request-changes`;
        payload = { changesRequested: actionComment.trim() };
      } else if (actionType === 'CANCEL') {
        endpoint = `/approvals/${targetRequestId}/cancel`;
        payload = { cancellationReason: actionComment.trim() };
      }

      const res: any = await api.post(endpoint, payload);
      if (res.success) {
        showToast(res.message || 'Action executed successfully.', 'success');
        setActionType(null);
        setTargetRequestId(null);
        setActionComment('');
        if (showDetailModal) {
          setShowDetailModal(false);
        }
        fetchApprovals();
        fetchCounts();
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Helper for SLA calculation
  const calculateSla = (createdAt: string, deadline?: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let ageStr = diffDays > 0 ? `${diffDays}d ${diffHours % 24}h` : `${diffHours}h`;

    if (deadline) {
      const dDate = new Date(deadline);
      if (now > dDate) {
        const overHours = Math.floor((now.getTime() - dDate.getTime()) / (1000 * 60 * 60));
        return (
          <span className="text-rose-400 font-bold inline-flex items-center gap-1 font-mono text-[10px]">
            <AlertCircle className="w-3 h-3" /> Overdue by {overHours}h
          </span>
        );
      }
    }

    return (
      <span className="text-slate-400 font-mono text-[10px]">
        Pending for {ageStr}
      </span>
    );
  };

  const renderPriorityBadge = (priority: ApprovalPriority) => {
    if (priority === 'URGENT') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
          <AlertTriangle className="w-3 h-3" /> Urgent
        </span>
      );
    }
    if (priority === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          High
        </span>
      );
    }
    if (priority === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
        Low
      </span>
    );
  };

  const renderStatusBadge = (status: ApprovalStatus) => {
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Clock className="w-3 h-3" /> Pending Review
        </span>
      );
    }
    if (status === 'CHANGES_REQUESTED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
          <RotateCcw className="w-3 h-3" /> Changes Requested
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Approval Center & Workflow Queue"
        subtitle="Centralized governance hub for authorizing equipment assignments, transfers, retirements, and lifecycle transactions."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportApprovalsToExcel(approvals);
                showToast('Approvals Excel report generated.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel (XLSX)
            </Button>
          </div>
        }
      />

      {/* Dynamic PostgreSQL Telemetry Summary Header */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => handleQueueChange('pending_my_approval')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            queue === 'pending_my_approval'
              ? 'bg-[#151D2A] border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400 font-mono uppercase">My Pending Queue</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1 font-mono">{counts.pendingMyAction}</p>
          <span className="text-[10px] text-amber-500/80 mt-0.5 block">Requires your review</span>
        </div>

        <div
          onClick={() => handleQueueChange('my_requests')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            queue === 'my_requests'
              ? 'bg-[#151D2A] border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-400 font-mono uppercase">My Requests</span>
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-300 mt-1 font-mono">{counts.myRequests}</p>
          <span className="text-[10px] text-indigo-500/80 mt-0.5 block">Filed by you</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('APPROVED');
            setQueue('all');
            setPage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'APPROVED' && queue === 'all'
              ? 'bg-[#151D2A] border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 font-mono uppercase">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-300 mt-1 font-mono">{counts.approved}</p>
          <span className="text-[10px] text-emerald-500/80 mt-0.5 block">Executed workflows</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('CHANGES_REQUESTED');
            setQueue('all');
            setPage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'CHANGES_REQUESTED' && queue === 'all'
              ? 'bg-[#151D2A] border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-400 font-mono uppercase">Changes Requested</span>
            <RotateCcw className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-300 mt-1 font-mono">{counts.changesRequested}</p>
          <span className="text-[10px] text-indigo-500/80 mt-0.5 block">Awaiting revisions</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('REJECTED');
            setQueue('all');
            setPage(1);
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'REJECTED' && queue === 'all'
              ? 'bg-[#151D2A] border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-400 font-mono uppercase">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-300 mt-1 font-mono">{counts.rejected}</p>
          <span className="text-[10px] text-rose-500/80 mt-0.5 block">Declined proposals</span>
        </div>
      </div>

      {/* Queue Switcher Navigation */}
      <div className="border-b border-[#1E2535] flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs font-semibold">
          <button
            onClick={() => handleQueueChange('pending_my_approval')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              queue === 'pending_my_approval'
                ? 'border-amber-500 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending My Action ({counts.pendingMyAction})
          </button>
          <button
            onClick={() => handleQueueChange('my_requests')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              queue === 'my_requests'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            My Requests ({counts.myRequests})
          </button>
          <button
            onClick={() => handleQueueChange('all')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              queue === 'all'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            All Corporate Approvals ({counts.total})
          </button>
        </div>

        {counts.urgent > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-rose-400 pb-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block mr-1" />
            {counts.urgent} Urgent Requests Require Expedited Review
          </div>
        )}
      </div>

      {/* Search & Control Filter Bar */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search request code, asset ID, model, requester, reason..."
            />
          </div>
          <div>
            <Select
              value={requestTypeFilter}
              onChange={(e) => {
                setRequestTypeFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Operation Types' },
                { value: 'ASSIGNMENT', label: 'Asset Assignment' },
                { value: 'TRANSFER', label: 'Asset Transfer' },
                { value: 'RETURN_DISPOSITION', label: 'Return / Disposition' },
                { value: 'MAINTENANCE_COMPLETION', label: 'Maintenance Completion' },
                { value: 'ASSET_RETIREMENT', label: 'Asset Retirement' },
                { value: 'ASSET_DEACTIVATION', label: 'Asset Deactivation' },
              ]}
            />
          </div>
          <div>
            <Select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Priorities' },
                { value: 'URGENT', label: 'Urgent Only' },
                { value: 'HIGH', label: 'High Priority' },
                { value: 'MEDIUM', label: 'Medium Priority' },
                { value: 'LOW', label: 'Low Priority' },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1E2535]/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Status Filter:</span>
            {['ALL', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'CANCELLED'].map((st) => (
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

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 ml-2 font-medium"
              >
                <FilterX className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
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

      {/* 13-Column Table with Internal Horizontal Scroll Container */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-w-[1450px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1E2535] bg-[#0A0D15]/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-3.5">Request ID</th>
                <th className="py-3 px-3.5">Operation Type</th>
                <th className="py-3 px-3.5">Asset ID</th>
                <th className="py-3 px-3.5">Asset Name / Model</th>
                <th className="py-3 px-3.5">Requested By</th>
                <th className="py-3 px-3.5">Department</th>
                <th className="py-3 px-3.5 text-center">Priority</th>
                <th className="py-3 px-3.5">Submitted & SLA</th>
                <th className="py-3 px-3.5 text-center">Step</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5">Decision By</th>
                <th className="py-3 px-3.5">Decision Date</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2535]/50">
              {loading ? (
                <tr>
                  <td colSpan={13} className="text-center py-16 text-slate-500 font-medium font-mono">
                    Loading Approval Requests...
                  </td>
                </tr>
              ) : approvals.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-16 text-slate-500 font-medium">
                    No approval requests found in this queue.
                  </td>
                </tr>
              ) : (
                approvals.map((req) => {
                  const isEligibleApprover =
                    req.status === 'PENDING' &&
                    req.requestedById !== user?.id &&
                    (user?.role?.code === 'ADMIN' || user?.role?.code === 'MANAGER');

                  const isOwnRequest = req.requestedById === user?.id;

                  return (
                    <tr
                      key={req.id}
                      onClick={() => openDetailModal(req.id)}
                      className="hover:bg-[#141A28] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-indigo-400">
                        {req.requestCode}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {req.requestType.replace('_', ' ')}
                        </span>
                      </td>
                      <td
                        className="py-3 px-3.5 font-mono font-bold text-indigo-300 hover:text-indigo-200 hover:underline"
                        onClick={(e) => {
                          if (req.assetId) {
                            e.stopPropagation();
                            navigate(`/assets/${req.assetId}`);
                          }
                        }}
                      >
                        {req.asset?.companyAssetId || req.asset?.assetCode || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300 max-w-xs truncate">
                        {req.asset?.model || req.asset?.assetName || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {req.requestedBy?.employee?.fullName || req.requestedBy?.username || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400">
                        {req.targetDepartment?.name || req.asset?.department?.name || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {renderPriorityBadge(req.priority)}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400">
                        <div>
                          <span className="font-mono text-[11px] block text-slate-300">
                            {new Date(req.requestedAt).toLocaleDateString('en-GB')}
                          </span>
                          {req.status === 'PENDING' && calculateSla(req.requestedAt, req.approvalDeadline)}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400 text-[11px]">
                        {req.currentStep} / {req.totalSteps}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {renderStatusBadge(req.status)}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300 text-[11px]">
                        {req.decisionBy?.employee?.fullName || req.decisionBy?.username || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px]">
                        {req.decisionAt ? new Date(req.decisionAt).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Inspect Complete Request Details & Diff"
                            onClick={() => openDetailModal(req.id)}
                            className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-indigo-300 hover:border-indigo-500 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Approver Actions */}
                          {isEligibleApprover && (
                            <>
                              <button
                                title="Approve Request & Execute"
                                onClick={() => openActionModal('APPROVE', req.id)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Reject Request"
                                onClick={() => openActionModal('REJECT', req.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Requester Cancel Action */}
                          {isOwnRequest && req.status === 'PENDING' && (
                            <button
                              title="Cancel Request"
                              onClick={() => openActionModal('CANCEL', req.id)}
                              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
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

        {/* Server-Side Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E2535] bg-[#0A0D15]/60 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{approvals.length ? (page - 1) * limit + 1 : 0}</strong> to{' '}
            <strong className="text-white">{Math.min(page * limit, totalRecords)}</strong> of{' '}
            <strong className="text-white">{totalRecords}</strong> approval requests
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

      {/* REQUEST DETAIL VIEW MODAL (Section 8) */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedRequest ? `Approval Request: ${selectedRequest.requestCode}` : 'Request Details'}
        maxWidth="xl"
      >
        {detailLoading || !selectedRequest ? (
          <div className="py-20 text-center text-slate-400 text-xs font-mono">
            Loading Approval Context...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-3.5 rounded-lg bg-[#141A28] border border-[#232C3E] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-400 text-sm">
                    {selectedRequest.requestCode}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                    {selectedRequest.requestType}
                  </span>
                  {renderPriorityBadge(selectedRequest.priority)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Submitted by{' '}
                  <strong className="text-slate-200">
                    {selectedRequest.requestedBy?.employee?.fullName || selectedRequest.requestedBy?.username}
                  </strong>{' '}
                  on {new Date(selectedRequest.requestedAt).toLocaleString('en-GB')}
                </p>
              </div>
              <div className="text-right">
                {renderStatusBadge(selectedRequest.status)}
                {selectedRequest.status === 'PENDING' && (
                  <div className="mt-1">
                    {calculateSla(selectedRequest.requestedAt, selectedRequest.approvalDeadline)}
                  </div>
                )}
              </div>
            </div>

            {/* Asset Context & Current State */}
            {selectedRequest.asset && (
              <div className="p-3.5 rounded-lg bg-[#121624] border border-[#1E2535] space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#1E2535]">
                  <span className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                    Target Hardware Asset
                  </span>
                  <button
                    onClick={() => navigate(`/assets/${selectedRequest.asset.id}`)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-semibold"
                  >
                    Open Asset Details <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Asset Code</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {selectedRequest.asset.companyAssetId || selectedRequest.asset.assetCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Model & Type</span>
                    <span className="text-slate-200">
                      {selectedRequest.asset.model} ({selectedRequest.asset.assetType})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Current Custodian</span>
                    <span className="text-slate-200">
                      {selectedRequest.asset.currentHolder?.fullName || 'IT Stock'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Current Location</span>
                    <span className="text-slate-200">
                      {selectedRequest.asset.locationRel?.name || selectedRequest.asset.location || 'HQ'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PROPOSED CHANGE DIFF CARD (Section 8) */}
            <div className="p-4 rounded-xl bg-[#0A0D15] border border-[#2B3550] space-y-3">
              <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                Proposed State Changes (Diff)
              </h5>

              {/* Diff visualization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#141A28] border border-[#1E2535] space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block pb-1 border-b border-[#1E2535]">
                    Current State
                  </span>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500">Custodian:</span>
                    <span>{selectedRequest.asset?.currentHolder?.fullName || 'IT Stock'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500">Department:</span>
                    <span>{selectedRequest.asset?.department?.name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500">Location:</span>
                    <span>{selectedRequest.asset?.locationRel?.name || selectedRequest.asset?.location || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500">Status:</span>
                    <span>{selectedRequest.asset?.status || 'AVAILABLE'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase font-mono block pb-1 border-b border-indigo-500/20">
                    Proposed State
                  </span>
                  <div className="flex items-center justify-between text-white font-medium">
                    <span className="text-indigo-300">New Custodian:</span>
                    <span className="text-emerald-400">
                      {selectedRequest.parsedChanges?.newHolderName ||
                        selectedRequest.parsedChanges?.employeeName ||
                        (selectedRequest.parsedChanges?.newHolderId ? 'Assigned Employee' : '—')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-white font-medium">
                    <span className="text-indigo-300">Department:</span>
                    <span>
                      {selectedRequest.parsedChanges?.newDepartmentName ||
                        selectedRequest.targetDepartment?.name ||
                        '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-white font-medium">
                    <span className="text-indigo-300">Location:</span>
                    <span>{selectedRequest.parsedChanges?.newLocationName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-white font-medium">
                    <span className="text-indigo-300">Target Status:</span>
                    <span className="text-amber-300">
                      {selectedRequest.parsedChanges?.targetStatus ||
                        (selectedRequest.requestType === 'ASSIGNMENT' ? 'ASSIGNED' : 'TRANSFERRED')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Justification & Remarks */}
              {(selectedRequest.reason || selectedRequest.comments) && (
                <div className="pt-2 text-xs border-t border-[#1E2535]">
                  <span className="text-slate-500 block mb-1">Operational Purpose / Reason:</span>
                  <p className="p-2.5 rounded bg-[#121624] border border-[#1E2535] text-slate-200">
                    {selectedRequest.reason || selectedRequest.comments}
                  </p>
                </div>
              )}

              {/* Reviewer Feedback (Rejection or Changes Requested) */}
              {selectedRequest.rejectionReason && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs">
                  <span className="font-bold text-rose-400 block mb-1">Rejection Reason:</span>
                  <p className="text-rose-200">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              {selectedRequest.changesRequested && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                  <span className="font-bold text-amber-400 block mb-1">Requested Modifications:</span>
                  <p className="text-amber-200">{selectedRequest.changesRequested}</p>
                </div>
              )}
            </div>

            {/* IMMUTABLE APPROVAL TIMELINE / HISTORY (Section 11) */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                Immutable Review & Decision Timeline
              </h5>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-[#232C3E] rounded-lg p-3 bg-[#0E131F]">
                {selectedRequest.history?.map((h: any) => (
                  <div key={h.id} className="text-xs flex items-start gap-3 pb-2 border-b border-[#1E2535]/60 last:border-0 last:pb-0">
                    <span className="font-mono text-[10px] text-slate-500 shrink-0 mt-0.5">
                      {new Date(h.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 font-mono text-[11px]">{h.action}</span>
                        <span className="text-[10px] text-slate-400">
                          by {h.performedBy?.employee?.fullName || h.performedBy?.username || 'System'}
                        </span>
                      </div>
                      {h.comment && <p className="text-slate-300 text-[11px] mt-0.5">{h.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar inside Detail */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1E2535]">
              <div className="flex items-center gap-2">
                {selectedRequest.permissions?.canApprove && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => openActionModal('APPROVE', selectedRequest.id)}
                    >
                      <Check className="w-4 h-4 mr-1.5" /> Approve & Execute
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => openActionModal('REJECT', selectedRequest.id)}
                    >
                      <X className="w-4 h-4 mr-1.5" /> Reject
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => openActionModal('REQUEST_CHANGES', selectedRequest.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" /> Request Changes
                    </Button>
                  </>
                )}

                {selectedRequest.permissions?.canCancel && (
                  <Button
                    variant="outline"
                    onClick={() => openActionModal('CANCEL', selectedRequest.id)}
                  >
                    <Ban className="w-4 h-4 mr-1.5 text-rose-400" /> Cancel Request
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

      {/* ACTION CONFIRMATION MODALS (Section 9 & 10) */}
      <Modal
        isOpen={actionType !== null}
        onClose={() => setActionType(null)}
        title={
          actionType === 'APPROVE'
            ? 'Confirm Request Approval'
            : actionType === 'REJECT'
            ? 'Reject Approval Request'
            : actionType === 'REQUEST_CHANGES'
            ? 'Request Modifications'
            : 'Cancel Request'
        }
        maxWidth="md"
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {actionType === 'APPROVE' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Transaction Execution Confirmation</p>
                  <p className="text-slate-300 mt-1">
                    Approving will immediately and atomically execute this operation. Hardware allocation,
                    location, and immutable asset history will be updated in PostgreSQL.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Approval Notes / Comments (Optional)
                </label>
                <textarea
                  rows={2}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Approved for project deployment..."
                  className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {actionType === 'REJECT' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Request Rejection</p>
                  <p className="text-slate-300 mt-1">
                    The requested operation will NOT execute and the asset will remain in its current state.
                    The requester will be notified.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="State clear justification for rejecting this proposal..."
                  className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>
          )}

          {actionType === 'REQUEST_CHANGES' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Request Proposal Modifications</p>
                  <p className="text-slate-300 mt-1">
                    The request status will become CHANGES_REQUESTED. The requester can adjust the proposal
                    and resubmit.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Required Modifications *
                </label>
                <textarea
                  rows={3}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Specify what needs to be modified (e.g. choose different location or holder)..."
                  className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          )}

          {actionType === 'CANCEL' && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Are you sure you want to cancel this pending approval request?
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cancellation Reason *
                </label>
                <textarea
                  rows={2}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Reason for withdrawing request..."
                  className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2535]">
            <Button type="button" variant="outline" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={actionType === 'APPROVE' ? 'primary' : 'danger'}
              loading={actionSubmitting}
            >
              {actionType === 'APPROVE'
                ? 'Confirm Approval'
                : actionType === 'REJECT'
                ? 'Confirm Rejection'
                : actionType === 'REQUEST_CHANGES'
                ? 'Submit Change Request'
                : 'Confirm Cancellation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
