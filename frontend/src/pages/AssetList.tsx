import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { DataTable, Column } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { QRCodeModal } from '../components/QRCodeModal';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { Asset, AssetType } from '../types';
import { exportModuleToExcel } from '../utils/exporters';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  QrCode,
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

export const AssetList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [assetType, setAssetType] = useState<string>(searchParams.get('assetType') || '');
  const [sourceAssetStatus, setSourceAssetStatus] = useState<string>(searchParams.get('sourceAssetStatus') || '');
  const [allocationStatus, setAllocationStatus] = useState<string>(searchParams.get('allocationStatus') || '');
  const [criticality, setCriticality] = useState<string>(searchParams.get('criticality') || '');
  const [dataQualityStatus, setDataQualityStatus] = useState<string>(searchParams.get('dataQualityStatus') || '');

  // QR Modal
  const [selectedQRAsset, setSelectedQRAsset] = useState<Asset | null>(null);

  // Delete Modal
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    setDeleteLoading(true);
    try {
      const res: any = await api.delete(`/assets/${assetToDelete.id}`);
      if (res?.success ?? res?.data?.success) {
        addToast(res.message || `Asset ${assetToDelete.companyAssetId || assetToDelete.assetCode} deleted successfully.`, 'success');
        setAssetToDelete(null);
        fetchAssets(pagination.page);
      } else {
        addToast(res?.message || 'Failed to delete asset.', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Error deleting asset.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchAssets = async (page = 1) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', '10');
      if (search) query.set('search', search);
      if (assetType) query.set('assetType', assetType);
      if (sourceAssetStatus) query.set('sourceAssetStatus', sourceAssetStatus);
      if (allocationStatus) query.set('allocationStatus', allocationStatus);
      if (criticality) query.set('criticality', criticality);
      if (dataQualityStatus) query.set('dataQualityStatus', dataQualityStatus);

      const res: any = await api.get(`/assets?${query.toString()}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setAssets(data.assets || []);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets(1);
  }, [search, assetType, sourceAssetStatus, allocationStatus, criticality, dataQualityStatus]);

  const handleDownloadCompanyExcel = async () => {
    try {
      const res = await api.get('/import/export-company-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `company_it_assets_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Company Excel inventory downloaded successfully.', 'success');
    } catch {
      addToast('Failed to download company Excel inventory.', 'error');
    }
  };

  const columns: Column<Asset>[] = [
    {
      key: 'companyAssetId',
      header: 'Asset ID',
      render: (item) => (
        <span className="font-mono font-bold text-brandPrimary hover:underline cursor-pointer">
          {item.companyAssetId || item.assetCode}
        </span>
      ),
    },
    {
      key: 'model',
      header: 'Device / Model',
      render: (item) => (
        <div>
          <p className="font-semibold text-textPrimary">{item.assetName || item.model}</p>
          <p className="text-[10px] text-textSecondary font-mono">
            {item.manufacturer} {item.serialNumber ? `• S/N: ${item.serialNumber}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'assetType',
      header: 'Type',
      render: (item) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-bgBase border border-borderBase text-textSecondary">
          {item.sourceAssetType || (item.assetType === 'WORKSTATION' ? 'Work Station' : item.assetType === 'DESKTOP' ? 'Office PC' : 'Laptop')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const isAct = (item.sourceAssetStatus || '').toLowerCase() === 'active' || item.status === 'AVAILABLE' || item.status === 'IN_USE';
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
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
      render: (item) => {
        const isAlloc = item.allocationStatus === 'ALLOCATED' || item.status === 'IN_USE' || item.status === 'ASSIGNED';
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              isAlloc
                ? 'bg-blue-950/40 text-blue-400 border border-blue-500/20'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
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
      render: (item) => {
        const crit = item.criticality || 'UNSPECIFIED';
        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              crit === 'HIGH' || crit === 'CRITICAL'
                ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                : crit === 'MEDIUM'
                ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {crit === 'UNSPECIFIED' ? '—' : crit}
          </span>
        );
      },
    },
    {
      key: 'currentHolder',
      header: 'Holder / Custodian',
      render: (item) => (
        <div>
          <p className="font-medium text-textPrimary">
            {item.holderDisplayName || item.currentHolder?.fullName || <span className="text-textSecondary italic">Unassigned</span>}
          </p>
          {item.holderType && item.holderType !== 'EMPLOYEE' && item.holderDisplayName && (
            <span className="text-[10px] text-amber-400/80 font-mono">[{item.holderType}]</span>
          )}
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department / Area',
      render: (item) => (
        <span className="text-xs text-textSecondary font-medium">
          {item.department?.name || item.location?.name || '—'}
        </span>
      ),
    },
    {
      key: 'specs',
      header: 'CPU / RAM / IP',
      render: (item) => (
        <div className="text-[11px] font-mono text-textSecondary">
          <span>{item.specifications?.processor || '—'}</span> /{' '}
          <span>{item.specifications?.ram || '—'}</span> /{' '}
          <span>{item.specifications?.ipAddress || '—'}</span>
        </div>
      ),
    },
    {
      key: 'dataQuality',
      header: 'Data Quality',
      render: (item) => {
        if (item.dataQualityStatus === 'NEEDS_REVIEW') {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Review
            </span>
          );
        }
        if (item.dataQualityStatus === 'WARNING') {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] text-yellow-400/80">
              <AlertTriangle className="w-3.5 h-3.5" /> Warning
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Clean
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/assets/${item.id}`)}
            title="View Details"
            icon={<Eye className="w-4 h-4" />}
          />
          {hasPermission('ASSET_UPDATE') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/assets/${item.id}/edit`)}
              title="Edit Asset"
              icon={<Edit className="w-4 h-4" />}
            />
          )}
          {hasPermission('ASSET_DELETE') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAssetToDelete(item)}
              title="Delete Asset"
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
              icon={<Trash2 className="w-4 h-4" />}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedQRAsset(item)}
            title="Generate QR Code"
            icon={<QrCode className="w-4 h-4 text-brandPrimary" />}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Inventory"
        subtitle="Live corporate laptops, workstations, office PCs, and equipment database."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportModuleToExcel(assets, 'Assets');
                addToast('Excel export generated successfully.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" />
              Export Excel
            </Button>
            <Button variant="secondary" onClick={handleDownloadCompanyExcel}>
              <Download className="w-4 h-4 mr-2" />
              Company 16-Col
            </Button>
            <Button variant="secondary" onClick={() => navigate('/imports')}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Import Excel
            </Button>
            {hasPermission('ASSET_CREATE') && (
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/assets/new')}>
                Register Asset
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-bgElevated border border-borderBase rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search Asset ID (FAA-001), S/N, Holder, IP, CPU, Area..."
          />
        </div>

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

        <Select
          value={allocationStatus}
          onChange={(e) => setAllocationStatus(e.target.value)}
          options={[
            { value: '', label: 'All Allocations' },
            { value: 'ALLOCATED', label: 'Allocated' },
            { value: 'NOT_ALLOCATED', label: 'Not Allocated' },
          ]}
        />

        <Select
          value={sourceAssetStatus}
          onChange={(e) => setSourceAssetStatus(e.target.value)}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />

        <Select
          value={dataQualityStatus}
          onChange={(e) => setDataQualityStatus(e.target.value)}
          options={[
            { value: '', label: 'All Data Quality' },
            { value: 'CLEAN', label: 'Clean' },
            { value: 'WARNING', label: 'Warnings' },
            { value: 'NEEDS_REVIEW', label: 'Needs Review' },
          ]}
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={assets}
        loading={loading}
        onRowClick={(item) => navigate(`/assets/${item.id}`)}
      />

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.total}
        limit={pagination.limit}
        onPageChange={(p) => fetchAssets(p)}
      />

      {/* QR Code Modal */}
      {selectedQRAsset && (
        <QRCodeModal
          isOpen={!!selectedQRAsset}
          onClose={() => setSelectedQRAsset(null)}
          assetCode={selectedQRAsset.companyAssetId || selectedQRAsset.assetCode}
          assetTitle={`${selectedQRAsset.assetName || selectedQRAsset.model}`}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(assetToDelete)}
        onClose={() => setAssetToDelete(null)}
        title="Confirm Asset Deletion"
        subtitle="Review potential historical dependencies before removing this asset."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <p className="font-semibold text-sm text-white mb-1">
              Delete Asset {assetToDelete?.companyAssetId || assetToDelete?.assetCode}?
            </p>
            <p className="text-rose-200/90 text-xs leading-relaxed">
              If this asset has associated assignments, maintenance tickets, or handover history, it will be safely retired and deactivated to preserve historical audit trails. If it has no historical records, it will be permanently removed.
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
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
