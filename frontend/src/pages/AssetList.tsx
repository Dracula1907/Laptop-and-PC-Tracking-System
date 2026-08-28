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
  RotateCcw,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';

export const AssetList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters from URL Search Params
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [assetType, setAssetType] = useState<string>(searchParams.get('assetType') || '');
  const [department, setDepartment] = useState<string>(searchParams.get('department') || '');
  const [sourceAssetStatus, setSourceAssetStatus] = useState<string>(searchParams.get('sourceAssetStatus') || '');
  const [allocationStatus, setAllocationStatus] = useState<string>(searchParams.get('allocationStatus') || '');
  const [criticality, setCriticality] = useState<string>(searchParams.get('criticality') || '');
  const [dataQualityStatus, setDataQualityStatus] = useState<string>(searchParams.get('dataQualityStatus') || '');
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'companyAssetId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'asc');

  // Dynamic Departments from DB
  const [departments, setDepartments] = useState<string[]>([]);

  // Column Visibility Customization
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    companyAssetId: true,
    model: true,
    assetType: true,
    status: true,
    allocation: true,
    criticality: true,
    currentHolder: true,
    department: true,
    specs: true,
    dataQuality: true,
    actions: true,
  });

  // Delete Modal state
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

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

  // Fetch departments & locations from backend
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const [assetDeptsRes, orgDeptsRes]: any = await Promise.allSettled([
          api.get('/assets/departments'),
          api.get('/departments'),
        ]);

        const deptSet = new Set<string>();

        if (assetDeptsRes.status === 'fulfilled') {
          const res = assetDeptsRes.value;
          const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          items.forEach((item: any) => {
            const name = typeof item === 'string' ? item : item?.name;
            if (name && name.trim()) deptSet.add(name.trim());
          });
        }

        if (orgDeptsRes.status === 'fulfilled') {
          const res = orgDeptsRes.value;
          const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          items.forEach((item: any) => {
            const name = typeof item === 'string' ? item : item?.name;
            if (name && name.trim()) deptSet.add(name.trim());
          });
        }

        if (deptSet.size > 0) {
          setDepartments(Array.from(deptSet).sort((a, b) => a.localeCompare(b)));
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepts();
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
  const fetchAssets = async (page = 1, currentLimit = pagination.limit) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', currentLimit.toString());
      if (search.trim()) query.set('search', search.trim());
      if (assetType) query.set('assetType', assetType);
      if (department) query.set('department', department);
      if (sourceAssetStatus) query.set('sourceAssetStatus', sourceAssetStatus);
      if (allocationStatus) query.set('allocationStatus', allocationStatus);
      if (criticality) query.set('criticality', criticality);
      if (dataQualityStatus) query.set('dataQualityStatus', dataQualityStatus);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

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

      // Update URL
      updateUrlParams({
        search,
        assetType,
        department,
        sourceAssetStatus,
        allocationStatus,
        criticality,
        dataQualityStatus,
        sortBy,
        sortOrder,
        page: page > 1 ? page.toString() : '',
      });
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      addToast('Unable to load assets from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch on filter/sort change
  useEffect(() => {
    fetchAssets(1, pagination.limit);
  }, [search, assetType, department, sourceAssetStatus, allocationStatus, criticality, dataQualityStatus, sortBy, sortOrder]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchAssets(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit }));
    fetchAssets(1, newLimit);
  };

  const clearAllFilters = () => {
    setSearch('');
    setAssetType('');
    setDepartment('');
    setSourceAssetStatus('');
    setAllocationStatus('');
    setCriticality('');
    setDataQualityStatus('');
    setSortBy('companyAssetId');
    setSortOrder('asc');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (assetType) count++;
    if (department) count++;
    if (sourceAssetStatus) count++;
    if (allocationStatus) count++;
    if (criticality) count++;
    if (dataQualityStatus) count++;
    return count;
  }, [search, assetType, department, sourceAssetStatus, allocationStatus, criticality, dataQualityStatus]);

  // Export filtered dataset to Excel
  const handleExportFilteredExcel = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams();
      query.set('limit', '10000'); // Export all matching rows
      if (search.trim()) query.set('search', search.trim());
      if (assetType) query.set('assetType', assetType);
      if (department) query.set('department', department);
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

  // Delete / Deactivate Asset
  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    setDeleteLoading(true);
    try {
      const res: any = await api.delete(`/assets/${assetToDelete.id}`);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || `Asset ${assetToDelete.companyAssetId || assetToDelete.assetCode} processed successfully.`, 'success');
        setAssetToDelete(null);
        fetchAssets(pagination.page, pagination.limit);
      } else {
        addToast(res?.message || 'Failed to delete asset.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error deleting asset.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Table Columns Definition
  const allColumns: Column<Asset>[] = [
    {
      key: 'companyAssetId',
      header: 'Asset ID',
      sortable: true,
      sortKey: 'companyAssetId',
      className: 'w-32 min-w-[110px]',
      render: (item) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/assets/${item.id}`);
          }}
          className="font-mono font-bold text-brandPrimary hover:underline cursor-pointer tracking-tight"
        >
          {item.companyAssetId || item.assetCode}
        </span>
      ),
    },
    {
      key: 'model',
      header: 'Device / Model',
      sortable: true,
      sortKey: 'assetName',
      className: 'min-w-[180px]',
      render: (item) => (
        <div>
          <p className="font-semibold text-textPrimary leading-snug">{item.assetName || item.model}</p>
          <p className="text-[10px] text-textSecondary font-mono mt-0.5">
            {item.manufacturer} {item.serialNumber ? `• S/N: ${item.serialNumber}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'assetType',
      header: 'Type',
      sortable: true,
      sortKey: 'assetType',
      className: 'w-28 min-w-[100px]',
      render: (item) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-bgBase border border-borderBase text-textSecondary whitespace-nowrap">
          {item.sourceAssetType ||
            (item.assetType === 'WORKSTATION'
              ? 'Work Station'
              : item.assetType === 'DESKTOP'
              ? 'Office PC'
              : 'Laptop')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortKey: 'sourceAssetStatus',
      className: 'w-24 min-w-[85px]',
      render: (item) => {
        const isAct =
          (item.sourceAssetStatus || '').toLowerCase() === 'active' ||
          item.status === 'AVAILABLE' ||
          item.status === 'IN_USE';
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
              isAct
                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {item.sourceAssetStatus || (isAct ? 'Active' : 'Inactive')}
          </span>
        );
      },
    },
    {
      key: 'allocation',
      header: 'Allocation',
      sortable: true,
      sortKey: 'allocationStatus',
      className: 'w-28 min-w-[100px]',
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
      key: 'criticality',
      header: 'Criticality',
      sortable: true,
      sortKey: 'criticality',
      className: 'w-24 min-w-[85px]',
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
      key: 'currentHolder',
      header: 'Holder / Custodian',
      sortable: true,
      sortKey: 'employeeName',
      className: 'min-w-[160px]',
      render: (item) => (
        <div>
          <p className="font-medium text-textPrimary text-xs">
            {item.employeeNameSource ||
              item.currentHolder?.fullName ||
              item.holderDisplayName || (
                <span className="text-textSecondary italic">Unassigned</span>
              )}
          </p>
          {item.currentHolder?.employeeCode && (
            <span className="text-[10px] text-textSecondary font-mono">
              {item.currentHolder.employeeCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department / Area',
      sortable: true,
      sortKey: 'location',
      className: 'min-w-[140px]',
      render: (item) => {
        const areaStr =
          item.location ||
          item.department?.name ||
          (typeof item.locationRel === 'string'
            ? item.locationRel
            : (item.locationRel as any)?.name);
        return (
          <span className="text-xs text-textSecondary font-medium">
            {areaStr || '—'}
          </span>
        );
      },
    },
    {
      key: 'specs',
      header: 'CPU / RAM / IP',
      className: 'min-w-[150px]',
      render: (item) => {
        const cpuStr = item.cpu || item.specifications?.processor || '—';
        const ramStr = item.ram || item.specifications?.ram || '—';
        const ipStr = item.lanIp || item.specifications?.ipAddress || '—';

        return (
          <div className="text-[11px] font-mono text-textSecondary">
            <span className="text-slate-300">{cpuStr}</span> /{' '}
            <span className="text-slate-300">{ramStr}</span> /{' '}
            <span className="text-slate-400">{ipStr}</span>
          </div>
        );
      },
    },
    {
      key: 'dataQuality',
      header: 'Data Quality',
      sortable: true,
      sortKey: 'dataQualityStatus',
      className: 'w-32 min-w-[120px]',
      render: (item) => {
        if (item.dataQualityStatus === 'NEEDS_REVIEW') {
          return (
            <span
              title={item.dataQualityIssues || 'Missing critical identifiers'}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap cursor-help"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Needs Review
            </span>
          );
        }
        if (item.dataQualityStatus === 'WARNING') {
          return (
            <span
              title={item.dataQualityIssues || 'Missing optional specifications'}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-400 bg-yellow-950/30 px-2 py-0.5 rounded border border-yellow-500/20 whitespace-nowrap cursor-help"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Warning
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" /> Clean
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right w-24 min-w-[90px]',
      render: (item) => (
        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
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
          {hasPermission('ASSET_DELETE') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAssetToDelete(item)}
              title="Delete or Deactivate Asset"
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
              icon={<Trash2 className="w-4 h-4" />}
            />
          )}
        </div>
      ),
    },
  ];

  // Active Visible Columns
  const columns = useMemo(() => {
    return allColumns.filter((col) => visibleColumns[col.key] !== false);
  }, [visibleColumns, departments]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Asset Inventory"
        subtitle="Live corporate laptops, workstations, office PCs, and equipment database."
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

      {/* Filter & Search Toolbar */}
      <div className="bg-bgElevated border border-borderBase rounded-xl p-4 space-y-3 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search Asset ID (FAA-001), S/N, Holder, IP, CPU, Area..."
            />
          </div>

          {/* Department / Area Filter */}
          <Select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            options={[
              { value: '', label: 'All Departments / Areas' },
              ...departments.map((d) => ({ value: d, label: d })),
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

          {/* Source Asset Status Filter */}
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
          <div className="flex items-center gap-2">
            <Select
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
              options={[
                { value: '', label: 'All Criticality' },
                { value: 'High', label: 'High' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Low', label: 'Low' },
                { value: 'Unspecified', label: 'Unspecified' },
              ]}
            />

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                title={`Reset ${activeFilterCount} active filters`}
                className="text-xs text-textSecondary hover:text-white shrink-0 px-2.5 py-2 border border-borderBase rounded-lg bg-bgBase"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Column Visibility Picker Dropdown */}
            <div className="relative shrink-0" ref={columnPickerRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                title="Customize table columns"
                className="px-2.5 py-2 border border-borderBase rounded-lg"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-textSecondary" />
              </Button>

              {showColumnPicker && (
                <div className="absolute right-0 mt-2 w-56 bg-bgElevated border border-borderBase rounded-xl shadow-2xl p-3 z-50 text-xs">
                  <p className="font-semibold text-textPrimary mb-2 border-b border-borderBase pb-1.5">
                    Visible Columns
                  </p>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {allColumns
                      .filter((c) => c.key !== 'actions')
                      .map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 text-textSecondary hover:text-textPrimary cursor-pointer py-1"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[col.key] !== false}
                            onChange={(e) =>
                              setVisibleColumns({
                                ...visibleColumns,
                                [col.key]: e.target.checked,
                              })
                            }
                            className="rounded bg-bgBase border-borderBase text-brandPrimary focus:ring-0"
                          />
                          <span>{col.header}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Horizontal Scrolling Table */}
      <DataTable
        columns={columns}
        data={assets}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage={
          activeFilterCount > 0
            ? 'No asset records match your active search and filter criteria.'
            : 'No assets have been registered yet.'
        }
        emptyAction={
          activeFilterCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={clearAllFilters} icon={<RotateCcw className="w-3.5 h-3.5" />}>
              Reset Filters
            </Button>
          ) : (
            <div className="flex gap-2 justify-center">
              <Button variant="primary" size="sm" onClick={() => navigate('/assets/new')} icon={<Plus className="w-3.5 h-3.5" />}>
                Register Asset
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/imports')} icon={<UploadCloud className="w-3.5 h-3.5" />}>
                Import Excel
              </Button>
            </div>
          )
        }
        onRowClick={(item) => navigate(`/assets/${item.id}`)}
      />

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.total}
        limit={pagination.limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />

      {/* Delete / Deactivate Confirmation Modal */}
      <Modal
        isOpen={Boolean(assetToDelete)}
        onClose={() => setAssetToDelete(null)}
        title="Confirm Asset Deletion"
        subtitle="Review historical dependencies before proceeding."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <p className="font-semibold text-sm text-white mb-1">
              Delete Asset {assetToDelete?.companyAssetId || assetToDelete?.assetCode}?
            </p>
            <p className="text-rose-200/90 text-xs leading-relaxed">
              If this asset has associated assignments, maintenance tickets, or handover records, it will be safely retired and deactivated to preserve historical audit trails. If it has no historical records, it will be permanently removed.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
            <Button variant="secondary" onClick={() => setAssetToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteLoading}
              onClick={confirmDeleteAsset}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-md"
            >
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

