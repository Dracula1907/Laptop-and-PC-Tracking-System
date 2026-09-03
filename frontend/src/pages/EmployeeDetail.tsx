import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import api from '../services/api';
import { Employee } from '../types';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Laptop,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRightLeft,
  RotateCcw,
  Calendar,
  ExternalLink,
  Users,
  UserX,
} from 'lucide-react';


export const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'assets' | 'history' | 'team'>('assets');

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const res: any = await api.get(`/employees/${id}`);
        if (res.success) setEmployee(res.data);
      } catch (err) {
        console.error('Employee fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (loading || !employee) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-3" />
        <p className="text-slate-400 text-xs font-mono">Loading Employee Profile & Asset Accountability...</p>
      </div>
    );
  }

  const accountability = employee.accountability || {
    currentlyAssignedAssetsCount: employee.heldAssets?.length || 0,
    totalHistoricalAssets: employee.heldAssets?.length || 0,
    activeAssignmentsCount: employee.assignments?.filter((a: any) => a.status === 'ACTIVE').length || 0,
    overdueReturnsCount: 0,
    transferCount: 0,
  };

  const calculateTenure = () => {
    if (!employee.joiningDate) return '—';
    const start = new Date(employee.joiningDate);
    const end = employee.exitDate ? new Date(employee.exitDate) : new Date();
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diffMonths < 1) return 'Less than 1 month';
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    if (years === 0) return `${months} month${months > 1 ? 's' : ''}`;
    return `${years} yr${years > 1 ? 's' : ''} ${months ? `${months} mo` : ''}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${employee.fullName} (${employee.employeeCode})`}
        subtitle={`${employee.designation || 'Staff'} — ${employee.department?.name || 'Department'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/employees')}
            >
              Back to Directory
            </Button>
            <Button
              variant="primary"
              icon={<UserX className="w-4 h-4" />}
              onClick={() => navigate('/clearance')}
            >
              Initiate Exit Clearance
            </Button>
          </div>
        }
      />



      {/* 3-Card Summary Overview (Section 10) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Employee Profile */}
        <Card title="Employee Profile" subtitle="Identity & Organizational Position">
          <div className="space-y-3 text-xs pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Employee ID</span>
              <span className="font-mono font-bold text-indigo-400 text-sm">{employee.employeeCode}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Full Name</span>
              <span className="font-semibold text-white">{employee.fullName}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Corporate Email</span>
              <span className="font-mono text-slate-300">{employee.email}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Contact Phone</span>
              <span className="font-mono text-slate-300">{employee.phone || '—'}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Designation</span>
              <span className="text-white font-medium">{employee.designation || 'Staff'}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Department / Area</span>
              <span className="text-white font-medium">{employee.department?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Facility Location</span>
              <span className="text-white font-medium">{employee.location?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Reporting Manager</span>
              <span className="text-slate-300">
                {employee.manager ? `${employee.manager.fullName} (${employee.manager.employeeCode})` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">Employment Status</span>
              <StatusBadge status={employee.status} type="employee" />
            </div>
          </div>
        </Card>

        {/* Card 2: Employment Milestones & Quality */}
        <Card title="Employment & Governance" subtitle="Tenure, Quality & Audit Status">
          <div className="space-y-3 text-xs pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Joining Date</span>
              <span className="font-mono text-white">
                {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-GB') : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Exit Date</span>
              <span className="font-mono text-white">
                {employee.exitDate ? new Date(employee.exitDate).toLocaleDateString('en-GB') : 'Active (N/A)'}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Organizational Tenure</span>
              <span className="font-semibold text-emerald-400">{calculateTenure()}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">Master Data Quality</span>
              {employee.dataQuality === 'CLEAN' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Clean Record
                </span>
              ) : employee.dataQuality === 'WARNING' ? (
                <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" /> Warning (Partial Info)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                  <XCircle className="w-3 h-3" /> Incomplete Data
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2535]">
              <span className="text-slate-400">System User Account</span>
              <span className="font-mono text-slate-300">
                {employee.user ? `${employee.user.username} (${employee.user.role?.name || 'User'})` : 'No User Account'}
              </span>
            </div>
            {employee.remarks && (
              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Administrative Remarks:</span>
                <p className="p-2 bg-[#121624] rounded border border-[#1E2535] text-slate-300 text-[11px] leading-relaxed">
                  {employee.remarks}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Card 3: Asset Accountability (Section 10) */}
        <Card title="Asset Accountability" subtitle="Real-time PostgreSQL Custody Metrics">
          <div className="space-y-3 pt-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[11px] text-slate-400 font-mono uppercase block">Active Devices</span>
                <p className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                  {accountability.currentlyAssignedAssetsCount}
                </p>
                <span className="text-[10px] text-slate-500">Currently in possession</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[11px] text-slate-400 font-mono uppercase block">Total Lifetime</span>
                <p className="text-2xl font-bold font-mono text-white mt-1">
                  {accountability.totalHistoricalAssets}
                </p>
                <span className="text-[10px] text-slate-500">Unique assets handled</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1E2535]">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1E2535]/60">
                <span className="text-slate-400">Active Handover Assignments</span>
                <span className="font-mono font-semibold text-white">{accountability.activeAssignmentsCount}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1E2535]/60">
                <span className="text-slate-400">Overdue Returns</span>
                <span
                  className={`font-mono font-bold ${
                    accountability.overdueReturnsCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {accountability.overdueReturnsCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Movements / Transfers</span>
                <span className="font-mono font-semibold text-white">{accountability.transferCount}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#1E2535] flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('assets')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'assets'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Laptop className="w-4 h-4" />
          Currently Assigned Assets ({employee.heldAssets?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Custody & Assignment History ({(employee.assignments?.length || 0) + (employee.returns?.length || 0)})
        </button>
        {employee.subordinates && employee.subordinates.length > 0 && (
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'team'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Direct Reports ({employee.subordinates.length})
          </button>
        )}
      </div>

      {/* Tab 1: Currently Assigned Assets Table (Section 11) */}
      {activeTab === 'assets' && (
        <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#1E2535] flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Active Assigned Equipment</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Hardware devices currently in this employee's custody. Click any asset to inspect complete lifecycle details.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
              {employee.heldAssets?.length || 0} Assets Allocated
            </span>
          </div>

          <div className="overflow-x-auto min-w-[1250px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1E2535] bg-[#0A0D15]/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <th className="py-3 px-3.5">Asset ID</th>
                  <th className="py-3 px-3.5">Asset Name / Model</th>
                  <th className="py-3 px-3.5">Type</th>
                  <th className="py-3 px-3.5">Allocation Date</th>
                  <th className="py-3 px-3.5">Location</th>
                  <th className="py-3 px-3.5">Department</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Condition</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2535]/50">
                {!employee.heldAssets || employee.heldAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-slate-500 font-medium">
                      No active hardware currently assigned to this employee.
                    </td>
                  </tr>
                ) : (
                  employee.heldAssets.map((asset: any) => (
                    <tr
                      key={asset.id}
                      onClick={() => navigate(`/assets/${asset.id}`)}
                      className="hover:bg-[#141A28] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-indigo-400">
                        {asset.companyAssetId || asset.assetCode}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-200 group-hover:text-white">
                        {asset.model || asset.assetName}
                        {asset.manufacturer && (
                          <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                            ({asset.manufacturer})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300 font-medium">{asset.assetType}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-400 text-[11px]">
                        {asset.dateOfAllocation ? new Date(asset.dateOfAllocation).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {asset.locationRel?.name || asset.location || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {asset.department?.name || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <StatusBadge status={asset.status} type="assetStatus" />
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <StatusBadge status={asset.condition} type="condition" />
                      </td>
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/assets/${asset.id}`)}
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30"
                        >
                          Details <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Assignment & Return History */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Assignments */}
          <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-4 shadow-sm">
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-400" />
              Handover Assignment History
            </h4>
            <p className="text-xs text-slate-400 mb-4">Chronological record of assignments issued to this employee.</p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {!employee.assignments || employee.assignments.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">No assignments recorded.</p>
              ) : (
                employee.assignments.map((asg: any) => (
                  <div
                    key={asg.id}
                    onClick={() => asg.asset?.id && navigate(`/assets/${asg.asset.id}`)}
                    className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E] hover:border-indigo-500/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400 text-xs">
                        {asg.asset?.companyAssetId || asg.asset?.assetCode || asg.assignmentCode}
                      </span>
                      <StatusBadge status={asg.status} type="workflow" />
                    </div>
                    <p className="text-xs font-semibold text-slate-200 mt-1">
                      {asg.asset?.manufacturer} {asg.asset?.model}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{asg.reason || asg.remarks || 'Standard assignment'}</p>
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#1E2535] text-[10px] text-slate-500 font-mono">
                      <span>Assigned: {new Date(asg.assignedAt).toLocaleDateString('en-GB')}</span>
                      <span>By: {asg.assignedBy?.username || 'IT Admin'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Returns */}
          <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-4 shadow-sm">
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              Asset Recovery & Return Records
            </h4>
            <p className="text-xs text-slate-400 mb-4">Verified returns and recoveries processed from this employee.</p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {!employee.returns || employee.returns.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">No returns recorded.</p>
              ) : (
                employee.returns.map((ret: any) => (
                  <div
                    key={ret.id}
                    onClick={() => ret.asset?.id && navigate(`/assets/${ret.asset.id}`)}
                    className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E] hover:border-emerald-500/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400 text-xs">
                        {ret.asset?.companyAssetId || ret.asset?.assetCode || ret.returnCode}
                      </span>
                      <StatusBadge status={ret.status || 'COMPLETED'} type="workflow" />
                    </div>
                    <p className="text-xs font-semibold text-slate-200 mt-1">
                      {ret.asset?.manufacturer} {ret.asset?.model}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{ret.reason || ret.remarks || 'Returned to stock'}</p>
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#1E2535] text-[10px] text-slate-500 font-mono">
                      <span>Returned: {ret.returnDate ? new Date(ret.returnDate).toLocaleDateString('en-GB') : '—'}</span>
                      <span>Received By: {ret.receivedBy?.username || 'IT Admin'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Direct Reports */}
      {activeTab === 'team' && employee.subordinates && (
        <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Reporting Team Members
          </h4>
          <p className="text-xs text-slate-400 mb-4">Direct subordinates reporting to this manager.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {employee.subordinates.map((sub: any) => (
              <div
                key={sub.id}
                onClick={() => navigate(`/employees/${sub.id}`)}
                className="p-3.5 rounded-lg bg-[#141A28] border border-[#232C3E] hover:border-indigo-500 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-400 text-xs">{sub.employeeCode}</span>
                  <StatusBadge status={sub.status} type="employee" />
                </div>
                <h5 className="font-semibold text-white text-xs mt-1">{sub.fullName}</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">{sub.designation || 'Staff'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
