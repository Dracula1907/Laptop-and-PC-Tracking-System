import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { DataTable, Column } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { Asset } from '../types';
import { exportAssetsToCompanyExcel } from '../utils/exporters';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
  RefreshCw,
  X,
  Laptop,
  CheckSquare,
  Square,
  Filter,
  Layers,
  Wrench,
  ShieldAlert,
  ScanLine,
} from 'lucide-react';

const COLUMN_STORAGE_KEY = 'itam_inventory_columns_v2';

const DEFAULT_COLUMNS_VISIBILITY: Record<string, boolean> = {
  select: true,
  companyAssetId: true,
  assetName: true,
  assetType: true,
  serialNumber: true,
  status: true,
  allocation: true,
  currentHolder: true,
  department: true,
  location: true,
  criticality: true,
  lanIp: false,
  ram: true,
  cpu: true,
  dataQuality: true,
  qrCode: true,
  gatePresence: true,
  actions: true,
};

export const AssetList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Live PostgreSQL Telemetry Counts
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    allocated: 0,
    available: 0,
    underRepair: 0,
    dataQualityAlerts: 0,
  });

  // Filters from URL Search Params
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [assetType, setAssetType] = useState<string>(searchParams.get('assetType') || '');
  const [department, setDepartment] = useState<string>(searchParams.get('department') || '');
  const [location, setLocation] = useState<string>(searchParams.get('location') || '');
  const [sourceAssetStatus, setSourceAssetStatus] = useState<string>(searchParams.get('sourceAssetStatus') || '');
  const [allocationStatus, setAllocationStatus] = useState<string>(searchParams.get('allocationStatus') || '');
  const [criticality, setCriticality] = useState<string>(searchParams.get('criticality') || '');
  const [dataQualityStatus, setDataQualityStatus] = useState<string>(searchParams.get('dataQualityStatus') || '');

  // Sorting state
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'companyAssetId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'asc');

  // Dynamic Options from DB
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  // Multi-Row Selection state
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Column Visibility Customization with localStorage persistence
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_COLUMNS_VISIBILITY, ...JSON.parse(saved) };
      }
    } catch {
      // fallback to default
    }
    return DEFAULT_COLUMNS_VISIBILITY;
  });

  // Deactivate / Delete Modal state
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Save column visibility to localStorage
  const handleToggleColumn = (key: string) => {
    if (key === 'companyAssetId' || key === 'actions' || key === 'select') return; // pinned
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS_VISIBILITY);
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(DEFAULT_COLUMNS_VISIBILITY));
    } catch {
      // ignore
    }
  };

  // Close column picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch dynamic departments and locations from PostgreSQL
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deptRes, locRes]: any = await Promise.allSettled([
          api.get('/assets/departments'),
          api.get('/assets/locations'),
        ]);

        if (deptRes.status === 'fulfilled') {
          const res = deptRes.value;
          const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          setDepartments(items);
        }

        if (locRes.status === 'fulfilled') {
          const res = locRes.value;
          const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          setLocations(items);
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch live inventory telemetry counts
  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/assets/counts');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setCounts(data);
      }
    } catch (err) {
      console.error('Failed to load counts:', err);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  // Sync state with URL search params
  const updateUrlParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params, { replace: true });
  };

  // Fetch assets from PostgreSQL
  const fetchAssets = async (page = pagination.page, currentLimit = pagination.limit) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', currentLimit.toString());
      if (search.trim()) query.set('search', search.trim());
      if (assetType) query.set('assetType', assetType);
      if (department) query.set('department', department);
      if (location) query.set('location', location);
      if (sourceAssetStatus) query.set('sourceAssetStatus', sourceAssetStatus);
      if (allocationStatus) query.set('allocationStatus', allocationStatus);
      if (criticality) query.set('criticality', criticality);
      if (dataQualityStatus) query.set('dataQualityStatus', dataQualityStatus);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      updateUrlParams({
        search,
        assetType,
        department,
        location,
        sourceAssetStatus,
        allocationStatus,
        criticality,
        dataQualityStatus,
        sortBy,
        sortOrder,
        page: page.toString(),
      });

      const res: any = await api.get(`/assets?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;

      if (isSuccess && data) {
        setAssets(data.assets || []);
        if (data.pagination) {
          setPagination({
            page: data.pagination.page,
            limit: data.pagination.limit,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load inventory assets:', err);
      addToast('Failed to load assets from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger query on search / filter / sort change (resets to page 1)
  useEffect(() => {
    fetchAssets(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, assetType, department, location, sourceAssetStatus, allocationStatus, criticality, dataQualityStatus, sortBy, sortOrder]);

  const handlePageChange = (newPage: number) => {
    fetchAssets(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit }));
    fetchAssets(1, newLimit);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearch('');
    setAssetType('');
    setDepartment('');
    setLocation('');
    setSourceAssetStatus('');
    setAllocationStatus('');
    setCriticality('');
    setDataQualityStatus('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (assetType) count++;
    if (department) count++;
    if (location) count++;
    if (sourceAssetStatus) count++;
    if (allocationStatus) count++;
    if (criticality) count++;
    if (dataQualityStatus) count++;
    return count;
  }, [search, assetType, department, location, sourceAssetStatus, allocationStatus, criticality, dataQualityStatus]);

  // Multi-row selection handlers
  const allOnPageSelected = useMemo(() => {
    if (assets.length === 0) return false;
    return assets.every((a) => selectedAssetIds.includes(a.id));
  }, [assets, selectedAssetIds]);

  const handleToggleSelectAll = () => {
    if (allOnPageSelected) {
      const pageIds = new Set(assets.map((a) => a.id));
      setSelectedAssetIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const combined = new Set([...selectedAssetIds, ...assets.map((a) => a.id)]);
      setSelectedAssetIds(Array.from(combined));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export filtered dataset to Excel (.xlsx)
  const handleExportFilteredExcel = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams();
      query.set('limit', '10000'); // Export all matching rows
      if (search.trim()) query.set('search', search.trim());
      if (assetType) query.set('assetType', assetType);
      if (department) query.set('department', department);
      if (location) query.set('location', location);
      if (sourceAssetStatus) query.set('sourceAssetStatus', sourceAssetStatus);
      if (allocationStatus) query.set('allocationStatus', allocationStatus);
      if (criticality) query.set('criticality', criticality);
      if (dataQualityStatus) query.set('dataQualityStatus', dataQualityStatus);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      const res: any = await api.get(`/assets?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      const exportList = data?.assets || [];

      if (exportList.length === 0) {
        addToast('No assets match active filters to export.', 'warning');
        return;
      }

      exportAssetsToCompanyExcel(exportList);
      addToast(`Exported ${exportList.length} assets to Excel successfully.`, 'success');
    } catch (err: any) {
      console.error('Excel export failed:', err);
      addToast('Failed to export Excel file.', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Export selected assets to Excel (.xlsx)
  const handleExportSelected = () => {
    const selectedList = assets.filter((a) => selectedAssetIds.includes(a.id));
    if (selectedList.length === 0) {
      addToast('Please select at least one asset to export.', 'warning');
      return;
    }
    exportAssetsToCompanyExcel(selectedList, `FAITH_Selected_Assets_${new Date().toISOString().slice(0, 10)}`);
    addToast(`Exported ${selectedList.length} selected assets to Excel.`, 'success');
  };

  // Bulk update multiple selected assets (Step 15)
  const handleBulkUpdate = async (updates: any) => {
    if (selectedAssetIds.length === 0) return;
    try {
      const res: any = await api.post('/bulk/assets/update', {
        assetIds: selectedAssetIds,
        updates,
      });
      addToast(res?.message || `Successfully updated ${selectedAssetIds.length} assets`, 'success');
      setSelectedAssetIds([]);
      fetchAssets(pagination.page, pagination.limit);
      fetchCounts();
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Failed to execute bulk update', 'error');
    }
  };

  const handleBulkGenerateQrs = async () => {
    if (selectedAssetIds.length === 0) return;
    try {
      const res: any = await api.post('/qr/bulk-generate', { assetIds: selectedAssetIds });
      const isSuccess = res?.success ?? res?.data?.success;
      const count = res?.data?.totalCreated ?? res?.data?.data?.totalCreated ?? 0;
      if (isSuccess) {
        addToast(`Successfully generated ${count} QR codes for selected assets.`, 'success');
        fetchAssets(pagination.page, pagination.limit);
      }
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to bulk generate QR codes.', 'error');
    }
  };

  // Safe Deactivate / Delete Asset Workflow

  const handleConfirmDeactivate = async () => {
    if (!assetToDelete) return;
    setActionLoading(true);
    try {
      const res: any = await api.post(`/assets/${assetToDelete.id}/deactivate`);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || `Asset ${assetToDelete.companyAssetId || assetToDelete.assetCode} safely retired.`, 'success');
        setAssetToDelete(null);
        fetchAssets(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to deactivate asset.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error deactivating asset.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmHardDelete = async () => {
    if (!assetToDelete) return;
    setActionLoading(true);
    try {
      const res: any = await api.delete(`/assets/${assetToDelete.id}`);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || `Asset ${assetToDelete.companyAssetId || assetToDelete.assetCode} permanently deleted.`, 'success');
        setAssetToDelete(null);
        fetchAssets(pagination.page, pagination.limit);
        fetchCounts();
      } else {
        addToast(res?.message || 'Failed to delete asset.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error deleting asset.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 15 Standard Columns Definition
  const allColumns: Column<Asset>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10 min-w-[40px] px-3',
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleSelectRow(item.id);
          }}
          className="text-textSecondary hover:text-brandPrimary transition-colors"
          title={selectedAssetIds.includes(item.id) ? 'Deselect asset' : 'Select asset'}
        >
          {selectedAssetIds.includes(item.id) ? (
            <CheckSquare className="w-4 h-4 text-brandPrimary" />
          ) : (
            <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
          )}
        </button>
      ),
    },
    {
      key: 'companyAssetId',
      header: 'Asset ID',
      sortable: true,
      sortKey: 'companyAssetId',
      className: 'w-32 min-w-[120px]',
      render: (item) => (
        <span className="font-mono font-bold text-brandPrimary text-xs hover:underline cursor-pointer">
          {item.companyAssetId || item.assetCode}
        </span>
      ),
    },
    {
      key: 'assetName',
      header: 'Asset Name',
      sortable: true,
      sortKey: 'assetName',
      className: 'min-w-[160px]',
      render: (item) => (
        <div>
          <p className="font-semibold text-textPrimary leading-snug text-xs">
            {item.assetName || item.model || '—'}
          </p>
          <p className="text-[10px] text-textSecondary font-mono mt-0.5">
            {item.manufacturer || 'Dell'} {item.model && item.model !== item.assetName ? `• ${item.model}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'assetType',
      header: 'Type',
      sortable: true,
      sortKey: 'assetType',
      className: 'w-28 min-w-[110px]',
      render: (item) => {
        const typeStr =
          item.sourceAssetType ||
          (item.assetType === 'WORKSTATION'
            ? 'Work Station'
            : item.assetType === 'DESKTOP'
            ? 'Office PC'
            : item.assetType === 'MONITOR'
            ? 'Monitor'
            : item.assetType === 'HEADSET'
            ? 'Headset'
            : 'Laptop');
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-bgBase border border-borderBase text-textSecondary whitespace-nowrap">
            {typeStr}
          </span>
        );
      },
    },
    {
      key: 'serialNumber',
      header: 'Serial Number',
      sortable: true,
      sortKey: 'serialNumber',
      className: 'w-32 min-w-[130px]',
      render: (item) => (
        <span className="font-mono text-xs text-textSecondary">
          {item.serialNumber || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortKey: 'status',
      className: 'w-24 min-w-[100px]',
      render: (item) => {
        const isAct =
          (item.sourceAssetStatus || '').toLowerCase() === 'active' ||
          item.status === 'AVAILABLE' ||
          item.status === 'IN_USE';
        const isRepair = item.status === 'UNDER_REPAIR';
        const isRetired = item.status === 'RETIRED' || item.status === 'SCRAPPED';

        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
              isRepair
                ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                : isRetired
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                : isAct
                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {item.sourceAssetStatus || (isRepair ? 'In Repair' : isRetired ? 'Retired' : isAct ? 'Active' : 'Inactive')}
          </span>
        );
      },
    },
    {
      key: 'allocation',
      header: 'Allocation',
      sortable: true,
      sortKey: 'allocationStatus',
      className: 'w-28 min-w-[120px]',
      render: (item) => {
        const isAlloc =
          item.allocationStatus === 'ALLOCATED' ||
          item.status === 'IN_USE' ||
          item.status === 'ASSIGNED';
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
              isAlloc
                ? 'bg-blue-950/40 text-blue-400 border border-blue-500/20'
                : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
            }`}
          >
            {item.sourceAllocationStatus || (isAlloc ? 'Allocated' : 'Not Allocated')}
          </span>
        );
      },
    },
    {
      key: 'gatePresence',
      header: 'Gate State',
      sortable: false,
      className: 'w-24 min-w-[90px]',
      render: (item) => {
        const isOutside = item.gatePresence === 'OUTSIDE';
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap ${
              isOutside
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {isOutside ? 'OUTSIDE' : 'INSIDE'}
          </span>
        );
      },
    },
    {
      key: 'currentHolder',
      header: 'Employee',
      sortable: true,
      sortKey: 'employeeName',
      className: 'min-w-[160px]',
      render: (item) => {
        const holderName =
          item.employeeNameSource ||
          item.currentHolder?.fullName ||
          item.holderDisplayName;
        return (
          <div>
            <p className="font-medium text-textPrimary text-xs">
              {holderName || <span className="text-textSecondary italic">—</span>}
            </p>
            {item.currentHolder?.employeeCode && (
              <span className="text-[10px] text-textSecondary font-mono">
                {item.currentHolder.employeeCode}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'department',
      header: 'Department / Area',
      sortable: true,
      sortKey: 'department',
      className: 'min-w-[150px]',
      render: (item) => {
        const areaStr =
          item.department?.name ||
          (typeof item.location === 'string' ? item.location : item.location?.name) ||
          '—';
        return (
          <span className="text-xs text-textSecondary font-medium">
            {areaStr}
          </span>
        );
      },
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      sortKey: 'location',
      className: 'min-w-[140px]',
      render: (item) => {
        const locStr =
          (typeof item.locationRel === 'object' && item.locationRel !== null ? item.locationRel.name : item.locationRel) ||
          (typeof item.location === 'string' ? item.location : item.location?.name) ||
          '—';
        return (
          <span className="text-xs text-textSecondary font-mono">
            {locStr}
          </span>
        );
      },
    },
    {
      key: 'criticality',
      header: 'Criticality',
      sortable: true,
      sortKey: 'criticality',
      className: 'w-24 min-w-[100px]',
      render: (item) => {
        const crit = (item.criticality || '').toUpperCase();
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
              crit === 'HIGH' || crit === 'CRITICAL'
                ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                : crit === 'MEDIUM'
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : crit === 'LOW'
                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                : 'text-textSecondary'
            }`}
          >
            {crit || '—'}
          </span>
        );
      },
    },
    {
      key: 'lanIp',
      header: 'LAN IP',
      sortable: true,
      sortKey: 'lanIp',
      className: 'w-28 min-w-[120px]',
      render: (item) => (
        <span className="font-mono text-[11px] text-textSecondary">
          {item.lanIp || item.specifications?.ipAddress || '—'}
        </span>
      ),
    },
    {
      key: 'ram',
      header: 'RAM',
      sortable: true,
      sortKey: 'ram',
      className: 'w-20 min-w-[80px]',
      render: (item) => (
        <span className="font-mono text-xs text-textSecondary">
          {item.ram || item.specifications?.ram || '—'}
        </span>
      ),
    },
    {
      key: 'cpu',
      header: 'CPU',
      sortable: true,
      sortKey: 'cpu',
      className: 'w-20 min-w-[90px]',
      render: (item) => {
        const cpuStr = item.cpu || item.specifications?.processor || '';
        return cpuStr ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-bgBase border border-borderBase text-cyan-400">
            {cpuStr}
          </span>
        ) : (
          <span className="text-textSecondary">—</span>
        );
      },
    },
    {
      key: 'dataQuality',
      header: 'Data Quality',
      sortable: true,
      sortKey: 'dataQualityStatus',
      className: 'w-28 min-w-[130px]',
      render: (item) => {
        let issuesList: string[] = [];
        if (item.dataQualityIssues) {
          try {
            issuesList = typeof item.dataQualityIssues === 'string' ? JSON.parse(item.dataQualityIssues) : item.dataQualityIssues;
          } catch {
            issuesList = [String(item.dataQualityIssues)];
          }
        }

        if (item.dataQualityStatus === 'NEEDS_REVIEW') {
          return (
            <div className="flex items-center gap-1.5" title={issuesList.join(', ') || 'Incomplete critical fields'}>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-500/20 whitespace-nowrap">
                Incomplete
              </span>
            </div>
          );
        }
        if (item.dataQualityStatus === 'WARNING') {
          return (
            <div className="flex items-center gap-1.5" title={issuesList.join(', ') || 'Missing optional specifications'}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                Warning
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
              Good
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-28 min-w-[110px] text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/assets/${item.id}`)}
            title="View Asset Details"
            className="p-1.5 hover:text-brandPrimary hover:bg-slate-800"
            icon={<Eye className="w-4 h-4" />}
          />
          {hasPermission('ASSET_UPDATE') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/assets/${item.id}/edit`)}
              title="Edit Asset"
              className="p-1.5 hover:text-amber-400 hover:bg-slate-800"
              icon={<Edit className="w-4 h-4" />}
            />
          )}
          {(hasPermission('ASSET_DELETE') || hasPermission('ASSET_DEACTIVATE')) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAssetToDelete(item)}
              title="Deactivate or Delete Asset"
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
              icon={<Trash2 className="w-4 h-4" />}
            />
          )}
        </div>
      ),
    },
  ];

  // Active Visible Columns filter
  const visibleColumnDefs = useMemo(() => {
    return allColumns.filter((col) => visibleColumns[col.key] !== false);
  }, [visibleColumns, selectedAssetIds, assets]);

  // Column definitions for visibility toggle list
  const toggleableColumns = [
    { key: 'assetName', label: 'Asset Name & Model' },
    { key: 'assetType', label: 'Asset Type' },
    { key: 'serialNumber', label: 'Serial Number' },
    { key: 'status', label: 'Status' },
    { key: 'allocation', label: 'Allocation Status' },
    { key: 'currentHolder', label: 'Employee / Custodian' },
    { key: 'department', label: 'Department / Area' },
    { key: 'location', label: 'Location' },
    { key: 'criticality', label: 'Criticality' },
    { key: 'lanIp', label: 'LAN IP' },
    { key: 'ram', label: 'RAM' },
    { key: 'cpu', label: 'CPU' },
    { key: 'dataQuality', label: 'Data Quality' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Asset Inventory"
        subtitle="Central source of truth for all corporate laptops, workstations, office PCs, and IT hardware."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              loading={exporting}
              onClick={handleExportFilteredExcel}
              title="Export all matching assets to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Export Excel
            </Button>
            <Button variant="secondary" onClick={() => navigate('/imports')}>
              <UploadCloud className="w-4 h-4 mr-2 text-cyan-400" />
              Import Excel
            </Button>
            {hasPermission('ASSET_CREATE') && (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => navigate('/assets/new')}
              >
                Register Asset
              </Button>
            )}
          </div>
        }
      />

      {/* Live PostgreSQL Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => { clearAllFilters(); }}
          className="bg-bgElevated border border-borderBase hover:border-brandPrimary/40 rounded-xl p-3.5 transition-all cursor-pointer shadow-card"
        >
          <div className="flex items-center justify-between text-textSecondary text-xs">
            <span>Total Assets</span>
            <Layers className="w-3.5 h-3.5 text-brandPrimary" />
          </div>
          <p className="text-xl font-bold font-mono text-textPrimary mt-1.5">{counts.total}</p>
          <span className="text-[10px] text-textSecondary">Active repository</span>
        </div>

        <div
          onClick={() => { setSourceAssetStatus('Active'); }}
          className="bg-bgElevated border border-borderBase hover:border-emerald-500/40 rounded-xl p-3.5 transition-all cursor-pointer shadow-card"
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span>Active / In Use</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1.5">{counts.active}</p>
          <span className="text-[10px] text-textSecondary">Online in organization</span>
        </div>

        <div
          onClick={() => { setAllocationStatus('ALLOCATED'); }}
          className="bg-bgElevated border border-borderBase hover:border-blue-500/40 rounded-xl p-3.5 transition-all cursor-pointer shadow-card"
        >
          <div className="flex items-center justify-between text-blue-400 text-xs">
            <span>Allocated</span>
            <Laptop className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-bold font-mono text-blue-400 mt-1.5">{counts.allocated}</p>
          <span className="text-[10px] text-textSecondary">Assigned to employees</span>
        </div>

        <div
          onClick={() => { setAllocationStatus('NOT_ALLOCATED'); }}
          className="bg-bgElevated border border-borderBase hover:border-amber-500/40 rounded-xl p-3.5 transition-all cursor-pointer shadow-card"
        >
          <div className="flex items-center justify-between text-amber-400 text-xs">
            <span>Available Stock</span>
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1.5">{counts.available}</p>
          <span className="text-[10px] text-textSecondary">Ready for allocation</span>
        </div>

        <div
          onClick={() => { setSourceAssetStatus('UNDER_REPAIR'); }}
          className="bg-bgElevated border border-borderBase hover:border-rose-500/40 rounded-xl p-3.5 transition-all cursor-pointer shadow-card"
        >
          <div className="flex items-center justify-between text-rose-400 text-xs">
            <span>In Repair</span>
            <Wrench className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-xl font-bold font-mono text-rose-400 mt-1.5">{counts.underRepair}</p>
          <span className="text-[10px] text-textSecondary">Maintenance queue</span>
        </div>

        <div
          onClick={() => { setDataQualityStatus('WARNING'); }}
          className="bg-bgElevated border border-borderBase hover:border-amber-500/40 rounded-xl p-3.5 transition-all cursor-pointer shadow-card"
        >
          <div className="flex items-center justify-between text-amber-400 text-xs">
            <span>Quality Alerts</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1.5">{counts.dataQualityAlerts}</p>
          <span className="text-[10px] text-textSecondary">Missing specifications</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-bgElevated border border-borderBase rounded-xl p-4 space-y-3 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 items-center">
          {/* Search Input (2 cols) */}
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search Asset ID, S/N, Holder, IP, CPU, RAM, Area..."
            />
          </div>

          {/* Department / Area Filter */}
          <Select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              ...departments.map((d) => ({ value: d, label: d })),
            ]}
          />

          {/* Location Filter */}
          <Select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            options={[
              { value: '', label: 'All Locations' },
              ...locations.map((loc) => ({ value: loc, label: loc })),
            ]}
          />

          {/* Asset Type Filter */}
          <Select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            options={[
              { value: '', label: 'All Asset Types' },
              { value: 'LAPTOP', label: 'Laptop' },
              { value: 'DESKTOP', label: 'Office PC' },
              { value: 'WORKSTATION', label: 'Work Station' },
              { value: 'MONITOR', label: 'Monitor' },
              { value: 'HEADSET', label: 'Headset' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />

          {/* Allocation Status Filter */}
          <Select
            value={allocationStatus}
            onChange={(e) => setAllocationStatus(e.target.value)}
            options={[
              { value: '', label: 'All Allocations' },
              { value: 'ALLOCATED', label: 'Allocated' },
              { value: 'NOT_ALLOCATED', label: 'Not Allocated' },
            ]}
          />

          {/* Asset Status Filter */}
          <Select
            value={sourceAssetStatus}
            onChange={(e) => setSourceAssetStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
          />

          {/* Criticality & Column Controls */}
          <div className="flex items-center gap-1.5">
            <Select
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
              options={[
                { value: '', label: 'All Criticality' },
                { value: 'High', label: 'High' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Low', label: 'Low' },
              ]}
            />

            {/* Column Picker Trigger */}
            <div className="relative" ref={columnPickerRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                title="Customize table columns"
                className="px-2.5 py-2 shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-textSecondary" />
              </Button>

              {showColumnPicker && (
                <div className="absolute right-0 mt-2 w-64 bg-surfaceElevated border border-borderBase rounded-xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-borderBase">
                    <span className="text-xs font-semibold text-textPrimary">Visible Columns</span>
                    <button
                      type="button"
                      onClick={handleResetColumns}
                      className="text-[10px] text-brandPrimary hover:underline"
                    >
                      Reset Default
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {toggleableColumns.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center justify-between text-xs text-textSecondary hover:text-textPrimary cursor-pointer py-1 px-1.5 rounded hover:bg-bgBase"
                      >
                        <span>{col.label}</span>
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key] !== false}
                          onChange={() => handleToggleColumn(col.key)}
                          className="rounded border-borderBase text-brandPrimary focus:ring-brandPrimary"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Chips & Result Count */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-borderBase/60 gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-textSecondary font-medium flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-textSecondary" />
              Active Filters:
            </span>

            {activeFilterCount === 0 && (
              <span className="text-textSecondary/60 italic text-[11px]">None (Showing all assets)</span>
            )}

            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brandPrimary/15 border border-brandPrimary/30 text-brandPrimary text-[11px]">
                Search: "{search}"
                <button type="button" onClick={() => setSearch('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {department && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/50 border border-blue-500/30 text-blue-300 text-[11px]">
                Dept: {department}
                <button type="button" onClick={() => setDepartment('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {location && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-[11px]">
                Location: {location}
                <button type="button" onClick={() => setLocation('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {assetType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px]">
                Type: {assetType}
                <button type="button" onClick={() => setAssetType('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {allocationStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/50 border border-purple-500/30 text-purple-300 text-[11px]">
                Allocation: {allocationStatus}
                <button type="button" onClick={() => setAllocationStatus('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {sourceAssetStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[11px]">
                Status: {sourceAssetStatus}
                <button type="button" onClick={() => setSourceAssetStatus('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {criticality && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 text-[11px]">
                Crit: {criticality}
                <button type="button" onClick={() => setCriticality('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dataQualityStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-300 text-[11px]">
                Quality: {dataQualityStatus}
                <button type="button" onClick={() => setDataQualityStatus('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] text-textSecondary hover:text-white underline ml-1"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Result counter */}
          <div className="flex items-center gap-3 text-textSecondary">
            <span>
              Total Matching: <strong className="text-textPrimary font-mono">{pagination.total}</strong> assets
            </span>
            <button
              type="button"
              onClick={() => { fetchAssets(); fetchCounts(); }}
              className="hover:text-white text-textSecondary"
              title="Refresh inventory from live database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Inventory Table with Internal Horizontal Scroll */}
      <div className="relative">
        <div className="w-full overflow-x-auto rounded-xl border border-borderBase shadow-card">
          <table className="w-full text-left border-collapse text-sm min-w-[1280px]">
            <thead>
              <tr className="bg-surfaceElevated/80 border-b border-borderBase text-xs font-semibold text-textSecondary uppercase tracking-wider select-none">
                {visibleColumnDefs.map((col) => {
                  if (col.key === 'select') {
                    return (
                      <th key={col.key} className="w-10 px-3 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          title={allOnPageSelected ? 'Deselect all on page' : 'Select all on page'}
                          className="text-textSecondary hover:text-brandPrimary transition-colors"
                        >
                          {allOnPageSelected ? (
                            <CheckSquare className="w-4 h-4 text-brandPrimary" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                          )}
                        </button>
                      </th>
                    );
                  }

                  const activeSortKey = col.sortKey || col.key;
                  const isSorted = sortBy === activeSortKey;
                  const canSort = col.sortable;

                  return (
                    <th
                      key={col.key}
                      onClick={() => canSort && handleSort(activeSortKey)}
                      className={`px-3.5 py-3.5 whitespace-nowrap ${canSort ? 'cursor-pointer hover:text-white transition-colors' : ''} ${col.className || ''}`}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {canSort && isSorted && (
                          <span className="text-brandPrimary font-mono text-[10px]">
                            {sortOrder === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase/60 text-textPrimary">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {visibleColumnDefs.map((col) => (
                      <td key={col.key} className="px-3.5 py-3.5">
                        <div className="h-4 bg-slate-800/80 rounded w-4/5" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnDefs.length} className="py-16 text-center text-textSecondary">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Layers className="w-8 h-8 text-zinc-600" />
                      <p className="font-semibold text-textPrimary text-sm">No assets found</p>
                      <p className="text-xs text-textSecondary max-w-sm">
                        No assets match the active search or filters in PostgreSQL database.
                      </p>
                      {activeFilterCount > 0 && (
                        <Button variant="secondary" size="sm" onClick={clearAllFilters} className="mt-2 text-xs">
                          Clear Active Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                assets.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/assets/${item.id}`)}
                    className={`transition-colors duration-150 hover:bg-slate-800/40 cursor-pointer ${
                      selectedAssetIds.includes(item.id) ? 'bg-brandPrimary/5' : ''
                    }`}
                  >
                    {visibleColumnDefs.map((col) => (
                      <td key={col.key} className={`px-3.5 py-3 text-xs ${col.className || ''}`}>
                        {col.render ? col.render(item) : (item as any)[col.key] || '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.total}
        limit={pagination.limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        pageSizeOptions={[25, 50, 100]}
      />

      {/* Sticky Bulk Selection Action Bar */}
      {selectedAssetIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surfaceElevated border border-borderBase shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-textPrimary">
            <span className="w-5 h-5 rounded-full bg-brandPrimary/20 text-brandPrimary flex items-center justify-center text-[11px] font-mono font-bold">
              {selectedAssetIds.length}
            </span>
            <span>assets selected</span>
          </div>

          <div className="h-4 w-px bg-borderBase" />

          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) handleBulkUpdate({ status: e.target.value });
                e.target.value = '';
              }}
              className="bg-bgBase border border-borderBase rounded-lg px-2.5 py-1 text-xs text-textSecondary focus:outline-none focus:border-brandPrimary"
            >
              <option value="">Bulk Status...</option>
              <option value="AVAILABLE">Mark Available</option>
              <option value="UNDER_REPAIR">Mark Under Repair</option>
              <option value="INACTIVE">Mark Inactive</option>
              <option value="SCRAPPED">Mark Scrapped</option>
            </select>

            <select
              onChange={(e) => {
                if (e.target.value) handleBulkUpdate({ criticality: e.target.value });
                e.target.value = '';
              }}
              className="bg-bgBase border border-borderBase rounded-lg px-2.5 py-1 text-xs text-textSecondary focus:outline-none focus:border-brandPrimary"
            >
              <option value="">Bulk Criticality...</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportSelected}
            className="text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            Export Selected ({selectedAssetIds.length})
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleBulkGenerateQrs}
            className="text-xs text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
          >
            <ScanLine className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Bulk Generate QRs
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedAssetIds([])}
            className="text-xs text-textSecondary hover:text-white"
          >
            Deselect All
          </Button>
        </div>
      )}


      {/* Controlled Deactivate / Delete Modal */}
      {assetToDelete && (
        <Modal
          isOpen={Boolean(assetToDelete)}
          onClose={() => setAssetToDelete(null)}
          title="Deactivate or Remove Asset"
        >
          <div className="space-y-4">
            <div className="bg-bgBase border border-borderBase rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-textSecondary">Asset Identifier:</span>
                <span className="font-mono font-bold text-brandPrimary">
                  {assetToDelete.companyAssetId || assetToDelete.assetCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-textSecondary">Model / Name:</span>
                <span className="text-textPrimary font-medium">{assetToDelete.assetName || assetToDelete.model}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-textSecondary">Current Status:</span>
                <span className="text-textPrimary font-mono">{assetToDelete.status}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-textSecondary">Allocation Status:</span>
                <span className="text-textPrimary font-mono">{assetToDelete.allocationStatus}</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">Controlled Lifecycle Deactivation</p>
                <p className="text-amber-200/90 leading-relaxed">
                  Deactivating this asset will safely retire it from the active inventory. All historical assignment logs, maintenance tickets, and movement histories will remain intact.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setAssetToDelete(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={actionLoading}
                onClick={handleConfirmDeactivate}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Deactivate Asset
              </Button>
              <Button
                variant="danger"
                loading={actionLoading}
                onClick={handleConfirmHardDelete}
                title="Only allowed if no historical dependencies exist"
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
