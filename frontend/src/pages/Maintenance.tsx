import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  Edit,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  ShieldCheck,
  DollarSign,
  Activity,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { exportModuleToExcel } from '../utils/exporters';
import api from '../services/api';

export const Maintenance: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Options
  const [assets, setAssets] = useState<any[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [recordToEdit, setRecordToEdit] = useState<any | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    assetId: '',
    issueTitle: '',
    issueDescription: '',
    technician: '',
    serviceProvider: 'Dell Authorized Service',
    repairCost: 0,
    remarks: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/maintenance');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && Array.isArray(data)) {
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to fetch maintenance:', err);
      showToast('Failed to load maintenance records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res: any = await api.get('/maintenance/options');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error('Failed to load maintenance options:', err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchOptions();
  }, []);

  const openCreateModal = () => {
    fetchOptions();
    setFormData({
      assetId: assets[0]?.id || '',
      issueTitle: '',
      issueDescription: '',
      technician: '',
      serviceProvider: 'Dell Authorized Service',
      repairCost: 0,
      remarks: '',
    });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const validateCreate = () => {
    const errs: Record<string, string> = {};
    if (!formData.assetId) errs.assetId = 'Select an asset requiring service.';
    if (!formData.issueTitle.trim()) errs.issueTitle = 'Issue title is required.';
    if (!formData.issueDescription.trim()) errs.issueDescription = 'Issue description is required.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreate()) return;

    setModalLoading(true);
    try {
      const res: any = await api.post('/maintenance', {
        ...formData,
        repairCost: Number(formData.repairCost) || 0,
      });
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Maintenance ticket created! Asset set to UNDER_REPAIR.', 'success');
        setIsCreateOpen(false);
        fetchRecords();
        fetchOptions();
      } else {
        showToast(res?.message || 'Failed to create maintenance ticket.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error creating maintenance ticket.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const openEditModal = (item: any) => {
    setRecordToEdit({
      ...item,
      repairCost: item.repairCost || 0,
      resolution: item.resolution === '—' ? '' : item.resolution,
    });
    setIsEditOpen(true);
  };

  const handleUpdateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToEdit) return;

    setModalLoading(true);
    try {
      const res: any = await api.put(`/maintenance/${recordToEdit.id}`, {
        repairStatus: recordToEdit.repairStatus,
        technician: recordToEdit.technician,
        serviceProvider: recordToEdit.serviceProvider,
        repairCost: Number(recordToEdit.repairCost) || 0,
        resolution: recordToEdit.resolution,
        remarks: recordToEdit.remarks,
      });
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Maintenance record updated successfully.', 'success');
        setIsEditOpen(false);
        fetchRecords();
      } else {
        showToast(res?.message || 'Failed to update ticket.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error updating maintenance.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDeleteMaintenance = async () => {
    if (!recordToDelete) return;
    setDeleteLoading(true);
    try {
      const res: any = await api.delete(`/maintenance/${recordToDelete.id}`);
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Maintenance record deleted successfully.', 'success');
        setRecordToDelete(null);
        fetchRecords();
      } else {
        showToast(res?.message || 'Failed to delete maintenance ticket.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error deleting maintenance.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterStatus !== 'ALL' && r.repairStatus !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.assetCode.toLowerCase().includes(q) ||
          r.assetName.toLowerCase().includes(q) ||
          r.issueTitle.toLowerCase().includes(q) ||
          r.issueDescription.toLowerCase().includes(q) ||
          r.technician.toLowerCase().includes(q) ||
          r.serviceProvider.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, search, filterStatus]);

  const inProgressCount = records.filter((r) => r.repairStatus === 'IN_PROGRESS' || r.repairStatus === 'WAITING_FOR_PARTS').length;
  const reportedCount = records.filter((r) => r.repairStatus === 'REPORTED' || r.repairStatus === 'APPROVED').length;
  const completedCount = records.filter((r) => r.repairStatus === 'COMPLETED').length;
  const totalCost = records.reduce((sum, r) => sum + (Number(r.repairCost) || 0), 0);

  return (
    <div className="space-y-6 font-sans pb-12">
      <PageHeader
        title="Asset Maintenance & Repair Operations"
        subtitle="Track technical servicing, spare parts replacement, hardware diagnostics, and warranty repairs."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportModuleToExcel(records, 'Maintenance');
                showToast('Excel export generated successfully.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel
            </Button>
            <Button variant="secondary" onClick={fetchRecords}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            {hasPermission('MAINTENANCE_CREATE') && (
              <Button variant="primary" onClick={openCreateModal} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-md">
                <Plus className="w-4 h-4 mr-1.5" />
                New Ticket
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-textSecondary uppercase font-semibold">Total Service Tickets</span>
              <div className="text-2xl font-bold font-mono text-textPrimary mt-0.5">{records.length}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center text-brandPrimary">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-semibold">Under Active Repair</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{inProgressCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Resolved / Completed</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{completedCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase font-semibold">Total Servicing Cost</span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-0.5">₹{totalCost.toLocaleString()}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden border-borderBase">
        {/* Controls Bar */}
        <div className="p-4 border-b border-borderBase bg-bgElevated/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-bgBase p-1 rounded-lg border border-borderBase text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterStatus === 'ALL' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              All ({records.length})
            </button>
            <button
              onClick={() => setFilterStatus('REPORTED')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterStatus === 'REPORTED' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Reported ({reportedCount})
            </button>
            <button
              onClick={() => setFilterStatus('IN_PROGRESS')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterStatus === 'IN_PROGRESS' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setFilterStatus('COMPLETED')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterStatus === 'COMPLETED' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          <div className="relative w-72">
            <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, issue, technician..."
              className="w-full text-xs bg-bgBase border border-borderBase rounded-lg pl-9 pr-3 py-1.5 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-brandPrimary font-mono"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-bgBase/80 border-b border-borderBase text-[10px] text-textSecondary font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Device Model</th>
                <th className="py-3 px-4">Issue & Description</th>
                <th className="py-3 px-4">Repair Status</th>
                <th className="py-3 px-4">Technician / Service Provider</th>
                <th className="py-3 px-4">Cost (₹)</th>
                <th className="py-3 px-4">Reported Date</th>
                <th className="py-3 px-4">Resolution</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase font-mono">
              {filteredRecords.map((item) => (
                <tr key={item.id} className="hover:bg-bgElevated/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-brandPrimary cursor-pointer hover:underline" onClick={() => navigate(`/assets/${item.assetId}`)}>
                    {item.assetCode}
                  </td>

                  <td className="py-3 px-4 font-sans font-medium text-textPrimary">
                    {item.assetName}
                    <span className="text-[10px] text-textSecondary block font-mono">{item.assetType}</span>
                  </td>

                  <td className="py-3 px-4 font-sans max-w-xs">
                    <div className="font-semibold text-textPrimary">{item.issueTitle}</div>
                    <div className="text-[11px] text-textMuted truncate">{item.issueDescription}</div>
                  </td>

                  <td className="py-3 px-4">
                    <StatusBadge status={item.repairStatus} type="maintenance" />
                  </td>

                  <td className="py-3 px-4 font-sans text-textSecondary">
                    <div>{item.serviceProvider}</div>
                    <div className="text-[10px] text-textMuted font-mono">Tech: {item.technician}</div>
                  </td>

                  <td className="py-3 px-4 font-semibold text-emerald-400">
                    ₹{item.repairCost || 0}
                  </td>

                  <td className="py-3 px-4 text-textSecondary">
                    {new Date(item.reportedAt).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4 font-sans text-textSecondary max-w-xs truncate">
                    {item.resolution}
                  </td>

                  <td className="py-3 px-4 text-right font-sans">
                    <div className="flex items-center justify-end gap-1">
                      {hasPermission('MAINTENANCE_UPDATE') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          title="Update Ticket"
                          icon={<Edit className="w-4 h-4" />}
                        />
                      )}
                      {hasPermission('MAINTENANCE_DELETE') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRecordToDelete(item)}
                          title="Delete Ticket"
                          className="text-rose-400 hover:text-rose-300"
                          icon={<Trash2 className="w-4 h-4" />}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-textSecondary">
                    <div className="w-12 h-12 rounded-full bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center text-brandPrimary mx-auto mb-3">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-textPrimary">No Maintenance Records Yet</p>
                    <p className="text-xs text-textMuted mt-1 max-w-sm mx-auto">
                      Log a maintenance ticket to begin tracking repair tickets, warranty claims, and servicing costs.
                    </p>
                    {hasPermission('MAINTENANCE_CREATE') && (
                      <div className="mt-4">
                        <Button variant="primary" onClick={openCreateModal} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white">
                          <Plus className="w-4 h-4 mr-1.5" />
                          New Maintenance Ticket
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Maintenance Ticket Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Open Maintenance Ticket"
        subtitle="Log an asset issue, technician assignment, and transition device to UNDER_REPAIR."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateMaintenance} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-textSecondary font-medium mb-1">
              Select Asset for Servicing <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.assetId}
              onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono text-xs focus:outline-none focus:border-brandPrimary"
            >
              <option value="">-- Choose Asset --</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.companyAssetId || a.assetCode} — {a.assetName || a.model} ({a.status})
                </option>
              ))}
            </select>
            {formErrors.assetId && <p className="text-rose-400 text-[11px] mt-1">{formErrors.assetId}</p>}
          </div>

          <div>
            <label className="block text-textSecondary font-medium mb-1">
              Issue Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.issueTitle}
              onChange={(e) => setFormData({ ...formData, issueTitle: e.target.value })}
              placeholder="e.g. Battery replacement required, OS crashing, Screen flickering"
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
            />
            {formErrors.issueTitle && <p className="text-rose-400 text-[11px] mt-1">{formErrors.issueTitle}</p>}
          </div>

          <div>
            <label className="block text-textSecondary font-medium mb-1">
              Detailed Diagnostics / Symptom Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={formData.issueDescription}
              onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
              placeholder="Detailed description of hardware or software failure observed by user..."
              rows={3}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
            />
            {formErrors.issueDescription && <p className="text-rose-400 text-[11px] mt-1">{formErrors.issueDescription}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Assigned Technician</label>
              <input
                type="text"
                value={formData.technician}
                onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Service Provider / Vendor</label>
              <input
                type="text"
                value={formData.serviceProvider}
                onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                placeholder="e.g. Dell Authorized Service"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Estimated Cost (₹)</label>
              <input
                type="number"
                value={formData.repairCost}
                onChange={(e) => setFormData({ ...formData, repairCost: Number(e.target.value) })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-textSecondary font-medium mb-1">Administrative Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. Dispatched to vendor for onsite keyboard replacement."
              rows={2}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={modalLoading} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Open Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Maintenance Modal */}
      {recordToEdit && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Update Ticket: ${recordToEdit.assetCode}`}
          subtitle="Update servicing status, resolution summary, and restore asset upon completion."
          maxWidth="md"
        >
          <form onSubmit={handleUpdateMaintenance} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Repair Status</label>
              <select
                value={recordToEdit.repairStatus}
                onChange={(e) => setRecordToEdit({ ...recordToEdit, repairStatus: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary font-mono"
              >
                <option value="REPORTED">Reported</option>
                <option value="APPROVED">Approved</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_PARTS">Waiting for Parts</option>
                <option value="COMPLETED">Completed (Restores Asset to Available)</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textSecondary font-medium mb-1">Technician</label>
                <input
                  type="text"
                  value={recordToEdit.technician || ''}
                  onChange={(e) => setRecordToEdit({ ...recordToEdit, technician: e.target.value })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
                />
              </div>

              <div>
                <label className="block text-textSecondary font-medium mb-1">Total Cost (₹)</label>
                <input
                  type="number"
                  value={recordToEdit.repairCost}
                  onChange={(e) => setRecordToEdit({ ...recordToEdit, repairCost: Number(e.target.value) })}
                  className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Resolution Summary</label>
              <textarea
                value={recordToEdit.resolution || ''}
                onChange={(e) => setRecordToEdit({ ...recordToEdit, resolution: e.target.value })}
                placeholder="Describe component replacements, diagnostic test results, or warranty service..."
                rows={3}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={modalLoading}>
                Save Updates
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(recordToDelete)}
        onClose={() => setRecordToDelete(null)}
        title="Confirm Ticket Deletion"
        subtitle="Remove a maintenance ticket from the servicing database."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <p className="font-semibold text-sm text-white mb-1">
              Delete maintenance ticket for {recordToDelete?.assetCode}?
            </p>
            <p className="text-rose-200/90 text-xs leading-relaxed">
              This will remove this maintenance ticket from the records. If this was the only open ticket for this asset, its status will be safely restored to Available.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
            <Button variant="secondary" onClick={() => setRecordToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteLoading}
              onClick={confirmDeleteMaintenance}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
