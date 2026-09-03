import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { DataTable, Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import {
  ManagementKPIs,
  UtilizationData,
  EmployeeAccountabilityItem,
  OverdueReturnItem,
  MaintenanceAnalyticsData,
  WarrantyAnalyticsData,
  AgingBracket,
  AssetHealthItem,
  SavedReport,
} from '../types';
import { exportToExcel, exportReportPDF } from '../utils/exporters';
import {
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  AlertTriangle,
  Clock,
  Wrench,
  ShieldAlert,
  Users,
  Layers,
  Activity,
  BookmarkPlus,
  Trash2,
  ExternalLink,
  Search,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'SUMMARY' | 'RETURNS' | 'ACCOUNTABILITY' | 'MAINTENANCE' | 'WARRANTY' | 'MASTER' | 'SAVED'
  >('SUMMARY');

  // Summary State
  const [kpis, setKpis] = useState<ManagementKPIs | null>(null);
  const [utilization, setUtilization] = useState<UtilizationData | null>(null);
  const [aging, setAging] = useState<AgingBracket[]>([]);
  const [health, setHealth] = useState<{ summary: any; assets: AssetHealthItem[] } | null>(null);

  // Returns State
  const [returnsData, setReturnsData] = useState<{
    overdue: OverdueReturnItem[];
    overdueCount: number;
    upcoming7Count: number;
    upcoming30Count: number;
    upcoming60Count: number;
  } | null>(null);

  // Accountability State
  const [accountability, setAccountability] = useState<EmployeeAccountabilityItem[]>([]);
  const [accountabilitySearch, setAccountabilitySearch] = useState<string>('');

  // Maintenance State
  const [maintenance, setMaintenance] = useState<MaintenanceAnalyticsData | null>(null);

  // Warranty State
  const [warranty, setWarranty] = useState<WarrantyAnalyticsData | null>(null);

  // Master Reports State
  const [masterType, setMasterType] = useState<string>('inventory');
  const [masterData, setMasterData] = useState<any[]>([]);

  // Saved Reports State
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [newReportName, setNewReportName] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);

  // Fetch data depending on active tab
  useEffect(() => {
    const fetchTabData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'SUMMARY') {
          const [kpiRes, utilRes, ageRes, healthRes]: any = await Promise.all([
            api.get('/reports/summary'),
            api.get('/reports/utilization'),
            api.get('/reports/aging'),
            api.get('/reports/health-matrix'),
          ]);
          if (kpiRes?.data) setKpis(kpiRes.data);
          if (utilRes?.data) setUtilization(utilRes.data);
          if (ageRes?.data) setAging(ageRes.data);
          if (healthRes?.data) setHealth(healthRes.data);
        } else if (activeTab === 'RETURNS') {
          const res: any = await api.get('/reports/returns');
          if (res?.data) setReturnsData(res.data);
        } else if (activeTab === 'ACCOUNTABILITY') {
          const params = accountabilitySearch ? `?search=${encodeURIComponent(accountabilitySearch)}` : '';
          const res: any = await api.get(`/reports/employees${params}`);
          if (res?.data?.rows) setAccountability(res.data.rows);
        } else if (activeTab === 'MAINTENANCE') {
          const res: any = await api.get('/reports/maintenance');
          if (res?.data) setMaintenance(res.data);
        } else if (activeTab === 'WARRANTY') {
          const res: any = await api.get('/reports/warranty');
          if (res?.data) setWarranty(res.data);
        } else if (activeTab === 'MASTER') {
          const res: any = await api.get(`/reports/${masterType}`);
          if (res?.data) setMasterData(res.data);
        } else if (activeTab === 'SAVED') {
          const res: any = await api.get('/reports/saved');
          if (res?.data) setSavedReports(res.data);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to fetch report data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchTabData();
  }, [activeTab, masterType]);

  const handleSaveCurrentReport = async () => {
    if (!newReportName.trim()) {
      showToast('Please enter a name for the saved report', 'error');
      return;
    }
    try {
      await api.post('/reports/saved', {
        name: newReportName.trim(),
        reportType: activeTab,
        filters: { activeTab },
      });
      showToast('Report view saved successfully', 'success');
      setNewReportName('');
      if (activeTab === 'SAVED') {
        const res: any = await api.get('/reports/saved');
        if (res?.data) setSavedReports(res.data);
      }
    } catch {
      showToast('Failed to save report', 'error');
    }
  };

  const handleDeleteSavedReport = async (id: string) => {
    try {
      await api.delete(`/reports/saved/${id}`);
      setSavedReports((prev) => prev.filter((r) => r.id !== id));
      showToast('Saved report removed', 'info');
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Reports & Management Analytics"
        subtitle="Comprehensive PostgreSQL-aggregated KPIs, utilization metrics, return liabilities, and cost centers."
        actions={
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newReportName}
              onChange={(e) => setNewReportName(e.target.value)}
              placeholder="Save report view..."
              className="bg-[#181F2C] border border-[#2B3547] rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <Button
              size="sm"
              variant="outline"
              icon={<BookmarkPlus className="w-4 h-4" />}
              onClick={handleSaveCurrentReport}
            >
              Save View
            </Button>
          </div>
        }
      />

      {/* Primary Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#232C38] overflow-x-auto pb-1 text-xs">
        {[
          { id: 'SUMMARY', label: 'Executive Summary', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'RETURNS', label: 'Overdue & Returns', icon: <Clock className="w-4 h-4" /> },
          { id: 'ACCOUNTABILITY', label: 'Employee Accountability', icon: <Users className="w-4 h-4" /> },
          { id: 'MAINTENANCE', label: 'Maintenance & Costs', icon: <Wrench className="w-4 h-4" /> },
          { id: 'WARRANTY', label: 'Warranty & Claims', icon: <ShieldAlert className="w-4 h-4" /> },
          { id: 'MASTER', label: 'Master Exports', icon: <Layers className="w-4 h-4" /> },
          { id: 'SAVED', label: 'Saved Views', icon: <BookmarkPlus className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#141923] text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-[#141923]/40'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400">Aggregating real-time database analytics...</div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE SUMMARY */}
          {activeTab === 'SUMMARY' && kpis && (
            <div className="space-y-6">
              {/* Top 4 Primary KPI Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Fleet Assets</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <h3 className="text-2xl font-bold text-white font-mono">{kpis.totalAssets}</h3>
                    <span className="text-xs text-emerald-400 font-semibold">{kpis.activeAssets} Active</span>
                  </div>
                </Card>

                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asset Utilization</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <h3 className="text-2xl font-bold text-cyan-400 font-mono">
                      {utilization?.overallRate ?? 0}%
                    </h3>
                    <span className="text-xs text-slate-400 font-semibold font-mono">
                      {kpis.allocatedAssets} / {kpis.totalAssets - kpis.retiredAssets}
                    </span>
                  </div>
                </Card>

                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Service & Maintenance</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <h3 className="text-2xl font-bold text-amber-400 font-mono">{kpis.underMaintenance}</h3>
                    <span className="text-xs text-slate-400">Tickets in progress</span>
                  </div>
                </Card>

                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Action Items</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <h3 className="text-2xl font-bold text-rose-400 font-mono">
                      {kpis.overdueReturns + kpis.criticalDataQuality}
                    </h3>
                    <span className="text-xs text-rose-400 font-semibold">
                      {kpis.overdueReturns} Overdue / {kpis.criticalDataQuality} Data Issues
                    </span>
                  </div>
                </Card>
              </div>

              {/* Utilization Breakdown & Asset Aging */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Utilization by Type */}
                <Card className="p-5 bg-[#10141D] border-[#222A38]">
                  <h4 className="text-sm font-bold text-white mb-3">Asset Utilization by Form Factor</h4>
                  <p className="text-xs text-slate-400 mb-4 font-mono">
                    Formula: (Eligible Allocated Active Assets / Eligible Active Assets) * 100
                  </p>
                  <div className="space-y-3">
                    {utilization?.byType.map((u) => (
                      <div key={u.assetType} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-white">{u.assetType}</span>
                          <span className="text-cyan-400 font-mono">
                            {u.utilizationRate}% ({u.allocated}/{u.total})
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#1A2230] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, u.utilizationRate)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Aging Brackets */}
                <Card className="p-5 bg-[#10141D] border-[#222A38]">
                  <h4 className="text-sm font-bold text-white mb-3">Fleet Asset Age Distribution</h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Strictly computed against historical purchase date records.
                  </p>
                  <div className="space-y-3">
                    {aging.map((a) => (
                      <div key={a.bracket} className="flex items-center justify-between p-2.5 rounded-lg bg-[#141923] border border-[#232C38]">
                        <span className="text-xs font-semibold text-slate-300">{a.bracket}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-mono font-bold text-white">{a.count} assets</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({kpis.totalAssets > 0 ? ((a.count / kpis.totalAssets) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Asset Health Matrix */}
              {health && (
                <Card className="p-5 bg-[#10141D] border-[#222A38]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Rule-Based Asset Health Matrix</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Categorized via condition rating, open repair tickets, warranty state, and data quality.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-bold font-mono">
                      <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Healthy: {health.summary.healthy}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Attention: {health.summary.attention}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        High Risk: {health.summary.highRisk}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#222A38] text-slate-400">
                          <th className="py-2 px-3">Asset Code</th>
                          <th className="py-2 px-3">Model / Type</th>
                          <th className="py-2 px-3">Classification</th>
                          <th className="py-2 px-3">Criticality</th>
                          <th className="py-2 px-3">Factors & Detected Vulnerabilities</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1D2536]">
                        {health.assets.slice(0, 15).map((a) => (
                          <tr key={a.id} className="hover:bg-[#141923]">
                            <td className="py-2.5 px-3 font-mono font-bold text-white">{a.assetCode}</td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {a.assetName} <span className="text-slate-500">({a.assetType})</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  a.category === 'HEALTHY'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : a.category === 'ATTENTION'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {a.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{a.criticality}</td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {a.issues.length > 0 ? a.issues.join(' • ') : 'All parameters nominal'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: OVERDUE & RETURNS */}
          {activeTab === 'RETURNS' && returnsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">Overdue Returns</p>
                  <h3 className="text-2xl font-bold text-rose-400 font-mono mt-1">
                    {returnsData.overdueCount}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Immediate action required</p>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Due in 7 Days</p>
                  <h3 className="text-2xl font-bold text-amber-400 font-mono mt-1">
                    {returnsData.upcoming7Count}
                  </h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Due in 30 Days</p>
                  <h3 className="text-2xl font-bold text-white font-mono mt-1">
                    {returnsData.upcoming30Count}
                  </h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Due in 60 Days</p>
                  <h3 className="text-2xl font-bold text-white font-mono mt-1">
                    {returnsData.upcoming60Count}
                  </h3>
                </Card>
              </div>

              <Card className="p-5 bg-[#10141D] border-[#222A38]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Overdue Assets Requiring Recovery</h4>
                    <p className="text-xs text-slate-400">Sorted descending by days overdue.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                    onClick={() => {
                      exportToExcel(
                        returnsData.overdue.map((r) => ({
                          'Assignment Code': r.assignmentCode,
                          'Asset Code': r.assetCode,
                          'Asset Name': r.assetName,
                          'Employee': r.employeeName,
                          'Employee Code': r.employeeCode,
                          'Department': r.department,
                          'Expected Return': new Date(r.expectedReturnDate).toLocaleDateString(),
                          'Days Overdue': r.daysOverdue,
                        })),
                        'Overdue_Returns_Report'
                      );
                    }}
                  >
                    Export Overdue (XLSX)
                  </Button>
                </div>

                {returnsData.overdue.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Zero active assignments are currently overdue. All assets are within their expected schedule.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#222A38] text-slate-400">
                          <th className="py-2 px-3">Days Overdue</th>
                          <th className="py-2 px-3">Asset Code</th>
                          <th className="py-2 px-3">Model</th>
                          <th className="py-2 px-3">Employee</th>
                          <th className="py-2 px-3">Department</th>
                          <th className="py-2 px-3">Expected Return</th>
                          <th className="py-2 px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1D2536]">
                        {returnsData.overdue.map((r) => (
                          <tr key={r.id} className="hover:bg-[#141923]">
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold font-mono">
                                +{r.daysOverdue} days
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-white">{r.assetCode}</td>
                            <td className="py-2.5 px-3 text-slate-300">{r.assetName}</td>
                            <td className="py-2.5 px-3 text-white font-medium">
                              {r.employeeName} <span className="text-slate-500">({r.employeeCode})</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{r.department}</td>
                            <td className="py-2.5 px-3 text-slate-300 font-mono">
                              {new Date(r.expectedReturnDate).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                onClick={() => navigate(`/returns`)}
                                className="px-2 py-1 rounded bg-[#1A2230] text-cyan-400 hover:bg-[#222D40] text-[11px] font-semibold flex items-center space-x-1"
                              >
                                <span>Recover</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: EMPLOYEE ACCOUNTABILITY */}
          {activeTab === 'ACCOUNTABILITY' && (
            <div className="space-y-6">
              <Card className="p-4 bg-[#10141D] border-[#222A38]">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={accountabilitySearch}
                      onChange={(e) => setAccountabilitySearch(e.target.value)}
                      placeholder="Search employee code, name, department..."
                      className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                    onClick={() => {
                      exportToExcel(
                        accountability.map((a) => ({
                          'Employee Code': a.employeeCode,
                          'Full Name': a.fullName,
                          'Email': a.email,
                          'Department': a.department,
                          'Location': a.location,
                          'Status': a.status,
                          'Assets Held': a.assetsHeld,
                          'Active Assignments': a.activeAssignments,
                          'Overdue Assignments': a.overdueAssignments,
                          'Clearance Initiated': a.hasClearance ? 'YES' : 'NO',
                        })),
                        'Employee_Accountability_Report'
                      );
                    }}
                  >
                    Export (XLSX)
                  </Button>
                </div>
              </Card>

              <Card className="p-5 bg-[#10141D] border-[#222A38]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#222A38] text-slate-400">
                        <th className="py-2 px-3">Employee Code</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3">Location</th>
                        <th className="py-2 px-3">Assets Held</th>
                        <th className="py-2 px-3">Active Assignments</th>
                        <th className="py-2 px-3">Overdue</th>
                        <th className="py-2 px-3">Clearance</th>
                        <th className="py-2 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1D2536]">
                      {accountability.map((a) => (
                        <tr key={a.id} className="hover:bg-[#141923]">
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{a.employeeCode}</td>
                          <td className="py-2.5 px-3 font-medium text-white">{a.fullName}</td>
                          <td className="py-2.5 px-3 text-slate-400">{a.department}</td>
                          <td className="py-2.5 px-3 text-slate-400">{a.location}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{a.assetsHeld}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{a.activeAssignments}</td>
                          <td className="py-2.5 px-3">
                            {a.overdueAssignments > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold font-mono">
                                {a.overdueAssignments}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-mono">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {a.hasClearance ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold text-[10px]">
                                Active
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => navigate(`/employees/${a.id}`)}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
                            >
                              <span>Profile</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: MAINTENANCE & COSTS */}
          {activeTab === 'MAINTENANCE' && maintenance && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Tickets</p>
                  <h3 className="text-xl font-bold text-white font-mono mt-1">{maintenance.costs.totalTickets}</h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Total Cost</p>
                  <h3 className="text-xl font-bold text-cyan-400 font-mono mt-1">
                    INR {maintenance.costs.totalCost.toLocaleString('en-IN')}
                  </h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Average / Ticket</p>
                  <h3 className="text-xl font-bold text-white font-mono mt-1">
                    INR {Math.round(maintenance.costs.avgCost).toLocaleString('en-IN')}
                  </h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Labor Cost</p>
                  <h3 className="text-xl font-bold text-white font-mono mt-1">
                    INR {maintenance.costs.laborCost.toLocaleString('en-IN')}
                  </h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Parts Cost</p>
                  <h3 className="text-xl font-bold text-white font-mono mt-1">
                    INR {maintenance.costs.partsCost.toLocaleString('en-IN')}
                  </h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Service Vendor</p>
                  <h3 className="text-xl font-bold text-white font-mono mt-1">
                    INR {maintenance.costs.serviceCost.toLocaleString('en-IN')}
                  </h3>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 bg-[#10141D] border-[#222A38]">
                  <h4 className="text-sm font-bold text-white mb-3">Tickets by Repair Status</h4>
                  <div className="space-y-2.5">
                    {maintenance.byStatus.map((s) => (
                      <div key={s.status} className="flex justify-between items-center p-2 rounded bg-[#141923]">
                        <span className="text-xs font-semibold text-slate-300">{s.status}</span>
                        <span className="text-xs font-bold font-mono text-white">{s.count} tickets</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5 bg-[#10141D] border-[#222A38]">
                  <h4 className="text-sm font-bold text-white mb-3">Tickets by Severity Priority</h4>
                  <div className="space-y-2.5">
                    {maintenance.byPriority.map((p) => (
                      <div key={p.priority} className="flex justify-between items-center p-2 rounded bg-[#141923]">
                        <span className="text-xs font-semibold text-slate-300">{p.priority}</span>
                        <span className="text-xs font-bold font-mono text-white">{p.count} tickets</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: WARRANTY & CLAIMS */}
          {activeTab === 'WARRANTY' && warranty && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Active Warranties</p>
                  <h3 className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                    {warranty.activeWarranties}
                  </h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Expiring 7 Days</p>
                  <h3 className="text-2xl font-bold text-amber-400 font-mono mt-1">{warranty.expiring7Days}</h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Expiring 30 Days</p>
                  <h3 className="text-2xl font-bold text-amber-400 font-mono mt-1">{warranty.expiring30Days}</h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Expiring 90 Days</p>
                  <h3 className="text-2xl font-bold text-white font-mono mt-1">{warranty.expiring90Days}</h3>
                </Card>
                <Card className="p-4 bg-[#10141D] border-[#222A38]">
                  <p className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">Expired Policies</p>
                  <h3 className="text-2xl font-bold text-rose-400 font-mono mt-1">{warranty.expiredWarranties}</h3>
                </Card>
              </div>

              <Card className="p-5 bg-[#10141D] border-[#222A38]">
                <h4 className="text-sm font-bold text-white mb-3">Warranty Claim Coverage Analysis</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-[#141923] border border-[#232C38]">
                    <p className="text-[11px] text-slate-400">Total Claims Filed</p>
                    <p className="text-lg font-bold font-mono text-white mt-1">{warranty.claims.totalClaims}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#141923] border border-[#232C38]">
                    <p className="text-[11px] text-slate-400">Total Claim Value</p>
                    <p className="text-lg font-bold font-mono text-cyan-400 mt-1">
                      INR {warranty.claims.totalClaimCost.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#141923] border border-[#232C38]">
                    <p className="text-[11px] text-emerald-400">Covered by Vendor</p>
                    <p className="text-lg font-bold font-mono text-emerald-400 mt-1">
                      INR {warranty.claims.coveredAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#141923] border border-[#232C38]">
                    <p className="text-[11px] text-rose-400">Out of Pocket Expense</p>
                    <p className="text-lg font-bold font-mono text-rose-400 mt-1">
                      INR {warranty.claims.outOfPocketAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 6: MASTER EXPORTS */}
          {activeTab === 'MASTER' && (
            <div className="space-y-6">
              <Card className="p-4 bg-[#10141D] border-[#222A38]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-semibold text-slate-400">Dataset:</span>
                    <select
                      value={masterType}
                      onChange={(e) => setMasterType(e.target.value)}
                      className="bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="inventory">Full Asset Inventory</option>
                      <option value="assigned">Assigned Assets</option>
                      <option value="available">Available Assets</option>
                      <option value="maintenance">Maintenance Records</option>
                      <option value="transfers">Asset Transfers</option>
                      <option value="returns">Asset Returns</option>
                      <option value="warranty">Warranty Policies</option>
                      <option value="audit">System Audit Logs</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<FileSpreadsheet className="w-4 h-4" />}
                      onClick={() => {
                        exportToExcel(masterData, `FAITH_ITAM_${masterType.toUpperCase()}`);
                        showToast('Excel file exported', 'success');
                      }}
                    >
                      Export XLSX
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Download className="w-4 h-4" />}
                      onClick={() => {
                        const headers = masterData.length ? Object.keys(masterData[0]).filter((k) => k !== 'id') : [];
                        const rows = masterData.map((d) => headers.map((h) => String(d[h] ?? '—')));
                        exportReportPDF(
                          `Master Export: ${masterType.toUpperCase()}`,
                          [{ label: 'Total Rows', value: masterData.length }],
                          headers,
                          rows,
                          `FAITH_ITAM_${masterType.toUpperCase()}`
                        );
                        showToast('PDF Report generated', 'success');
                      }}
                    >
                      Export PDF
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-[#10141D] border-[#222A38]">
                <div className="text-xs text-slate-400 mb-2">
                  Showing sample preview of {masterData.length} total records from PostgreSQL:
                </div>
                <div className="overflow-x-auto max-h-96">
                  {masterData.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#222A38] text-slate-400">
                          {Object.keys(masterData[0])
                            .filter((k) => k !== 'id' && typeof masterData[0][k] !== 'object')
                            .slice(0, 8)
                            .map((k) => (
                              <th key={k} className="py-2 px-3">{k}</th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1D2536]">
                        {masterData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#141923]">
                            {Object.keys(row)
                              .filter((k) => k !== 'id' && typeof row[k] !== 'object')
                              .slice(0, 8)
                              .map((k) => (
                                <td key={k} className="py-2 px-3 text-slate-300 font-mono">
                                  {String(row[k] ?? '—')}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-slate-500">No records found for this dataset.</div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 7: SAVED VIEWS */}
          {activeTab === 'SAVED' && (
            <Card className="p-5 bg-[#10141D] border-[#222A38]">
              <h4 className="text-sm font-bold text-white mb-3">Saved Management Report Views</h4>
              {savedReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No saved report views found. You can save your active report filters using the "Save View" button above.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {savedReports.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-lg bg-[#141923] border border-[#232C38] flex items-center justify-between"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-white">{r.name}</h5>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Target Module: {r.reportType} • Saved on {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab(r.reportType as any)}
                        >
                          Load
                        </Button>
                        <button
                          onClick={() => handleDeleteSavedReport(r.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};
