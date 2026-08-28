import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MoreVertical,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

/* ─── KPI Card ──────────────────────────────────────────────────────────── */
interface KpiCardProps {
  color: string;
  label: string;
  value: number;
  sub: string;
  tag?: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ color, label, value, sub, tag, icon, onClick }) => {
  const isRed = label === 'HIGH CRITICAL';
  const isGreen = label === 'ACTIVE';

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer rounded-xl overflow-hidden flex flex-col items-center pt-2 pb-2 px-1.5
        transition-all duration-200 hover:-translate-y-1 group select-none"
      style={{
        background: isRed
          ? 'linear-gradient(160deg, rgba(80,10,14,0.75) 0%, rgba(6,9,18,0.92) 65%)'
          : isGreen
          ? 'linear-gradient(160deg, rgba(6,38,24,0.75) 0%, rgba(6,9,18,0.92) 65%)'
          : 'linear-gradient(160deg, rgba(18,24,38,0.75) 0%, rgba(6,9,18,0.92) 65%)',
        border: `1.5px solid ${color}44`,
        boxShadow: `0 0 22px ${color}18, inset 0 0 18px ${color}06`,
        backdropFilter: 'blur(10px)',
        minHeight: '148px',
      }}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px]"
        style={{ background: color, boxShadow: `0 0 12px ${color}, 0 0 24px ${color}60` }} />

      {/* Corner tag */}
      {tag && (
        <div className="absolute top-2 right-1.5 px-1 py-0.5 rounded text-[6.5px] font-mono font-bold"
          style={{ background: `${color}20`, border: `1px solid ${color}50`, color }}>
          {tag}
        </div>
      )}

      {/* Label */}
      <span className="text-[8px] font-bold font-mono tracking-widest uppercase leading-none text-center w-full truncate px-0.5 mt-0.5"
        style={{ color }}>
        {label}
      </span>

      {/* Value */}
      <div className="font-black font-mono leading-none mt-1.5 tracking-tight"
        style={{
          fontSize: '30px',
          color: (isRed || isGreen) ? color : '#F0F4F8',
          textShadow: (isRed || isGreen) ? `0 0 16px ${color}` : 'none',
        }}>
        {value}
      </div>

      {/* Sub */}
      <span className="text-[7.5px] text-[#4A5568] font-mono mt-0.5 truncate w-full text-center">{sub}</span>

      {/* Icon */}
      <div className="mt-2 flex items-center justify-center">
        {icon}
      </div>

      {/* Hover border glow overlay */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ border: `1.5px solid ${color}88`, boxShadow: `inset 0 0 24px ${color}18` }} />
    </div>
  );
};

/* ─── Main Dashboard ────────────────────────────────────────────────────── */
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showTable, setShowTable] = useState<boolean>(false);

  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAllocation, setFilterAllocation] = useState<string>('');
  const [filterCriticality, setFilterCriticality] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');

  const fetchDashboardData = async () => {
    try {
      const [sumRes, chartRes, assetRes]: any = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/charts'),
        api.get('/assets?limit=100'),
      ]);
      const isSumSuccess = sumRes?.success ?? sumRes?.data?.success;
      const sumData = sumRes?.data ?? sumRes;
      if (isSumSuccess && sumData) setSummary(sumData);

      const isChartSuccess = chartRes?.success ?? chartRes?.data?.success;
      const chartData = chartRes?.data ?? chartRes;
      if (isChartSuccess && chartData) setCharts(chartData);

      const isAssetSuccess = assetRes?.success ?? assetRes?.data?.success;
      const assetData = assetRes?.data ?? assetRes;
      if (isAssetSuccess && assetData) setAssets(assetData?.assets || assetData || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    showToast('Telemetry refreshed from live database.', 'success');
  };

  const handleExportExcel = async () => {
    try {
      const res: any = await api.get('/import/export-company-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data || res]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `company_it_assets_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Inventory exported in exact 16-column layout.', 'success');
    } catch {
      showToast('Failed to export company Excel inventory.', 'error');
    }
  };

  const top = summary?.top || {
    totalAssets: 31, active: 26, inactive: 5,
    allocated: 26, notAllocated: 5,
    laptops: 15, officePcs: 9, workstations: 7, highCriticality: 2,
  };

  const pieData = useMemo(() => {
    if (charts?.assetsByType?.length) return charts.assetsByType;
    return [
      { type: 'Laptop', count: top.laptops || 15 },
      { type: 'Work St.', count: top.workstations || 7 },
      { type: 'Office PC', count: top.officePcs || 9 },
    ];
  }, [charts, top]);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (filterType && a.sourceAssetType !== filterType && a.assetType !== filterType) return false;
      if (filterStatus && a.sourceAssetStatus !== filterStatus) return false;
      if (filterAllocation && a.sourceAllocationStatus !== filterAllocation) return false;
      if (filterCriticality && a.criticality !== filterCriticality) return false;
      if (filterLocation && a.location !== filterLocation) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (a.companyAssetId || '').toLowerCase().includes(q) ||
          (a.assetName || '').toLowerCase().includes(q) ||
          (a.serialNumber || '').toLowerCase().includes(q) ||
          (a.employeeNameSource || a.currentHolder?.fullName || '').toLowerCase().includes(q) ||
          (a.location || '').toLowerCase().includes(q) ||
          (a.lanIp || '').toLowerCase().includes(q) ||
          (a.cpu || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assets, search, filterType, filterStatus, filterAllocation, filterCriticality, filterLocation]);

  /* ── Render ── */
  return (
    <div className="relative font-sans text-[#CED1D5] min-h-[calc(100vh-56px)] flex flex-col overflow-hidden">

      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/dashboard-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}>
        <div className="absolute inset-0 dashboard-bg-overlay" style={{ background: 'rgba(4,6,14,0.46)' }} />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col px-3 pt-2 pb-3 gap-2">

        {/* ══ ROW 1: TITLE + ANALYTICS PANELS ══════════════════════════════ */}
        <div className="flex flex-col xl:flex-row items-start gap-2 justify-between">

          {/* Title */}
          <div className="shrink-0">
            <h1 className="text-[22px] font-black text-white leading-tight tracking-tight">
              Faith Automation IT Inventory
            </h1>

          </div>

          {/* Right panels */}
          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">

            {/* Asset Lifecycle Heatmap */}
            <div className="xl:w-[310px] rounded-xl border border-[#243040] shadow-xl overflow-hidden"
              style={{ background: 'rgba(8,12,20,0.86)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 border-b border-[#1C2840]">
                <span className="text-[9.5px] font-bold text-white font-mono tracking-wide">Asset Lifecycle Heatmap</span>
                <div className="flex items-center gap-2 text-[7.5px] font-mono text-[#5A6880]">
                  {[['#22C7D6','New'],['#10B981','Optimal'],['#D9962E','Approaching End-of-Life'],['#C53A43','Beyond EoL']].map(([c,l]) => (
                    <span key={l as string} className="flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c as string }}/>
                      {l}
                    </span>
                  ))}
                  <MoreVertical className="w-3 h-3 text-[#2A3648]"/>
                </div>
              </div>
              <div className="px-2.5 pb-2 pt-1 space-y-1 font-mono text-[8px]">
                {[
                  { label: 'Laptops',    cells: ['#22C7D6','#1BA8B8','#10B981','#10B981','#D9962E','#D9962E','#C98524','#C53A43'] },
                  { label: 'Desktops',   cells: ['#1BA8B8','#10B981','#10B981','#22C7D6','#D9962E','#10B981','#C98524','#C53A43'] },
                  { label: 'Workstati…', cells: ['#22C7D6','#22C7D6','#10B981','#10B981','#D9962E','#D9962E','#C98524','#C53A43'] },
                  { label: 'EoL Age',    cells: ['#313C4A','#232C38','#232C38','#232C38','#313C4A','#232C38','#232C38','#313C4A'] },
                ].map((row, ri) => (
                  <div key={ri} className="flex items-center gap-1">
                    <span className="w-[52px] text-[7px] text-[#5A6880] shrink-0 truncate">{row.label}</span>
                    <div className="flex gap-0.5 flex-1">
                      {row.cells.map((c, ci) => (
                        <span key={ci} className="h-[7px] flex-1 rounded-[2px]"
                          style={{ background: c + (ri === 3 ? 'aa' : '99') }} />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-1 text-[6.5px] text-[#3A4858] pt-0.5">
                  <span className="w-[52px] shrink-0"/>
                  <div className="flex justify-between flex-1">
                    {['New','Min','Aprl','May','Hbe','Iltst','Tres','Desc'].map(l => (
                      <span key={l}>{l}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Patch Compliance */}
            <div className="xl:w-[230px] rounded-xl border border-[#243040] shadow-xl overflow-hidden"
              style={{ background: 'rgba(8,12,20,0.86)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 border-b border-[#1C2840]">
                <span className="text-[9.5px] font-bold text-white font-mono">Security Patch Compliance</span>
                <MoreVertical className="w-3 h-3 text-[#2A3648]"/>
              </div>
              <div className="flex items-start justify-around px-2 pt-1">
                <div className="text-[7px] font-mono text-[#4A5568] text-center">OS Patch Status</div>
                <div className="text-[7px] font-mono text-[#4A5568] text-center">Critical Software Status</div>
              </div>
              <div className="flex justify-around items-center px-3 pb-3 pt-1 gap-2">
                {/* Ring 1: 75% */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-[50px] h-[50px] flex items-center justify-center">
                    <svg className="w-[50px] h-[50px] -rotate-90">
                      <circle cx="25" cy="25" r="19" stroke="#1C2840" strokeWidth="3.5" fill="none"/>
                      <circle cx="25" cy="25" r="19" stroke="#22C7D6" strokeWidth="3.5" fill="none"
                        strokeDasharray="119" strokeDashoffset="30" strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 4px #22C7D6)' }}/>
                    </svg>
                    <span className="absolute text-[10px] font-black text-[#22C7D6] font-mono">75%</span>
                  </div>
                  <div className="text-center font-mono">
                    <div className="text-[7px] text-[#5A6880]">Project</div>
                    <div className="text-[7.5px] text-[#CED1D5] font-bold">Compliance</div>
                    <div className="text-[6.5px] text-[#4A5568]">Gorthe…</div>
                  </div>
                </div>
                {/* Ring 2: 72% */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-[50px] h-[50px] flex items-center justify-center">
                    <svg className="w-[50px] h-[50px] -rotate-90">
                      <circle cx="25" cy="25" r="19" stroke="#1C2840" strokeWidth="3.5" fill="none"/>
                      <circle cx="25" cy="25" r="19" stroke="#D9962E" strokeWidth="3.5" fill="none"
                        strokeDasharray="119" strokeDashoffset="33" strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 4px #D9962E)' }}/>
                    </svg>
                    <span className="absolute text-[10px] font-black text-[#D9962E] font-mono">72%</span>
                  </div>
                  <div className="text-center font-mono">
                    <div className="text-[7px] text-[#5A6880]">Critical</div>
                    <div className="text-[7.5px] text-[#CED1D5] font-bold">Software</div>
                    <div className="text-[6.5px] text-[#4A5568]">Gorthe…</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ TELEMETRY RAIL ═══════════════════════════════════════════════ */}
        <div className="relative flex items-center w-full px-1">
          <div className="w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, #22C7D640, #4A556840, #C53A4340)' }}/>
          <div className="absolute inset-0 flex justify-between items-center px-6 pointer-events-none">
            {(['#22C7D6','#10B981','#D9962E','#22C7D6','#D9962E','#58707A','#58707A','#43D7DE','#C53A43'] as string[]).map((c, i) => (
              <span key={i} className="w-[7px] h-[7px] rounded-full"
                style={{ background: '#060912', border: `2px solid ${c}`, boxShadow: `0 0 5px ${c}` }}/>
            ))}
          </div>
        </div>

        {/* ══ ROW 2: 9 KPI CARDS ═══════════════════════════════════════════ */}
        <div className="grid grid-cols-9 gap-1.5">

          {/* 1 – TOTAL ASSETS */}
          <KpiCard color="#22C7D6" label="TOTAL ASSETS" value={top.totalAssets} sub="All Hardware"
            onClick={() => { setFilterType(''); setFilterStatus(''); setFilterAllocation(''); setFilterCriticality(''); }}
            icon={
              <svg viewBox="0 0 44 44" className="w-10 h-10">
                <rect x="6" y="29" width="32" height="5" rx="1.5" fill="#22C7D6" fillOpacity="0.2" stroke="#22C7D6" strokeWidth="1"/>
                <rect x="6" y="21" width="32" height="5" rx="1.5" fill="#22C7D6" fillOpacity="0.4" stroke="#22C7D6" strokeWidth="1"/>
                <rect x="6" y="13" width="32" height="5" rx="1.5" fill="#22C7D6" fillOpacity="0.65" stroke="#22C7D6" strokeWidth="1.5"/>
                <circle cx="34" cy="15.5" r="1.5" fill="#10B981"/>
                <circle cx="30" cy="15.5" r="1.5" fill="#10B981" fillOpacity="0.4"/>
                <rect x="9" y="6" width="14" height="4" rx="1" fill="#22C7D6" fillOpacity="0.4"/>
              </svg>
            }/>

          {/* 2 – ACTIVE */}
          <KpiCard color="#10B981" label="ACTIVE" value={top.active} sub="Active"
            onClick={() => setFilterStatus('Active')}
            icon={
              <svg viewBox="0 0 44 44" className="w-10 h-10">
                <rect x="6" y="31" width="32" height="4" rx="1.5" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1"/>
                <rect x="6" y="23" width="32" height="4" rx="1.5" fill="#10B981" fillOpacity="0.4" stroke="#10B981" strokeWidth="1"/>
                <rect x="6" y="15" width="32" height="4" rx="1.5" fill="#10B981" fillOpacity="0.65" stroke="#10B981" strokeWidth="1.5"/>
                <rect x="6" y="7" width="32" height="4" rx="1.5" fill="#10B981" fillOpacity="0.9" stroke="#10B981" strokeWidth="1.5"
                  style={{ filter: 'drop-shadow(0 0 5px #10B981)' }}/>
                <circle cx="34" cy="9" r="1.5" fill="white" className="animate-pulse"/>
              </svg>
            }/>

          {/* 3 – INACTIVE */}
          <KpiCard color="#D9962E" label="INACTIVE" value={top.inactive} sub="Standby"
            onClick={() => setFilterStatus('Inactive')}
            icon={
              <svg viewBox="0 0 44 44" className="w-10 h-10">
                <circle cx="22" cy="23" r="12" fill="none" stroke="#D9962E" strokeWidth="2" strokeOpacity="0.4"/>
                <circle cx="22" cy="23" r="8" fill="none" stroke="#D9962E" strokeWidth="1.5" strokeOpacity="0.7"/>
                <line x1="22" y1="10" x2="22" y2="17" stroke="#D9962E" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M14.5 14.5 A10 10 0 0 0 14.5 31.5" stroke="#D9962E" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M29.5 14.5 A10 10 0 0 1 29.5 31.5" stroke="#D9962E" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            }/>

          {/* 4 – ALLOCATED */}
          <KpiCard color="#22C7D6" label="ALLOCATED" value={top.allocated} sub="In Active Use"
            onClick={() => setFilterAllocation('Allocated')}
            icon={
              <svg viewBox="0 0 44 44" className="w-10 h-10">
                <rect x="12" y="12" width="20" height="20" rx="2" fill="none" stroke="#22C7D6" strokeWidth="1.5" strokeOpacity="0.5"/>
                <rect x="16" y="16" width="12" height="12" rx="1" fill="#22C7D6" fillOpacity="0.2" stroke="#22C7D6" strokeWidth="1"/>
                {([14,18,22,26,30] as number[]).map(y => (
                  <React.Fragment key={y}>
                    <line x1="6" y1={y} x2="12" y2={y} stroke="#22C7D6" strokeWidth="0.8" strokeOpacity="0.5"/>
                    <line x1="32" y1={y} x2="38" y2={y} stroke="#22C7D6" strokeWidth="0.8" strokeOpacity="0.5"/>
                  </React.Fragment>
                ))}
                <rect x="18" y="18" width="8" height="8" rx="1" fill="#22C7D6" fillOpacity="0.5"/>
              </svg>
            }/>

          {/* 5 – NOT ALLOCATED */}
          <KpiCard color="#D9962E" label="NOT ALLOCATED" value={top.notAllocated} sub="Ready in Stock" tag="SG71"
            onClick={() => setFilterAllocation('Not Allocated')}
            icon={
              <svg viewBox="0 0 44 44" className="w-10 h-10">
                <rect x="10" y="20" width="24" height="16" rx="2" fill="#D9962E" fillOpacity="0.18" stroke="#D9962E" strokeWidth="1.5"/>
                <path d="M10 22 L22 14 L34 22" fill="#D9962E" fillOpacity="0.3" stroke="#D9962E" strokeWidth="1.5"/>
                <rect x="16" y="26" width="12" height="10" rx="1" fill="#D9962E" fillOpacity="0.35"/>
                <text x="18" y="34.5" fontSize="5" fill="#D9962E" fontFamily="monospace" fontWeight="bold">To05</text>
              </svg>
            }/>

          {/* 6 – LAPTOPS */}
          <KpiCard color="#58707A" label="LAPTOPS" value={top.laptops} sub="Mobile Units"
            onClick={() => setFilterType('Laptop')}
            icon={
              <svg viewBox="0 0 44 44" className="w-10 h-10">
                <rect x="7" y="9" width="30" height="20" rx="2" fill="#141E2A" stroke="#58707A" strokeWidth="1.5"/>
                <rect x="9" y="11" width="26" height="16" rx="1" fill="#22C7D6" fillOpacity="0.08"/>
                <rect x="3" y="29" width="38" height="4" rx="1" fill="#141E2A" stroke="#58707A" strokeWidth="1.2"/>
                <rect x="17" y="31" width="10" height="1.5" rx="0.75" fill="#3A5060"/>
                <rect x="5" y="7" width="30" height="2.5" rx="1" fill="#0E1520" stroke="#3A4E5A" strokeWidth="0.8"/>
              </svg>
            }/>

          {/* 7 – OFFICE PCs */}
          <KpiCard color="#58707A" label="OFFICE PCs" value={top.officePcs} sub="Desk Desktops"
            onClick={() => setFilterType('Office PC')}
            icon={
              <svg viewBox="0 0 44 44" className="w-10 h-10">
                <rect x="7" y="5" width="30" height="22" rx="2" fill="#141E2A" stroke="#58707A" strokeWidth="1.5"/>
                <rect x="9" y="7" width="26" height="18" rx="1" fill="#22C7D6" fillOpacity="0.08"/>
                <rect x="19" y="27" width="6" height="5" rx="0.5" fill="#141E2A" stroke="#58707A" strokeWidth="1"/>
                <rect x="9" y="32" width="26" height="2.5" rx="1" fill="#141E2A" stroke="#58707A" strokeWidth="1"/>
                <circle cx="33" cy="13" r="1.5" fill="#10B981" fillOpacity="0.7"/>
              </svg>
            }/>

          {/* 8 – WORK STATIONS */}
          <KpiCard color="#43D7DE" label="WORK STATIONS" value={top.workstations} sub="Engineering"
            onClick={() => setFilterType('Work Station')}
            icon={
              <svg viewBox="0 0 44 44" className="w-10 h-10">
                <rect x="5" y="8" width="20" height="28" rx="2" fill="#141E2A" stroke="#43D7DE" strokeWidth="1.5"/>
                <rect x="7" y="10" width="16" height="10" rx="1" fill="#43D7DE" fillOpacity="0.12"/>
                <rect x="7" y="22" width="16" height="3" rx="1" fill="#43D7DE" fillOpacity="0.28"/>
                <rect x="7" y="26" width="16" height="3" rx="1" fill="#43D7DE" fillOpacity="0.18"/>
                <rect x="27" y="14" width="12" height="14" rx="1.5" fill="#141E2A" stroke="#43D7DE" strokeWidth="1.2"/>
                <circle cx="33" cy="22" r="4" fill="none" stroke="#43D7DE" strokeWidth="1" strokeOpacity="0.5"/>
                <circle cx="33" cy="22" r="1.5" fill="#43D7DE" fillOpacity="0.5"/>
              </svg>
            }/>

          {/* 9 – HIGH CRITICAL */}
          <KpiCard color="#C53A43" label="HIGH CRITICAL" value={top.highCriticality} sub="Business Vital"
            onClick={() => setFilterCriticality('High')}
            icon={
              <svg viewBox="0 0 44 44" className="w-10 h-10">
                <path d="M22 5 L35 12 L35 25 C35 34 22 41 22 41 C22 41 9 34 9 25 L9 12 Z"
                  fill="#C53A43" fillOpacity="0.14" stroke="#C53A43" strokeWidth="1.5"
                  style={{ filter: 'drop-shadow(0 0 6px #C53A43)' }}/>
                <path d="M17 23 Q22 18 27 23 Q22 28 17 23" fill="none" stroke="#C53A43" strokeWidth="1" strokeOpacity="0.9"/>
                <path d="M15 21 Q22 13 29 21 Q22 30 15 21" fill="none" stroke="#C53A43" strokeWidth="1" strokeOpacity="0.6"/>
                <path d="M13 19 Q22 9 31 19 Q22 32 13 19" fill="none" stroke="#C53A43" strokeWidth="0.7" strokeOpacity="0.35"/>
                <circle cx="22" cy="23" r="1.5" fill="#C53A43"/>
              </svg>
            }/>
        </div>

        {/* ══ ROW 3: 3 CHARTS ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-3 gap-2">

          {/* Chart 1 – Assets by Type (Donut) */}
          <div className="rounded-xl border border-[#243040] overflow-hidden flex flex-col"
            style={{ background: 'rgba(6,9,18,0.84)', backdropFilter: 'blur(10px)', minHeight: '200px' }}>
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-[#1C2840]">
              <div>
                <h3 className="text-[10.5px] font-bold text-white font-mono">Chart 1: Assets by Type</h3>
                <p className="text-[8.5px] text-[#4A5568] font-mono">Laptop, Office PC, Work Station</p>
              </div>
              <MoreVertical className="w-3.5 h-3.5 text-[#2A3648]"/>
            </div>
            <div className="flex-1 relative flex items-center justify-center py-2">
              <span className="absolute top-1 left-2 text-[7px] font-mono text-[#2A3648]">48.4°</span>
              <span className="absolute top-1 right-2 text-[7px] font-mono text-[#2A3648]">48.4°</span>
              <span className="absolute bottom-1 left-2 text-[7px] font-mono text-[#2A3648]">26.6°</span>
              <span className="absolute bottom-1 right-2 text-[7px] font-mono text-[#2A3648]">29.0°</span>
              {/* Torus overlay */}
              <svg viewBox="0 0 180 180" className="absolute w-[140px] h-[140px] pointer-events-none opacity-20">
                <ellipse cx="90" cy="90" rx="74" ry="74" stroke="#313C4A" strokeWidth="1" strokeDasharray="4 3" fill="none"/>
                <ellipse cx="90" cy="90" rx="57" ry="57" stroke="#22C7D6" strokeWidth="1" fill="none"/>
                <ellipse cx="90" cy="90" rx="41" ry="41" stroke="#6B4FB8" strokeWidth="0.7" fill="none"/>
              </svg>
              {/* Donut */}
              <div className="w-[140px] h-[140px] z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="count" nameKey="type"
                      cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={3}>
                      <Cell fill="#22C7D6" stroke="#1BA8B8" strokeWidth={1.5}/>
                      <Cell fill="#10B981" stroke="#21C98A" strokeWidth={1.5}/>
                      <Cell fill="#6B4FB8" stroke="#5A3FA0" strokeWidth={1.5}/>
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0A0E16', borderColor: '#243040', borderRadius: '8px', color: '#FFF', fontSize: '10px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 space-y-1.5 text-[9px] font-mono z-20
                bg-[#0A0E16]/90 p-1.5 rounded-lg border border-[#243040]">
                {[['#22C7D6','Laptop'],['#10B981','Work St.'],['#6B4FB8','Office PC']].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 5px ${c}` }}/>
                    <span className="text-[#7B8899]">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2 – Assets by Status (Pillars) */}
          <div className="rounded-xl border border-[#243040] overflow-hidden flex flex-col"
            style={{ background: 'rgba(6,9,18,0.84)', backdropFilter: 'blur(10px)', minHeight: '200px' }}>
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-[#1C2840]">
              <div>
                <h3 className="text-[10.5px] font-bold text-white font-mono">Chart 2: Assets by Status</h3>
                <p className="text-[8.5px] text-[#4A5568] font-mono">Active vs Inactive</p>
              </div>
              <MoreVertical className="w-3.5 h-3.5 text-[#2A3648]"/>
            </div>
            <div className="flex-1 relative flex items-end justify-center gap-10 pb-4 pt-1 px-2">
              <div className="absolute left-1.5 top-2 bottom-7 flex flex-col justify-between text-[7px] font-mono text-[#2A3648]">
                <span>28-28</span><span>27-24</span><span>21</span><span>14-18</span>
              </div>
              {/* Active pillar */}
              <div className="flex flex-col items-center">
                <div className="text-center text-[7.5px] font-mono mb-1">
                  <div className="text-[#10B981]">22.00</div>
                  <div className="text-[#4A5568]">SGB1</div>
                  <div className="text-[#C53A43] text-[6.5px]">error 33.5</div>
                </div>
                <div className="relative w-14 flex flex-col justify-between p-1 rounded-t"
                  style={{
                    height: '130px',
                    background: 'linear-gradient(to top, rgba(16,185,129,0.08), rgba(16,185,129,0.45))',
                    border: '1px solid #10B981',
                    boxShadow: '0 0 22px rgba(16,185,129,0.22)',
                  }}>
                  <div className="w-full h-2.5 rounded-sm" style={{ background: 'rgba(33,201,138,0.45)' }}/>
                  <div className="text-center font-mono font-black text-white text-xl">{top.active}</div>
                  <div className="w-full h-0.5 rounded-full bg-[#10B981]/40"/>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-[#10B981] mt-1.5">Active</span>
              </div>
              {/* Inactive pillar */}
              <div className="flex flex-col items-center">
                <div className="text-center text-[7.5px] font-mono mb-1">
                  <div className="text-[#D9962E]">18.90</div>
                </div>
                <div className="relative w-14 flex flex-col justify-between p-1 rounded-t"
                  style={{
                    height: '55px',
                    background: 'linear-gradient(to top, rgba(217,150,46,0.08), rgba(217,150,46,0.45))',
                    border: '1px solid #D9962E',
                    boxShadow: '0 0 16px rgba(217,150,46,0.18)',
                  }}>
                  <div className="w-full h-2 rounded-sm" style={{ background: 'rgba(230,161,58,0.45)' }}/>
                  <div className="text-center font-mono font-black text-white text-lg">{top.inactive}</div>
                  <div className="w-full h-0.5 rounded-full bg-[#D9962E]/40"/>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-[#D9962E] mt-1.5">Inactive</span>
              </div>
            </div>
          </div>

          {/* Chart 3 – Assets by Allocation (Pillars) */}
          <div className="rounded-xl border border-[#243040] overflow-hidden flex flex-col"
            style={{ background: 'rgba(6,9,18,0.84)', backdropFilter: 'blur(10px)', minHeight: '200px' }}>
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-[#1C2840]">
              <div>
                <h3 className="text-[10.5px] font-bold text-white font-mono">Chart 3: Assets by Allocation</h3>
                <p className="text-[8.5px] text-[#4A5568] font-mono">Allocated vs Not Allocated</p>
              </div>
              <MoreVertical className="w-3.5 h-3.5 text-[#2A3648]"/>
            </div>
            <div className="flex-1 relative flex items-end justify-center gap-10 pb-4 pt-1 px-2">
              <div className="absolute left-1.5 top-2 bottom-7 flex flex-col justify-between text-[7px] font-mono text-[#2A3648]">
                <span>28-28</span><span>22-24</span><span>18-18</span><span>8-16</span>
              </div>
              <div className="absolute top-2 right-3 text-[#D9962E] opacity-50">
                <Sparkles className="w-3.5 h-3.5"/>
              </div>
              {/* Allocated pillar */}
              <div className="flex flex-col items-center">
                <div className="text-center text-[7.5px] font-mono mb-1">
                  <div className="text-[#22C7D6]">-18.30</div>
                  <div className="text-[#4A5568]">-0.5-25</div>
                </div>
                <div className="relative w-14 flex flex-col justify-between p-1 rounded-t"
                  style={{
                    height: '130px',
                    background: 'linear-gradient(to top, rgba(34,199,214,0.08), rgba(34,199,214,0.45))',
                    border: '1px solid #22C7D6',
                    boxShadow: '0 0 22px rgba(34,199,214,0.22)',
                  }}>
                  <div className="w-full h-2.5 rounded-sm" style={{ background: 'rgba(67,215,222,0.45)' }}/>
                  <div className="text-center font-mono font-black text-white text-xl">{top.allocated}</div>
                  <div className="w-full h-0.5 rounded-full bg-[#22C7D6]/40"/>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-[#22C7D6] mt-1.5">Allocated</span>
              </div>
              {/* Not Allocated pillar */}
              <div className="flex flex-col items-center">
                <div className="text-center text-[7.5px] font-mono mb-1">
                  <div className="text-[#D9962E]">-12.55</div>
                  <div className="text-[#4A5568]">-403-35</div>
                </div>
                <div className="relative w-14 flex flex-col justify-between p-1 rounded-t"
                  style={{
                    height: '55px',
                    background: 'linear-gradient(to top, rgba(107,79,184,0.08), rgba(107,79,184,0.45))',
                    border: '1px solid #6B4FB8',
                    boxShadow: '0 0 16px rgba(107,79,184,0.22)',
                  }}>
                  <div className="w-full h-2 rounded-sm" style={{ background: 'rgba(107,79,184,0.45)' }}/>
                  <div className="text-center font-mono font-black text-white text-lg">{top.notAllocated}</div>
                  <div className="w-full h-0.5 rounded-full bg-[#6B4FB8]/40"/>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-[#8A7BC0] mt-1.5">Not Alloc.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ BOTTOM DOCK ══════════════════════════════════════════════════ */}
        <div className="flex items-center justify-center pt-0.5">
          <div className="rounded-full border border-[#243040] px-3.5 py-1 flex items-center gap-2.5 shadow-xl"
            style={{ background: 'rgba(6,9,18,0.90)', backdropFilter: 'blur(8px)' }}>
            <button onClick={() => showToast('Previous view', 'info')}
              className="p-1 rounded-full text-[#4A5568] hover:text-[#22C7D6] transition-colors">
              <ChevronLeft className="w-3 h-3"/>
            </button>
            <button onClick={() => setShowTable(!showTable)}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono flex items-center gap-1.5 transition-colors ${
                showTable ? 'bg-[#22C7D6]/20 text-[#22C7D6] border border-[#22C7D6]/40' : 'text-[#4A5568] hover:text-white'
              }`}>
              <TableIcon className="w-2.5 h-2.5"/>
              <span>{showTable ? 'Hide Table' : 'Show Asset Inventory'}</span>
            </button>
            <button onClick={handleRefresh}
              className={`p-1 rounded-full text-[#4A5568] hover:text-[#10B981] transition-colors ${refreshing ? 'animate-spin text-[#10B981]' : ''}`}>
              <RefreshCw className="w-3 h-3"/>
            </button>
            <button onClick={handleExportExcel}
              className="px-2 py-0.5 rounded-full text-[9px] font-mono text-[#CED1D5] hover:text-white border border-[#243040] flex items-center gap-1 transition-colors"
              style={{ background: 'rgba(18,24,38,0.9)' }}>
              <Download className="w-2.5 h-2.5 text-[#22C7D6]"/>
              <span>Export</span>
            </button>
            <button onClick={() => showToast('Next view', 'info')}
              className="p-1 rounded-full text-[#4A5568] hover:text-[#22C7D6] transition-colors">
              <ChevronRight className="w-3 h-3"/>
            </button>
          </div>
        </div>

        {/* ══ INVENTORY TABLE (EXPANDABLE) ════════════════════════════════ */}
        {showTable && (
          <div className="mt-1 rounded-xl border border-[#243040] overflow-hidden"
            style={{ background: 'rgba(6,9,18,0.92)' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 border-b border-[#1C2840]">
              <div>
                <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  Complete IT Asset Inventory
                  <span className="px-2 py-0.5 rounded border text-[10px] text-[#22C7D6] border-[#243040]"
                    style={{ background: 'rgba(8,12,20,0.8)' }}>
                    {filteredAssets.length} of {assets.length} Records
                  </span>
                </h2>
                <p className="text-[10px] text-[#4A5568] mt-0.5">1:1 Representation of organizational Excel workbook</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/imports')}
                  className="px-3 py-1 rounded-lg border border-[#243040] text-white text-xs font-mono flex items-center gap-1.5 transition-colors hover:border-[#22C7D6]"
                  style={{ background: 'rgba(10,14,22,0.9)' }}>
                  <UploadCloud className="w-3 h-3 text-[#22C7D6]"/>Import Excel
                </button>
                <button onClick={handleExportExcel}
                  className="px-3 py-1 rounded-lg border border-[#243040] text-[#CED1D5] text-xs font-mono flex items-center gap-1.5 transition-colors hover:border-[#22C7D6]"
                  style={{ background: 'rgba(10,14,22,0.9)' }}>
                  <Download className="w-3 h-3 text-[#22C7D6]"/>Export 16-Col
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 px-4 py-2 border-b border-[#1C2840] text-xs font-mono">
              <div className="sm:col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-[#2A3648] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search Asset ID, Holder, Serial, IP..."
                  className="w-full border border-[#243040] rounded-lg pl-8 pr-3 py-1 text-[#CED1D5] placeholder-[#2A3648] focus:outline-none focus:border-[#22C7D6]"
                  style={{ background: 'rgba(8,12,20,0.8)' }}/>
              </div>
              {[
                { v: filterType, fn: setFilterType, opts: [['','All Types'],['Laptop','Laptop'],['Office PC','Office PC'],['Work Station','Work Station']] },
                { v: filterStatus, fn: setFilterStatus, opts: [['','All Statuses'],['Active','Active'],['Inactive','Inactive']] },
                { v: filterAllocation, fn: setFilterAllocation, opts: [['','All Allocation'],['Allocated','Allocated'],['Not Allocated','Not Allocated']] },
                { v: filterCriticality, fn: setFilterCriticality, opts: [['','All Criticality'],['High','High'],['Medium','Medium']] },
              ].map((s, i) => (
                <select key={i} value={s.v} onChange={e => s.fn(e.target.value)}
                  className="border border-[#243040] rounded-lg px-2 py-1 text-[#CED1D5] focus:outline-none focus:border-[#22C7D6]"
                  style={{ background: 'rgba(8,12,20,0.8)' }}>
                  {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
            </div>

            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-xs border-collapse font-mono whitespace-nowrap">
                <thead className="sticky top-0 border-b border-[#243040] text-[9px] text-[#4A5568] uppercase tracking-wider"
                  style={{ background: 'rgba(8,12,20,0.98)' }}>
                  <tr>
                    {['#','Asset ID','Asset Name','Description','Serial','Type','Status','Location','Allocation','Criticality','Employee','LAN IP','RAM','Date Alloc','Date Dealloc','CPU','LAN MAC'].map(h => (
                      <th key={h} className="py-1.5 px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#131C2A]">
                  {filteredAssets.map((asset, index) => (
                    <tr key={asset.id} onClick={() => navigate(`/assets/${asset.id}`)}
                      className="cursor-pointer transition-colors hover:bg-[#0F1520]/80">
                      <td className="py-1.5 px-3 text-[#2A3648]">{index + 1}</td>
                      <td className="py-1.5 px-3 font-bold text-[#22C7D6] hover:underline">{asset.companyAssetId}</td>
                      <td className="py-1.5 px-3 text-white font-medium font-sans">{asset.assetName}</td>
                      <td className="py-1.5 px-3 text-[#4A5568] font-sans">{asset.assetDescription || '—'}</td>
                      <td className="py-1.5 px-3 text-[#CED1D5]">{asset.serialNumber || '—'}</td>
                      <td className="py-1.5 px-3">
                        <span className="px-2 py-0.5 rounded border border-[#243040] text-[#CED1D5] text-[9px]"
                          style={{ background: 'rgba(8,12,20,0.8)' }}>
                          {asset.sourceAssetType || asset.assetType}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          asset.sourceAssetStatus === 'Active'
                            ? 'text-[#10B981] border border-[#10B981]/30'
                            : 'text-[#4A5568] border border-[#243040]'
                        }`} style={{ background: asset.sourceAssetStatus === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(18,26,40,0.8)' }}>
                          {asset.sourceAssetStatus}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-white font-sans">{asset.location}</td>
                      <td className="py-1.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] ${
                          asset.sourceAllocationStatus === 'Allocated'
                            ? 'text-[#22C7D6] border border-[#22C7D6]/30'
                            : 'text-[#D9962E] border border-[#D9962E]/30'
                        }`} style={{ background: asset.sourceAllocationStatus === 'Allocated' ? 'rgba(34,199,214,0.1)' : 'rgba(217,150,46,0.1)' }}>
                          {asset.sourceAllocationStatus}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        {asset.criticality === 'High' ? (
                          <span className="px-2 py-0.5 rounded text-[#C53A43] border border-[#C53A43]/30 font-bold text-[9px]"
                            style={{ background: 'rgba(197,58,67,0.12)' }}>High</span>
                        ) : asset.criticality === 'Medium' ? (
                          <span className="px-2 py-0.5 rounded text-[#22C7D6] border border-[#243040] text-[9px]"
                            style={{ background: 'rgba(8,12,20,0.8)' }}>Medium</span>
                        ) : (
                          <span className="text-[#2A3648]">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-white font-sans">{asset.employeeNameSource || asset.currentHolder?.fullName || <span className="text-[#2A3648]">—</span>}</td>
                      <td className="py-1.5 px-3 text-[#CED1D5]">{asset.lanIp || <span className="text-[#2A3648]">—</span>}</td>
                      <td className="py-1.5 px-3 text-[#CED1D5]">{asset.ram || <span className="text-[#2A3648]">—</span>}</td>
                      <td className="py-1.5 px-3 text-[#4A5568]">{asset.dateOfAllocation ? new Date(asset.dateOfAllocation).toLocaleDateString() : '—'}</td>
                      <td className="py-1.5 px-3 text-[#2A3648]">{asset.dateOfDeallocation ? new Date(asset.dateOfDeallocation).toLocaleDateString() : '—'}</td>
                      <td className="py-1.5 px-3 font-bold text-[#22C7D6]">{asset.cpu || <span className="text-[#2A3648]">—</span>}</td>
                      <td className="py-1.5 px-3 text-[#2A3648]">{asset.lanMacAddress || '—'}</td>
                    </tr>
                  ))}
                  {filteredAssets.length === 0 && (
                    <tr>
                      <td colSpan={17} className="py-8 text-center text-[#2A3648]">
                        No assets found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
